import React, { useEffect, useMemo, useRef, useState } from 'react'
import {
  Alert,
  Animated,
  Easing,
  PermissionsAndroid,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { useConversation, type ClientTools } from '@elevenlabs/react-native'
import { useMobileWallet } from '@wallet-ui/react-native-kit'
import { colors, appStyles } from '@/constants/app-styles'
import { useDeposit } from '@/hooks/use-deposit'
import { useOwnerUsdcBalance, useVaultUsdcBalance } from '@/hooks/use-usdc-balance'
import { useVaultAccount } from '@/hooks/use-vault-account'

const AGENT_ID = process.env.EXPO_PUBLIC_ELEVENLABS_AGENT_ID
const LIVE_BG = '#03060F'

const TOOL_NAMES = [
  'get_vault_status',
  'find_yield',
  'find_idle_assets',
  'propose_bridge',
  'propose_deposit',
  'propose_yield_deposit',
  'pay_briefing',
  'start_autonomous_task',
] as const

type Pending =
  | { kind: 'deposit'; amount: number }
  | { kind: 'briefing' }
  | {
      kind: 'yield'
      slug: string
      protocol: string
      network: string
      apy: number
      amount: number
    }

// Glowing ring orb — simplified RN version of the web SVG hero
function Orb({
  active,
  speaking,
  size = 160,
}: {
  active: boolean
  speaking: boolean
  size?: number
}) {
  const pulse = useRef(new Animated.Value(1)).current

  useEffect(() => {
    if (active) {
      const duration = speaking ? 380 : 900
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulse, { toValue: 1.08, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(pulse, { toValue: 1, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        ]),
      ).start()
    } else {
      pulse.stopAnimation()
      pulse.setValue(1)
    }
  }, [active, speaking, pulse])

  const s = size

  return (
    <View pointerEvents="none" style={{ width: s * 2.6, height: s * 2.6, alignItems: 'center', justifyContent: 'center' }}>
      <View style={[styles.halo, { width: s * 2.6, height: s * 2.6, borderRadius: s * 1.3, backgroundColor: 'rgba(15,118,110,0.04)' }]} />
      <View style={[styles.halo, { width: s * 1.8, height: s * 1.8, borderRadius: s * 0.9, backgroundColor: 'rgba(15,118,110,0.06)' }]} />
      <View style={[styles.halo, { width: s * 1.3, height: s * 1.3, borderRadius: s * 0.65, backgroundColor: 'rgba(15,118,110,0.08)' }]} />

      <Animated.View style={{ width: s, height: s, transform: [{ scale: pulse }] }}>
        <View style={{
          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
          borderRadius: s, borderWidth: 1, borderColor: 'rgba(15,118,110,0.18)',
        }} />
        <View style={{
          position: 'absolute',
          top: s * 0.10, left: s * 0.10, right: s * 0.10, bottom: s * 0.10,
          borderRadius: s, borderWidth: 1, borderColor: 'rgba(15,118,110,0.30)',
        }} />
        <View style={{
          position: 'absolute',
          top: s * 0.22, left: s * 0.22, right: s * 0.22, bottom: s * 0.22,
          borderRadius: s, borderWidth: 1.5,
          borderColor: colors.accent,
          backgroundColor: 'rgba(15,118,110,0.10)',
        }} />
        <View style={{
          position: 'absolute',
          top: s * 0.38, left: s * 0.38, right: s * 0.38, bottom: s * 0.38,
          borderRadius: s, backgroundColor: colors.accent,
        }} />
        <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]}>
          <Text style={{ fontFamily: 'monospace', fontSize: 9, letterSpacing: 3, textTransform: 'uppercase', color: colors.accent }}>
            {speaking ? 'speaking' : active ? 'listening' : 'sage'}
          </Text>
        </View>
      </Animated.View>
    </View>
  )
}

export default function TalkScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const { account } = useMobileWallet()
  const vault = useVaultAccount()
  const ownerUsdc = useOwnerUsdcBalance()
  const vaultUsdc = useVaultUsdcBalance()
  const deposit = useDeposit()

  const [transcript, setTranscript] = useState<string[]>([])
  const [pending, setPending] = useState<Pending | null>(null)
  const [lastDisconnect, setLastDisconnect] = useState<{ reason: string; message?: string } | null>(null)

  // Tools read deps via a ref so we don't capture stale closures across the
  // ElevenLabs websocket session.
  const depsRef = useRef({ account, vault, ownerUsdc, vaultUsdc, deposit, router })
  useEffect(() => {
    depsRef.current = { account, vault, ownerUsdc, vaultUsdc, deposit, router }
  }, [account, vault, ownerUsdc, vaultUsdc, deposit, router])

  const tools = useMemo<ClientTools>(() => ({
    get_vault_status: async () => {
      const { account, vault, vaultUsdc } = depsRef.current
      if (!account) return 'Wallet not connected.'
      const v = vault.data
      if (!v?.exists) return 'No vault yet. Tell the user to tap Initialise vault on the Vault tab.'
      return JSON.stringify({
        balanceUsdc: (vaultUsdc.data ?? 0).toFixed(2),
        totalDeposited: v.totalDeposited.toFixed(2),
        totalSpent: v.totalSpent.toFixed(2),
        activeTask: v.activeTask
          ? {
              budgetRemaining: v.activeTask.budgetRemaining.toFixed(2),
              steps: v.activeTask.stepsExecuted,
            }
          : null,
      })
    },

    find_idle_assets: async () => {
      const { ownerUsdc, vaultUsdc } = depsRef.current
      const owner = ownerUsdc.data ?? 0
      const v = vaultUsdc.data ?? 0
      const recommendation = owner > 0.01
        ? `Your wallet holds ${owner.toFixed(2)} USDC outside the Sage vault, sitting idle. The vault holds ${v.toFixed(2)}. Recommend depositing the idle USDC into the vault.`
        : `Your Sage vault holds ${v.toFixed(2)} USDC. Wallet has no idle USDC outside it.`
      return JSON.stringify({
        recommendation,
        ownerWalletUsdc: owner.toFixed(2),
        sageVaultUsdc: v.toFixed(2),
        guidance: 'Lead the spoken answer with the recommendation field verbatim.',
      })
    },

    find_yield: async () => {
      // On mobile we don't ship the LI.FI Earn ranker — point the user to the
      // Bridge tab where they can quote routes; richer yield discovery lives
      // on the web app for now.
      return 'Yield discovery is a web feature. On mobile, recommend opening the Bridge tab to quote a cross-chain route into the vault.'
    },

    propose_bridge: async (params: Record<string, unknown>) => {
      const { account, router } = depsRef.current
      if (!account) return 'Wallet not connected.'
      const sourceChain = String(params.sourceChain ?? 'base').toLowerCase()
      const amountUsdc = parseFloat(String(params.amountUsdc ?? ''))
      if (!Number.isFinite(amountUsdc) || amountUsdc <= 0) {
        return 'Specify a positive USDC amount to bridge.'
      }
      router.push('/(tabs)/bridge' as never)
      return JSON.stringify({
        message: `Opened the Bridge tab. The user can quote a LI.FI Composer route bringing ${amountUsdc.toFixed(2)} USDC from ${sourceChain} into their Sage vault on Solana.`,
        source: 'LI.FI Composer',
      })
    },

    propose_deposit: async ({ amount }: Record<string, unknown>) => {
      const { account } = depsRef.current
      if (!account) return 'Wallet not connected.'
      const num = Number(amount)
      if (!Number.isFinite(num) || num <= 0) return 'Invalid amount.'
      setPending({ kind: 'deposit', amount: num })
      return `Showed the user a confirm card for ${num.toFixed(2)} USDC. Tell them to tap Confirm on screen, then wait for an update with the transaction result.`
    },

    pay_briefing: async () => {
      const { account } = depsRef.current
      if (!account) return 'Wallet not connected.'
      // Briefing flow uses the autonomous loop primitive on mobile.
      return 'On mobile, the briefing primitive is wrapped by the autonomous task loop. Recommend calling start_autonomous_task with a 1 USDC budget for a 1-minute single-iteration brief.'
    },

    propose_yield_deposit: async () => {
      return 'Yield deploy is a web-only flow today; the mobile app focuses on the autonomous task loop and bridge.'
    },

    start_autonomous_task: async (params: Record<string, unknown>) => {
      const { account, router } = depsRef.current
      if (!account) return 'Wallet not connected.'
      const goal = String(params.goal ?? '').trim()
      const budget = Number(params.budget)
      const intervalSeconds = Number(params.intervalSeconds ?? 30)
      const durationMinutes = Number(params.durationMinutes ?? 3)
      if (!goal) return 'Need a goal sentence.'
      if (!Number.isFinite(budget) || budget <= 0) return 'Need a positive budget.'
      if (!Number.isFinite(intervalSeconds) || intervalSeconds < 5) return 'Interval must be at least 5 seconds.'
      if (!Number.isFinite(durationMinutes) || durationMinutes <= 0) return 'Duration must be positive.'

      router.push('/(tabs)/activity' as never)
      return `Switched to the Activity tab. The user should set goal "${goal}", $${budget.toFixed(2)} cap, every ${intervalSeconds}s for ${durationMinutes} min, then tap Start to approve the cap on-chain.`
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [])

  const conversation = useConversation({
    clientTools: tools,
    onConnect: () => {
      console.info('[voice] connected')
      setLastDisconnect(null)
    },
    onMessage: m => {
      const text = `${m.source}: ${m.message}`
      setTranscript(prev => [...prev.slice(-9), text])
    },
    onError: (message, context) => {
      // Events / DOMException-like objects have circular refs that crash
      // JSON.stringify; coerce safely.
      const safeMsg =
        typeof message === 'string'
          ? message
          : (message as { message?: string })?.message ?? 'voice error'
      console.error('[voice] error:', safeMsg, context)
      setTranscript(prev => [...prev.slice(-9), `error: ${safeMsg}`])
    },
    onDisconnect: details => {
      console.warn('[voice] disconnected:', details)
      const message = 'message' in details && details.message ? details.message : undefined
      setLastDisconnect({ reason: details.reason, message })
      setPending(null)
    },
    onUnhandledClientToolCall: call => {
      console.warn('[voice] unhandled tool call:', call)
    },
  })

  // Keepalive while a confirm card is open so ElevenLabs doesn't timeout
  // during the user's wallet interaction.
  useEffect(() => {
    if (!pending) return
    const id = setInterval(() => {
      try { conversation.sendUserActivity() } catch (err) { console.warn('[voice] sendUserActivity failed:', err) }
    }, 4_000)
    return () => clearInterval(id)
  }, [pending, conversation])

  const isActive = conversation.status === 'connected'
  const speaking = isActive && conversation.mode === 'speaking'

  const lastAgentLine = transcript.slice().reverse()
    .find(l => l.startsWith('ai:'))?.replace(/^ai:\s*/, '')

  const toolEvents = transcript.filter(l =>
    /(get_vault_status|find_yield|find_idle_assets|propose_bridge|propose_deposit|propose_yield_deposit|pay_briefing|start_autonomous_task)/.test(l),
  )

  async function ensureMicPermission(): Promise<boolean> {
    if (Platform.OS !== 'android') return true
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
      {
        title: 'Microphone permission',
        message: 'Sage needs the microphone to talk to the AI agent.',
        buttonPositive: 'OK',
        buttonNegative: 'Cancel',
      },
    )
    return granted === PermissionsAndroid.RESULTS.GRANTED
  }

  async function start() {
    if (!AGENT_ID) {
      Alert.alert(
        'Missing agent id',
        'Set EXPO_PUBLIC_ELEVENLABS_AGENT_ID in mobile/.env.local and rebuild.',
      )
      return
    }
    const ok = await ensureMicPermission()
    if (!ok) {
      Alert.alert('Microphone denied', 'Voice agent needs the microphone to work.')
      return
    }
    try {
      // websocket > webrtc on the Android emulator — emulator NAT can't
      // punch through to LiveKit/TURN, so webrtc fails with
      // "NegotiationError: negotiation timed out". websocket avoids ICE
      // entirely and matches what the Sage web app uses.
      await conversation.startSession({
        agentId: AGENT_ID,
        connectionType: 'websocket',
      } as never)
    } catch (err) {
      Alert.alert('Could not start session', (err as Error).message)
    }
  }

  async function confirmPending() {
    if (!pending) return
    const current = pending
    setPending(null)
    let update = ''
    if (current.kind === 'deposit') {
      try {
        const res = await depsRef.current.deposit.mutateAsync(current.amount)
        const sig = String(res ?? '')
        update = `Deposit confirmed. ${current.amount.toFixed(2)} USDC moved into the vault. tx ${sig.slice(0, 12)}…`
      } catch (err) {
        update = `Deposit failed: ${(err as Error).message}`
      }
    } else {
      update = 'Cancelled.'
    }
    try { conversation.sendContextualUpdate(update) } catch { /* session may have ended */ }
  }

  function cancelPending() {
    setPending(null)
    try { conversation.sendContextualUpdate('User cancelled the on-screen confirmation.') } catch { /* session ended */ }
  }

  // ── LIVE SESSION ─────────────────────────────────────────────────────────
  if (isActive) {
    return (
      <SafeAreaView style={[appStyles.screen, { backgroundColor: LIVE_BG }]} edges={['top']}>
        <View style={[styles.hero, { backgroundColor: LIVE_BG }]}>
          <View style={styles.heroStrip}>
            <View>
              <Text style={styles.heroMeta}>VAULT</Text>
              <Text style={styles.heroBalance}>${vaultUsdc.data?.toFixed(2) ?? '—'}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.heroMeta}>SESSION</Text>
              <View style={[appStyles.row, { gap: 6, marginTop: 4 }]}>
                <View style={styles.liveDot} />
                <Text style={styles.heroMode}>{conversation.mode}</Text>
              </View>
            </View>
          </View>

          <View style={styles.heroControls}>
            <Text style={styles.liveBadge}>SAGE · LIVE</Text>
            <View style={appStyles.row}>
              <TouchableOpacity activeOpacity={0.7} onPress={() => conversation.setMuted(!conversation.isMuted)} style={styles.ctrlBtn}>
                <Text style={styles.ctrlText}>{conversation.isMuted ? 'Unmute' : 'Mute'}</Text>
              </TouchableOpacity>
              <TouchableOpacity activeOpacity={0.7} onPress={() => conversation.endSession()} style={styles.ctrlBtn}>
                <Text style={[styles.ctrlText, { color: colors.danger }]}>End</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.orbCentre}>
            {pending ? (
              <View style={styles.confirmCard}>
                <Text style={styles.confirmLabel}>● CONFIRM ON-CHAIN</Text>
                {pending.kind === 'deposit' && (
                  <>
                    <Text style={styles.confirmKind}>Deposit</Text>
                    <Text style={styles.confirmAmount}>${pending.amount.toFixed(2)}</Text>
                    <Text style={styles.confirmSub}>USDC into your vault</Text>
                  </>
                )}
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 16 }}>
                  <TouchableOpacity
                    onPress={cancelPending}
                    disabled={deposit.isPending}
                    style={[styles.confirmBtnGhost, deposit.isPending && { opacity: 0.4 }]}
                  >
                    <Text style={styles.confirmBtnGhostText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={confirmPending}
                    disabled={deposit.isPending}
                    style={[styles.confirmBtnPrimary, deposit.isPending && { opacity: 0.5 }]}
                  >
                    <Text style={styles.confirmBtnPrimaryText}>
                      {deposit.isPending ? 'Signing…' : 'Confirm'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <Orb active size={160} speaking={speaking} />
            )}
          </View>

          <View style={styles.heroSub}>
            <Text style={styles.heroMeta}>● {speaking ? 'SPEAKING' : 'LISTENING'}</Text>
            <Text style={styles.heroSubText} numberOfLines={2}>
              {lastAgentLine ?? (speaking ? '…' : 'Listening for you.')}
            </Text>
          </View>
        </View>

        <View style={[styles.toolRail, { paddingBottom: insets.bottom + 8 }]}>
          <Text style={[appStyles.sectionLabel, { marginBottom: 8 }]}>Tool calls</Text>
          {TOOL_NAMES.map((t, i) => {
            const seen = toolEvents.some(e => e.includes(t))
            return (
              <View key={t} style={[styles.toolRow, i === TOOL_NAMES.length - 1 && { borderBottomWidth: 0 }]}>
                <Text style={[styles.toolName, seen && { color: colors.textPrimary }]}>{t}</Text>
                <Text style={{ fontFamily: 'monospace', fontSize: 10, color: seen ? colors.accent : colors.textMuted }}>
                  {seen ? '✓' : '○'}
                </Text>
              </View>
            )
          })}
        </View>
      </SafeAreaView>
    )
  }

  // ── IDLE ─────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={appStyles.screen} edges={['top']}>
      <View style={appStyles.header}>
        <Text style={appStyles.headerTitle}>SAGE</Text>
        <View style={[appStyles.pill, appStyles.pillAccent]}>
          <View style={styles.dotAccent} />
          <Text style={[appStyles.pillText, appStyles.pillAccentText]}>devnet</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.heading}>
          <Text style={styles.headNum}>01</Text>
          <Text style={styles.headTitle}>Talk</Text>
        </View>

        {!AGENT_ID && (
          <View style={[appStyles.card, { borderColor: colors.warning }]}>
            <Text style={[appStyles.sectionLabel, { color: colors.warning, marginBottom: 6 }]}>Voice not configured</Text>
            <Text style={{ fontSize: 13, color: colors.textSub, lineHeight: 20 }}>
              Set <Text style={appStyles.mono}>EXPO_PUBLIC_ELEVENLABS_AGENT_ID</Text> in <Text style={appStyles.mono}>mobile/.env.local</Text>, then rebuild.
            </Text>
          </View>
        )}

        {lastDisconnect && (
          <View style={appStyles.card}>
            <Text style={[appStyles.mono, { fontSize: 11, color: colors.textMuted }]}>
              Session ended · {lastDisconnect.reason}{lastDisconnect.message ? ` · ${lastDisconnect.message}` : ''}
            </Text>
          </View>
        )}

        <View style={appStyles.card}>
          <View style={styles.orbArea}>
            <Orb active={false} speaking={false} size={140} />
          </View>

          <TouchableOpacity
            activeOpacity={0.85}
            style={[appStyles.btnPrimary, !AGENT_ID && { opacity: 0.5 }]}
            onPress={start}
            disabled={!AGENT_ID || conversation.status === 'connecting'}
          >
            <Text style={appStyles.btnPrimaryText}>
              {conversation.status === 'connecting' ? 'Connecting…' : '● Start session'}
            </Text>
          </TouchableOpacity>

          <View style={{ alignItems: 'flex-end', marginTop: 12 }}>
            <View style={appStyles.pill}>
              <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: colors.textMuted }} />
              <Text style={appStyles.pillText}>{conversation.status}</Text>
            </View>
          </View>
        </View>

        <View style={appStyles.card}>
          <Text style={[appStyles.sectionLabel, { marginBottom: 12 }]}>Available tools</Text>
          {TOOL_NAMES.map((t, i) => (
            <View
              key={t}
              style={[styles.idleTool, i < TOOL_NAMES.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.rule }]}
            >
              <View style={styles.toolDot} />
              <Text style={styles.toolName}>{t}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  scroll: { padding: 16, paddingBottom: 32, gap: 14 },
  heading: { flexDirection: 'row', alignItems: 'baseline', gap: 10 },
  headNum: { fontFamily: 'monospace', fontSize: 11, letterSpacing: 3, color: colors.textMuted },
  headTitle: { fontSize: 24, fontWeight: '800', color: colors.textPrimary, letterSpacing: -0.4 },
  dotAccent: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.accent },

  orbArea: { alignItems: 'center', paddingVertical: 24 },

  idleTool: { flexDirection: 'row', alignItems: 'center', paddingVertical: 9, gap: 10 },
  toolDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: colors.border },

  hero: { flex: 1, paddingHorizontal: 20, paddingTop: 14, paddingBottom: 16 },
  heroStrip: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  heroMeta: {
    fontFamily: 'monospace', fontSize: 9, letterSpacing: 3,
    color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase',
  },
  heroBalance: {
    fontFamily: 'monospace', fontSize: 22, fontWeight: '700',
    color: '#fff', marginTop: 4, letterSpacing: -0.5,
  },
  liveDot: {
    width: 6, height: 6, borderRadius: 3, backgroundColor: colors.accent,
    shadowColor: colors.accent, shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1, shadowRadius: 5,
  },
  heroMode: { fontFamily: 'monospace', fontSize: 11, color: colors.accent },
  heroControls: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginTop: 16, paddingTop: 12,
    borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)',
  },
  liveBadge: {
    fontFamily: 'monospace', fontSize: 9, letterSpacing: 3,
    color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase',
  },
  ctrlBtn: { paddingHorizontal: 14, paddingVertical: 6 },
  ctrlText: { fontFamily: 'monospace', fontSize: 12, color: 'rgba(255,255,255,0.5)' },
  orbCentre: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  heroSub: {
    borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)',
    paddingTop: 16, gap: 8,
  },
  heroSubText: { fontSize: 19, fontWeight: '500', color: '#fff', lineHeight: 28, minHeight: 56 },

  confirmCard: {
    width: '90%', borderWidth: 1, borderColor: 'rgba(255,255,255,0.20)',
    backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: 18,
  },
  confirmLabel: { fontFamily: 'monospace', fontSize: 9, letterSpacing: 3, color: 'rgba(255,255,255,0.55)' },
  confirmKind: { fontSize: 13, color: 'rgba(255,255,255,0.7)', marginTop: 12 },
  confirmAmount: { fontFamily: 'monospace', fontSize: 32, fontWeight: '800', color: '#fff', marginTop: 2 },
  confirmSub: { fontSize: 11, color: 'rgba(255,255,255,0.50)', marginTop: 2 },
  confirmBtnGhost: {
    flex: 1, paddingHorizontal: 12, paddingVertical: 10,
    borderRadius: 6, borderWidth: 1, borderColor: 'rgba(255,255,255,0.30)',
    alignItems: 'center', justifyContent: 'center',
  },
  confirmBtnGhostText: { fontSize: 13, color: 'rgba(255,255,255,0.85)' },
  confirmBtnPrimary: {
    flex: 1, paddingHorizontal: 12, paddingVertical: 10,
    borderRadius: 6, backgroundColor: colors.accent,
    alignItems: 'center', justifyContent: 'center',
  },
  confirmBtnPrimaryText: { fontSize: 13, color: '#fff', fontWeight: '700' },

  toolRail: {
    backgroundColor: colors.surface, paddingHorizontal: 16, paddingTop: 12,
    borderTopWidth: 1, borderTopColor: colors.border,
  },
  toolRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: colors.rule,
  },
  toolName: { fontFamily: 'monospace', fontSize: 11, color: colors.textSub },

  halo: { position: 'absolute' },
})
