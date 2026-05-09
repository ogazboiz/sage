import React, { useRef, useEffect, useState } from 'react'
import {
  Animated,
  Easing,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { colors, appStyles } from '@/constants/app-styles'

type Status = 'idle' | 'connected' | 'disconnected'
type Mode   = 'listening' | 'speaking'

const LIVE_BG = '#03060F'   // deeper than app bg for immersive live session

const TOOLS = [
  'get_vault_status',
  'find_yield',
  'find_idle_assets',
  'propose_deposit',
  'propose_yield_deposit',
  'pay_briefing',
  'start_autonomous_task',
]

// ── Glow orb ─────────────────────────────────────────────────────────────────
// Multiple rings + stacked semi-transparent glow circles behind them.
function Orb({ active, speaking, size = 160 }: { active: boolean; speaking: boolean; size?: number }) {
  const pulse  = useRef(new Animated.Value(1)).current
  const glow   = useRef(new Animated.Value(0.6)).current

  useEffect(() => {
    if (active) {
      const duration = speaking ? 380 : 900
      Animated.loop(
        Animated.parallel([
          Animated.sequence([
            Animated.timing(pulse, { toValue: 1.08, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
            Animated.timing(pulse, { toValue: 1,    duration, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          ]),
          Animated.sequence([
            Animated.timing(glow, { toValue: 1,   duration, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
            Animated.timing(glow, { toValue: 0.6, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          ]),
        ]),
      ).start()
    } else {
      pulse.stopAnimation(); pulse.setValue(1)
      glow.stopAnimation();  glow.setValue(0.6)
    }
  }, [active, speaking])

  const s = size

  return (
    // Container is larger than the orb to hold the glow halos
    <View style={{ width: s * 2.8, height: s * 2.8, alignItems: 'center', justifyContent: 'center' }}>
      {/* ── Static glow halos ── */}
      <View style={[styles.halo, { width: s * 2.8, height: s * 2.8, borderRadius: s * 1.4, backgroundColor: 'rgba(0,232,162,0.025)' }]} />
      <View style={[styles.halo, { width: s * 2.0, height: s * 2.0, borderRadius: s * 1.0, backgroundColor: 'rgba(0,232,162,0.045)' }]} />
      <View style={[styles.halo, { width: s * 1.45, height: s * 1.45, borderRadius: s * 0.725, backgroundColor: 'rgba(0,232,162,0.07)' }]} />

      {/* ── Animated pulse ring (scale) + glow opacity ── */}
      <Animated.View style={{ width: s, height: s, transform: [{ scale: pulse }] }}>
        {/* Ring 1 — outermost, very faint */}
        <View style={{
          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
          borderRadius: s, borderWidth: 1,
          borderColor: 'rgba(0,232,162,0.18)',
        }} />
        {/* Ring 2 */}
        <View style={{
          position: 'absolute',
          top: s * 0.10, left: s * 0.10, right: s * 0.10, bottom: s * 0.10,
          borderRadius: s, borderWidth: 1,
          borderColor: 'rgba(0,232,162,0.30)',
        }} />
        {/* Ring 3 — inner with fill */}
        <View style={{
          position: 'absolute',
          top: s * 0.22, left: s * 0.22, right: s * 0.22, bottom: s * 0.22,
          borderRadius: s, borderWidth: 1.5,
          borderColor: colors.accent,
          backgroundColor: 'rgba(0,232,162,0.10)',
        }} />
        {/* Ring 4 — centre solid dot */}
        <View style={{
          position: 'absolute',
          top: s * 0.38, left: s * 0.38, right: s * 0.38, bottom: s * 0.38,
          borderRadius: s,
          backgroundColor: colors.accent,
        }} />
        {/* Label */}
        <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]}>
          <Text style={{ fontFamily: 'monospace', fontSize: 9, letterSpacing: 3, textTransform: 'uppercase', color: colors.accent }}>
            {speaking ? 'speaking' : active ? 'listening' : 'sage'}
          </Text>
        </View>
      </Animated.View>
    </View>
  )
}

// ── Screen ────────────────────────────────────────────────────────────────────
export default function TalkScreen() {
  const insets = useSafeAreaInsets()
  const [status, setStatus] = useState<Status>('idle')
  const [mode,   setMode  ] = useState<Mode>('listening')
  const [muted,  setMuted ] = useState(false)
  const [transcript, setTranscript] = useState<string[]>([])

  const isActive = status === 'connected'
  const speaking = isActive && mode === 'speaking'

  function start() { setStatus('connected'); setMode('listening'); setTranscript([]) }
  function end()   {
    setStatus('disconnected')
    setTranscript(p => [...p, 'disconnected · user ended'])
  }

  const lastAgentLine = transcript.slice().reverse()
    .find(l => l.startsWith('ai:'))?.replace(/^ai:\s*/, '')

  // ── LIVE SESSION ─────────────────────────────────────────────────────────
  if (isActive) {
    return (
      <SafeAreaView style={[appStyles.screen, { backgroundColor: LIVE_BG }]} edges={['top']}>
        <View style={[styles.hero, { backgroundColor: LIVE_BG }]}>
          {/* Top strip */}
          <View style={styles.heroStrip}>
            <View>
              <Text style={styles.heroMeta}>VAULT</Text>
              <Text style={styles.heroBalance}>$—</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.heroMeta}>SESSION</Text>
              <View style={[appStyles.row, { gap: 6, marginTop: 4 }]}>
                <View style={styles.liveDot} />
                <Text style={styles.heroMode}>{mode}</Text>
              </View>
            </View>
          </View>

          {/* Controls */}
          <View style={styles.heroControls}>
            <Text style={styles.liveBadge}>SAGE · LIVE</Text>
            <View style={appStyles.row}>
              <TouchableOpacity activeOpacity={0.7} onPress={() => setMuted(m => !m)} style={styles.ctrlBtn}>
                <Text style={styles.ctrlText}>{muted ? 'Unmute' : 'Mute'}</Text>
              </TouchableOpacity>
              <TouchableOpacity activeOpacity={0.7} onPress={end} style={styles.ctrlBtn}>
                <Text style={[styles.ctrlText, { color: colors.danger }]}>End</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Orb */}
          <View style={styles.orbCentre}>
            <Orb active size={180} speaking={speaking} />
          </View>

          {/* Subtitle */}
          <View style={styles.heroSub}>
            <Text style={styles.heroMeta}>● {speaking ? 'SPEAKING' : 'LISTENING'}</Text>
            <Text style={styles.heroSubText} numberOfLines={2}>
              {lastAgentLine ?? (speaking ? '…' : 'Listening for you.')}
            </Text>
          </View>
        </View>

        {/* Tool rail */}
        <View style={[styles.toolRail, { paddingBottom: insets.bottom + 8 }]}>
          <Text style={[appStyles.sectionLabel, { marginBottom: 8 }]}>Tool calls</Text>
          {TOOLS.map((t, i) => (
            <View key={t} style={[styles.toolRow, i === TOOLS.length - 1 && { borderBottomWidth: 0 }]}>
              <Text style={styles.toolName}>{t}</Text>
              <Text style={{ fontFamily: 'monospace', fontSize: 10, color: colors.textMuted }}>○</Text>
            </View>
          ))}
        </View>
      </SafeAreaView>
    )
  }

  // ── IDLE ─────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={appStyles.screen} edges={['top']}>
      {/* Header */}
      <View style={appStyles.header}>
        <Text style={appStyles.headerTitle}>SAGE</Text>
        <View style={[appStyles.pill, appStyles.pillAccent]}>
          <View style={styles.dotAccent} />
          <Text style={[appStyles.pillText, appStyles.pillAccentText]}>devnet</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Heading */}
        <View style={styles.heading}>
          <Text style={styles.headNum}>01</Text>
          <Text style={styles.headTitle}>Talk</Text>
        </View>

        {status === 'disconnected' && (
          <View style={styles.endedBanner}>
            <Text style={styles.endedText}>Session ended</Text>
          </View>
        )}

        {/* Main orb card */}
        <View style={appStyles.card}>
          <View style={styles.orbArea}>
            <Orb active={false} speaking={false} size={160} />
          </View>

          <TouchableOpacity activeOpacity={0.85} style={appStyles.btnPrimary} onPress={start}>
            <Text style={appStyles.btnPrimaryText}>● Start session</Text>
          </TouchableOpacity>

          <View style={{ alignItems: 'flex-end', marginTop: 12 }}>
            <View style={appStyles.pill}>
              <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: colors.textMuted }} />
              <Text style={appStyles.pillText}>{status}</Text>
            </View>
          </View>
        </View>

        {/* Tool list */}
        <View style={appStyles.card}>
          <Text style={[appStyles.sectionLabel, { marginBottom: 12 }]}>Available tools</Text>
          {TOOLS.map((t, i) => (
            <View
              key={t}
              style={[styles.idleTool, i < TOOLS.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.rule }]}
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

  endedBanner: {
    borderWidth: 1, borderColor: colors.border, borderRadius: 10,
    padding: 12, backgroundColor: colors.surfaceHigh,
  },
  endedText: { fontFamily: 'monospace', fontSize: 12, color: colors.textSub },

  orbArea: { alignItems: 'center', paddingVertical: 24 },

  // Idle tool list
  idleTool: { flexDirection: 'row', alignItems: 'center', paddingVertical: 9, gap: 10 },
  toolDot:  { width: 5, height: 5, borderRadius: 3, backgroundColor: colors.border },

  // ── Live hero ──────────────────────────────────────────────────────────────
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

  // ── Tool rail ──────────────────────────────────────────────────────────────
  toolRail: {
    backgroundColor: colors.surface, paddingHorizontal: 16, paddingTop: 12,
    borderTopWidth: 1, borderTopColor: colors.border,
  },
  toolRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: colors.rule,
  },
  toolName: { fontFamily: 'monospace', fontSize: 11, color: colors.textSub },

  // Orb halos
  halo: { position: 'absolute' },
})
