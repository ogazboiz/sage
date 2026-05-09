import { useCallback, useEffect, useRef, useState } from "react";
import {
  useConnection,
  useWallet,
} from "@solana/wallet-adapter-react";
import {
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
} from "@solana/web3.js";
import {
  createAssociatedTokenAccountIdempotentInstruction,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";
import { useQueryClient } from "@tanstack/react-query";

import { useSageProgram } from "./useSageProgram";
import { loadOrCreateAgentKeypair } from "@/lib/agent-identity";
import {
  buildApproveTaskIx,
  buildCompleteTaskIx,
  buildReleaseStepIx,
  SAGE_USDC_MINT,
  toBaseUnits,
} from "@/lib/sage-sdk";
import { fetchChallenge, settleAndFetch } from "@/lib/x402";

const MEMO_PROGRAM = new PublicKey(
  "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr",
);

const BRIEFING_BASE =
  import.meta.env.VITE_BRIEFING_URL?.replace(/\/brief$/, "") ??
  "http://localhost:3001";

// Minimum SOL the agent keypair needs to pay tx fees for the loop.
// 0.005 SOL = 5,000,000 lamports = ~1000 transactions worth of fees.
const AGENT_FEE_RESERVE_LAMPORTS = 0.005 * LAMPORTS_PER_SOL;

export type TaskStatus =
  | "idle"
  | "approving"
  | "running"
  | "stopping"
  | "stopped"
  | "error";

export interface ServiceCall {
  endpoint: string;
  price: number;
}

export interface TaskIteration {
  index: number;
  endpoint: string;
  amount: number;
  signature: string;
  result: string;
  ts: number;
}

export interface AutonomousTaskParams {
  goal: string;
  budget: number; // total USDC cap
  intervalSeconds: number; // gap between iterations
  durationMinutes: number; // hard timeout
  // Function the agent calls each tick to choose the next service. Returns
  // null to skip this tick (no spend) or undefined to stop the loop.
  decide: (
    ctx: DecisionContext,
  ) => Promise<DecisionResult | null | undefined> | DecisionResult | null | undefined;
}

export interface DecisionContext {
  iteration: number; // zero-based count of completed iterations
  budgetRemaining: number;
  history: TaskIteration[];
  goal: string;
}

export interface DecisionResult {
  endpoint: "/brief" | "/yield-snapshot" | "/alert-check" | "/synthesize";
  body?: Record<string, unknown>;
}

interface TaskRefState {
  active: boolean;
  taskId: Uint8Array;
  budgetRemainingBaseUnits: bigint;
  startedAt: number;
  durationMs: number;
  intervalMs: number;
  iterations: TaskIteration[];
  decide: AutonomousTaskParams["decide"];
  goal: string;
}

function taskIdFromString(s: string): Uint8Array {
  const buf = new Uint8Array(32);
  const bytes = new TextEncoder().encode(s);
  buf.set(bytes.subarray(0, Math.min(bytes.length, 32)));
  return buf;
}

function memoIx(memo: string): TransactionInstruction {
  return new TransactionInstruction({
    keys: [],
    programId: MEMO_PROGRAM,
    data: Buffer.from(memo, "utf8"),
  });
}

export function useAutonomousTask() {
  const program = useSageProgram();
  const { connection } = useConnection();
  const { publicKey, sendTransaction } = useWallet();
  const queryClient = useQueryClient();

  const [status, setStatus] = useState<TaskStatus>("idle");
  const [iterations, setIterations] = useState<TaskIteration[]>([]);
  const [budgetRemaining, setBudgetRemaining] = useState<number>(0);
  const [budgetTotal, setBudgetTotal] = useState<number>(0);
  const [endsAt, setEndsAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const taskRef = useRef<TaskRefState | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const finalize = useCallback(async () => {
    const task = taskRef.current;
    if (!task || !task.active) return;
    task.active = false;
    stopTimer();
    setStatus("stopping");

    try {
      const agent = loadOrCreateAgentKeypair();
      if (program && publicKey) {
        const completeIx = await buildCompleteTaskIx({
          program,
          owner: publicKey,
          signer: agent.publicKey,
          taskId: task.taskId,
        });
        const tx = new Transaction().add(completeIx);
        tx.feePayer = agent.publicKey;
        const blockhash = await connection.getLatestBlockhash();
        tx.recentBlockhash = blockhash.blockhash;
        tx.sign(agent);
        const sig = await connection.sendRawTransaction(tx.serialize());
        await connection.confirmTransaction({ signature: sig, ...blockhash }, "confirmed");
      }
    } catch (err) {
      console.warn("[autonomous] complete_task failed:", (err as Error).message);
    }
    queryClient.invalidateQueries({ queryKey: ["sage-vault"] });
    queryClient.invalidateQueries({ queryKey: ["vault-balance"] });
    setStatus("stopped");
    taskRef.current = null;
  }, [program, publicKey, connection, queryClient, stopTimer]);

  const tick = useCallback(async () => {
    const task = taskRef.current;
    if (!task || !task.active) return;
    if (!program || !publicKey) {
      setError("Wallet disconnected mid-task");
      await finalize();
      return;
    }

    // Time check
    if (Date.now() - task.startedAt > task.durationMs) {
      await finalize();
      return;
    }

    // Decide which endpoint to call
    let decision: DecisionResult | null | undefined;
    try {
      decision = await task.decide({
        iteration: task.iterations.length,
        budgetRemaining: Number(task.budgetRemainingBaseUnits) / 1_000_000,
        history: task.iterations,
        goal: task.goal,
      });
    } catch (err) {
      console.warn("[autonomous] decide threw:", err);
      decision = null;
    }

    if (decision === undefined) {
      await finalize();
      return;
    }

    if (decision === null) {
      // skip this tick, schedule next
      timerRef.current = setTimeout(tick, task.intervalMs);
      return;
    }

    const agent = loadOrCreateAgentKeypair();
    const serviceUrl = `${BRIEFING_BASE}${decision.endpoint}`;
    const decisionBody = decision.body;

    try {
      // Step 1: fetch x402 challenge from the chosen endpoint
      const challenge = await fetchChallenge(serviceUrl, decisionBody);
      const amountUsdc = parseFloat(challenge.amount);
      const amountBaseUnits = toBaseUnits(amountUsdc);

      if (amountBaseUnits > task.budgetRemainingBaseUnits) {
        // Cap exhausted, finalize and stop
        await finalize();
        return;
      }

      const recipient = new PublicKey(challenge.recipient);
      const recipientAta = getAssociatedTokenAddressSync(SAGE_USDC_MINT, recipient);

      // Step 2: build release_step + memo, signed by agent_keypair
      const releaseIx = await buildReleaseStepIx({
        program,
        owner: publicKey,
        usdcMint: SAGE_USDC_MINT,
        signer: agent.publicKey,
        recipientUsdc: recipientAta,
        taskId: task.taskId,
        amount: amountBaseUnits,
      });
      const memo = memoIx(challenge.nonce);

      const tx = new Transaction();
      tx.add(
        createAssociatedTokenAccountIdempotentInstruction(
          agent.publicKey,
          recipientAta,
          recipient,
          SAGE_USDC_MINT,
        ),
      );
      tx.add(releaseIx);
      tx.add(memo);
      tx.feePayer = agent.publicKey;
      const blockhash = await connection.getLatestBlockhash();
      tx.recentBlockhash = blockhash.blockhash;
      tx.sign(agent);
      const sig = await connection.sendRawTransaction(tx.serialize());
      await connection.confirmTransaction({ signature: sig, ...blockhash }, "confirmed");

      // Step 3: settle with the endpoint
      const result = await settleAndFetch<Record<string, unknown>>(
        serviceUrl,
        sig,
        challenge.nonce,
        decisionBody,
      );

      // Distil result into a one-line snippet
      const snippet =
        typeof result.briefing === "string"
          ? result.briefing
          : typeof (result as Record<string, unknown>).oneLine === "string"
            ? String((result as Record<string, unknown>).oneLine)
            : typeof (result as Record<string, unknown>).synthesis === "string"
              ? String((result as Record<string, unknown>).synthesis)
              : typeof (result as Record<string, unknown>).reason === "string"
                ? `${(result as Record<string, unknown>).reason}`
                : JSON.stringify(result).slice(0, 240);

      const iteration: TaskIteration = {
        index: task.iterations.length,
        endpoint: decision.endpoint,
        amount: amountUsdc,
        signature: sig,
        result: snippet,
        ts: Date.now(),
      };
      task.iterations.push(iteration);
      task.budgetRemainingBaseUnits -= amountBaseUnits;
      setIterations([...task.iterations]);
      setBudgetRemaining(Number(task.budgetRemainingBaseUnits) / 1_000_000);
      queryClient.invalidateQueries({ queryKey: ["vault-balance"] });

      if (task.budgetRemainingBaseUnits <= 0n) {
        await finalize();
        return;
      }
    } catch (err) {
      // Hard error — log, finalize the task to refund leftover budget.
      console.error("[autonomous] tick failed:", err);
      setError((err as Error).message);
      await finalize();
      return;
    }

    if (task.active) {
      timerRef.current = setTimeout(tick, task.intervalMs);
    }
  }, [program, publicKey, connection, queryClient, finalize]);

  const start = useCallback(
    async (params: AutonomousTaskParams) => {
      if (!program || !publicKey) {
        throw new Error("Connect a wallet first");
      }
      if (taskRef.current?.active) {
        throw new Error("Another task is already running");
      }

      setError(null);
      setStatus("approving");
      const agent = loadOrCreateAgentKeypair();

      // Ensure agent keypair has enough SOL for fees. If not, pay from owner.
      const agentLamports = await connection.getBalance(agent.publicKey);
      if (agentLamports < AGENT_FEE_RESERVE_LAMPORTS) {
        const topupAmount = AGENT_FEE_RESERVE_LAMPORTS - agentLamports;
        const topupTx = new Transaction().add(
          SystemProgram.transfer({
            fromPubkey: publicKey,
            toPubkey: agent.publicKey,
            lamports: topupAmount,
          }),
        );
        const topupSig = await sendTransaction(topupTx, connection);
        const blockhash = await connection.getLatestBlockhash();
        await connection.confirmTransaction(
          { signature: topupSig, ...blockhash },
          "confirmed",
        );
      }

      // Open the task on-chain (signed by owner).
      const taskId = taskIdFromString(`auto-${Date.now().toString(36)}`);
      const budgetBaseUnits = toBaseUnits(params.budget);
      const expiresAt = BigInt(
        Math.floor(Date.now() / 1000) +
          Math.max(60, Math.ceil(params.durationMinutes * 60) + 30),
      );

      const approveIx = await buildApproveTaskIx({
        program,
        owner: publicKey,
        usdcMint: SAGE_USDC_MINT,
        taskId,
        budget: budgetBaseUnits,
        expiresAt,
      });
      const approveTx = new Transaction().add(approveIx);
      const approveSig = await sendTransaction(approveTx, connection);
      const blockhash = await connection.getLatestBlockhash();
      await connection.confirmTransaction(
        { signature: approveSig, ...blockhash },
        "confirmed",
      );

      // Set up state and kick off the loop.
      taskRef.current = {
        active: true,
        taskId,
        budgetRemainingBaseUnits: budgetBaseUnits,
        startedAt: Date.now(),
        durationMs: params.durationMinutes * 60_000,
        intervalMs: Math.max(1_000, params.intervalSeconds * 1_000),
        iterations: [],
        decide: params.decide,
        goal: params.goal,
      };
      setIterations([]);
      setBudgetTotal(params.budget);
      setBudgetRemaining(params.budget);
      setEndsAt(Date.now() + params.durationMinutes * 60_000);
      setStatus("running");

      timerRef.current = setTimeout(tick, 500);
    },
    [program, publicKey, sendTransaction, connection, tick],
  );

  const stop = useCallback(async () => {
    await finalize();
  }, [finalize]);

  // Cleanup on unmount: stop the timer (but don't auto-finalize because the
  // user might just be navigating tabs; the task is still on-chain).
  useEffect(() => {
    return () => {
      stopTimer();
    };
  }, [stopTimer]);

  return {
    status,
    iterations,
    budgetTotal,
    budgetRemaining,
    endsAt,
    error,
    start,
    stop,
  };
}
