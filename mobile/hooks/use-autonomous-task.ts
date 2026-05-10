import { useCallback, useEffect, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useMobileWallet } from '@wallet-ui/react-native-kit'
import { getAddMemoInstruction } from '@solana-program/memo'
import {
  appendTransactionMessageInstructions,
  createTransactionMessage,
  getBase64EncodedWireTransaction,
  pipe,
  setTransactionMessageFeePayerSigner,
  setTransactionMessageLifetimeUsingBlockhash,
  signTransactionMessageWithSigners,
  type Address,
  type KeyPairSigner,
} from '@solana/kit'

import {
  buildApproveTaskIx,
  buildCompleteTaskIx,
  buildCreateRecipientUsdcIx,
  buildReleaseStepIx,
  buildSystemTransferIx,
  toBaseUnits,
} from '@/lib/sage'
import { USDC_MINT } from '@/lib/sage/constants'
import { getAta } from '@/lib/sage/pdas'
import { loadOrCreateAgentSigner } from '@/lib/agent-identity'
import { fetchChallenge, settleAndFetch } from '@/lib/x402'
import type {
  DecidePolicy,
  Endpoint,
  TaskIteration,
} from '@/lib/autonomous-decide'

const BRIEFING_BASE =
  process.env.EXPO_PUBLIC_BRIEFING_URL?.replace(/\/brief$/, '') ??
  'http://10.0.2.2:3001'

// Minimum SOL the agent keypair needs to pay tx fees for the loop.
// 5_000_000 lamports = 0.005 SOL, ~1000 transactions worth.
const AGENT_FEE_RESERVE_LAMPORTS = 5_000_000n

export type TaskStatus =
  | 'idle'
  | 'approving'
  | 'running'
  | 'stopping'
  | 'stopped'
  | 'error'

export interface TaskWrapUp {
  summary: string
  totalSpent: number
  iterationCount: number
  completeSig: string | null
  durationMs: number
}

export interface AutonomousTaskParams {
  goal: string
  budget: number
  intervalSeconds: number
  durationMinutes: number
  decide: DecidePolicy
}

interface TaskRefState {
  active: boolean
  taskId: Uint8Array
  agent: KeyPairSigner
  budgetRemainingBaseUnits: bigint
  startedAt: number
  durationMs: number
  intervalMs: number
  iterations: TaskIteration[]
  decide: DecidePolicy
  goal: string
}

function taskIdFromString(s: string): Uint8Array {
  const buf = new Uint8Array(32)
  const bytes = new TextEncoder().encode(s)
  buf.set(bytes.subarray(0, Math.min(bytes.length, 32)))
  return buf
}

export function useAutonomousTask() {
  const { account, client, sendTransaction, chain } = useMobileWallet()
  const queryClient = useQueryClient()

  const [status, setStatus] = useState<TaskStatus>('idle')
  const [iterations, setIterations] = useState<TaskIteration[]>([])
  const [budgetRemaining, setBudgetRemaining] = useState<number>(0)
  const [budgetTotal, setBudgetTotal] = useState<number>(0)
  const [endsAt, setEndsAt] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [wrapUp, setWrapUp] = useState<TaskWrapUp | null>(null)

  const taskRef = useRef<TaskRefState | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [])

  // Sign + send a transaction using only KeyPairSigner(s) — no MWA prompt.
  const sendAgentTx = useCallback(
    async (instructions: Parameters<typeof appendTransactionMessageInstructions>[0], feePayer: KeyPairSigner) => {
      const { value: latest } = await client.rpc.getLatestBlockhash().send()
      const message = pipe(
        createTransactionMessage({ version: 0 }),
        m => setTransactionMessageFeePayerSigner(feePayer, m),
        m => setTransactionMessageLifetimeUsingBlockhash(latest, m),
        m => appendTransactionMessageInstructions(instructions, m),
      )
      const signed = await signTransactionMessageWithSigners(message)
      const wire = getBase64EncodedWireTransaction(signed)
      const sig = await client.rpc
        .sendTransaction(wire, { encoding: 'base64', skipPreflight: false })
        .send()
      // Best-effort confirm — poll signature status briefly.
      await waitForConfirm(client.rpc, sig)
      return sig as string
    },
    [client],
  )

  const finalize = useCallback(async () => {
    const task = taskRef.current
    if (!task || !task.active || !account) return
    task.active = false
    stopTimer()
    setStatus('stopping')

    let completeSig: string | null = null
    try {
      // Agent-signed locally via @solana/kit — no MWA prompt, no app
      // switch. vault.agent_keypair was set to this agent's pubkey at
      // init_user_vault time, so the program accepts it.
      const completeIx = await buildCompleteTaskIx({
        owner: account.address as Address,
        signer: task.agent.address,
        taskId: task.taskId,
      })
      completeSig = await sendAgentTx([completeIx], task.agent)
    } catch (err) {
      console.warn('[autonomous] complete_task failed:', (err as Error).message)
    }

    queryClient.invalidateQueries({ queryKey: ['vault-account', chain, account.address] })
    queryClient.invalidateQueries({ queryKey: ['vault-usdc', chain, account.address] })

    const totalSpent = task.iterations.reduce((sum, it) => sum + it.amount, 0)
    const durationMs = Date.now() - task.startedAt
    let summary = `Agent paid for ${task.iterations.length} services totalling $${totalSpent.toFixed(2)} USDC.`
    try {
      const res = await fetch(`${BRIEFING_BASE}/wrap-up`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          goal: task.goal,
          iterations: task.iterations.map(it => ({
            endpoint: it.endpoint,
            amount: it.amount,
            result: it.result,
          })),
        }),
      })
      if (res.ok) {
        const body = (await res.json()) as { summary?: string }
        if (typeof body.summary === 'string') summary = body.summary
      }
    } catch (err) {
      console.warn('[autonomous] wrap-up fetch failed:', (err as Error).message)
    }

    setWrapUp({
      summary,
      totalSpent,
      iterationCount: task.iterations.length,
      completeSig,
      durationMs,
    })
    setStatus('stopped')
    taskRef.current = null
  }, [account, chain, queryClient, sendTransaction, stopTimer])

  const tick = useCallback(async () => {
    const task = taskRef.current
    if (!task || !task.active) return
    if (!account) {
      setError('Wallet disconnected mid-task')
      await finalize()
      return
    }

    if (Date.now() - task.startedAt > task.durationMs) {
      await finalize()
      return
    }

    let decision = null
    try {
      decision = await task.decide({
        iteration: task.iterations.length,
        budgetRemaining: Number(task.budgetRemainingBaseUnits) / 1_000_000,
        history: task.iterations,
        goal: task.goal,
      })
    } catch (err) {
      console.warn('[autonomous] decide threw:', err)
      decision = null
    }

    if (decision === undefined) {
      await finalize()
      return
    }
    if (decision === null) {
      timerRef.current = setTimeout(tick, task.intervalMs)
      return
    }

    const serviceUrl = `${BRIEFING_BASE}${decision.endpoint}`
    try {
      const challenge = await fetchChallenge(serviceUrl, decision.body)
      const amountUsdc = parseFloat(challenge.amount)
      const amountBaseUnits = toBaseUnits(amountUsdc)

      if (amountBaseUnits > task.budgetRemainingBaseUnits) {
        await finalize()
        return
      }

      const recipient = challenge.recipient as Address
      // Agent pays for ATA creation + signs release_step. No MWA, no
      // app switch — the agent keypair lives in memory + AsyncStorage,
      // signs locally via @solana/kit, and submits over RPC directly.
      const createAtaIx = await buildCreateRecipientUsdcIx(task.agent.address, recipient)
      const releaseIx = await buildReleaseStepIx({
        owner: account.address as Address,
        signer: task.agent.address,
        recipientUsdc: await deriveRecipientUsdc(recipient),
        taskId: task.taskId,
        amountBaseUnits,
      })
      const memoIx = getAddMemoInstruction({ memo: challenge.nonce })

      const sig = await sendAgentTx([createAtaIx, releaseIx, memoIx], task.agent)

      const result = await settleAndFetch<Record<string, unknown>>(
        serviceUrl,
        sig,
        challenge.nonce,
        decision.body,
      )

      const snippet =
        typeof result.briefing === 'string'
          ? result.briefing
          : typeof (result as Record<string, unknown>).oneLine === 'string'
            ? String((result as Record<string, unknown>).oneLine)
            : typeof (result as Record<string, unknown>).synthesis === 'string'
              ? String((result as Record<string, unknown>).synthesis)
              : typeof (result as Record<string, unknown>).reason === 'string'
                ? `${(result as Record<string, unknown>).reason}`
                : JSON.stringify(result).slice(0, 240)

      const iteration: TaskIteration = {
        index: task.iterations.length,
        endpoint: decision.endpoint as Endpoint,
        amount: amountUsdc,
        signature: sig,
        result: snippet,
        ts: Date.now(),
      }
      task.iterations.push(iteration)
      task.budgetRemainingBaseUnits -= amountBaseUnits
      setIterations([...task.iterations])
      setBudgetRemaining(Number(task.budgetRemainingBaseUnits) / 1_000_000)
      queryClient.invalidateQueries({ queryKey: ['vault-usdc', chain, account.address] })

      if (task.budgetRemainingBaseUnits <= 0n) {
        await finalize()
        return
      }
    } catch (err) {
      const solErr = err as Error & {
        context?: Record<string, unknown>
        cause?: { context?: Record<string, unknown> }
      }
      const ctx = solErr.context ?? solErr.cause?.context
      const logs =
        (ctx && typeof ctx === 'object' && 'logs' in ctx ? (ctx.logs as string[]) : null) ??
        (ctx && typeof ctx === 'object' && '__code' in ctx ? [`code ${String(ctx.__code)}`] : null)
      const detail = logs?.length
        ? `${solErr.message}\n${logs.slice(-6).join('\n')}`
        : solErr.message
      console.error('[autonomous] tick failed:', detail)
      console.error('[autonomous] err.name:', solErr.name)
      if (solErr.stack) console.error('[autonomous] stack:', solErr.stack)

      // Hard failures (program error or wallet auth rejection) end the
      // task. Soft failures (network blip, brief 5xx) just skip this
      // tick and try again next interval.
      const isHardFailure =
        solErr.name === 'SolanaMobileWalletAdapterProtocolError' ||
        (typeof detail === 'string' &&
          (detail.includes('Anchor') ||
            detail.includes('Unauthorized') ||
            detail.includes('InsufficientFunds') ||
            detail.includes('TaskActive')))

      if (isHardFailure) {
        setError(detail)
        await finalize()
        return
      }

      // Soft failure — keep the loop alive, retry next tick
      console.warn('[autonomous] soft failure, retrying next interval')
    }

    if (task.active) {
      timerRef.current = setTimeout(tick, task.intervalMs)
    }
  }, [account, chain, finalize, queryClient, sendTransaction])

  const start = useCallback(
    async (params: AutonomousTaskParams) => {
      if (!account) throw new Error('Connect a wallet first')
      if (taskRef.current?.active) throw new Error('Another task is already running')

      setError(null)
      setWrapUp(null)
      setStatus('approving')

      // Load (or create) the persistent agent keypair. Same agent that
      // was passed to init_user_vault and stored in vault.agent_keypair.
      const agent = await loadOrCreateAgentSigner()

      const taskId = taskIdFromString(`auto-${Date.now().toString(36)}`)
      const budgetBaseUnits = toBaseUnits(params.budget)
      const expiresAt = BigInt(
        Math.floor(Date.now() / 1000) +
          Math.max(60, Math.ceil(params.durationMinutes * 60) + 30),
      )

      // Check agent SOL balance — only top up if it's below the reserve.
      // Bundles a SystemProgram.transfer with approve_task into one MWA
      // prompt so the user sees exactly one wallet popup for the whole
      // session.
      let agentSol = 0n
      try {
        const bal = await client.rpc.getBalance(agent.address).send()
        agentSol = BigInt(bal.value)
      } catch (err) {
        console.warn('[autonomous] agent balance check failed:', (err as Error).message)
      }
      const needsTopup = agentSol < AGENT_FEE_RESERVE_LAMPORTS
      const topupAmount = needsTopup ? AGENT_FEE_RESERVE_LAMPORTS - agentSol : 0n

      const approveIx = await buildApproveTaskIx({
        owner: account.address as Address,
        taskId,
        budgetUsdc: params.budget,
        expiresAtSeconds: expiresAt,
      })

      const ixs = needsTopup
        ? [
            buildSystemTransferIx(account.address as Address, agent.address, topupAmount),
            approveIx,
          ]
        : [approveIx]

      // ONE MWA prompt for the whole session: drip SOL to agent (if
      // needed) + open the on-chain budget cap. After this, every tick
      // signs locally with the agent keypair — no more wallet popups.
      const approveSigResult = await sendTransaction(ixs)
      const approveSig = String(approveSigResult ?? '')
      if (approveSig) {
        await waitForConfirm(client.rpc, approveSig).catch(err => {
          console.warn('[autonomous] approve_task confirm timeout:', (err as Error).message)
        })
      }

      // Best-effort sanity check — emulator RPC is unreliable after
      // Phantom app-switches, so we don't block on it. Just give the
      // network 5s and trust the sig MWA returned. If approve didn't
      // actually land, the first tick will surface NoActiveTask and
      // we'll finalize cleanly.
      await new Promise(r => setTimeout(r, 5_000))

      const startedAt = Date.now()
      taskRef.current = {
        active: true,
        taskId,
        agent,
        budgetRemainingBaseUnits: budgetBaseUnits,
        startedAt,
        durationMs: params.durationMinutes * 60_000,
        intervalMs: Math.max(1_000, params.intervalSeconds * 1_000),
        iterations: [],
        decide: params.decide,
        goal: params.goal,
      }
      setIterations([])
      setBudgetTotal(params.budget)
      setBudgetRemaining(params.budget)
      setEndsAt(startedAt + params.durationMinutes * 60_000)
      setStatus('running')

      timerRef.current = setTimeout(tick, 500)
    },
    [account, client, sendTransaction, tick],
  )

  const stop = useCallback(async () => {
    await finalize()
  }, [finalize])

  useEffect(() => {
    return () => {
      stopTimer()
    }
  }, [stopTimer])

  return {
    status,
    iterations,
    budgetTotal,
    budgetRemaining,
    endsAt,
    error,
    wrapUp,
    start,
    stop,
  }
}

// Quick hard-coded poll for finality. @solana/kit has subscriptions but
// using HTTP polling here keeps the hook self-contained and avoids
// websocket setup on RN.
async function waitForConfirm(rpc: ReturnType<typeof useMobileWallet>['client']['rpc'], sig: string, timeoutMs = 30_000) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    const res = await rpc.getSignatureStatuses([sig as never]).send()
    const status = res.value[0]
    if (status && (status.confirmationStatus === 'confirmed' || status.confirmationStatus === 'finalized')) {
      if (status.err) throw new Error(`tx failed: ${JSON.stringify(status.err)}`)
      return
    }
    await new Promise(r => setTimeout(r, 1000))
  }
  throw new Error(`tx not confirmed after ${timeoutMs}ms: ${sig}`)
}

async function deriveRecipientUsdc(recipient: Address): Promise<Address> {
  return getAta(USDC_MINT, recipient)
}
