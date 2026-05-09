import React, { useEffect, useRef, useState } from 'react'
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { colors, appStyles, shadows } from '@/constants/app-styles'

type Shape     = 'briefing' | 'monitor' | 'content' | 'auto'
type TaskStatus = 'idle' | 'approving' | 'running' | 'stopped' | 'error'

const SHAPES: { value: Shape; label: string; sample: string }[] = [
  { value: 'briefing', label: 'Briefing', sample: 'Brief me on Solana DeFi every minute for 5 minutes' },
  { value: 'monitor',  label: 'Monitor',  sample: 'Watch Kamino USDC every 30 seconds. Alert on tier change.' },
  { value: 'content',  label: 'Content',  sample: 'Draft me a short Solana DeFi report' },
  { value: 'auto',     label: 'Auto',     sample: 'Whatever fits the goal' },
]

const HOW = [
  'Sign once to approve a USDC spending cap.',
  'The agent runs on-chain steps at your chosen interval.',
  'Each step is paid from the vault via x402.',
  'Unused budget is refunded when you stop.',
]

function formatMs(ms: number) {
  const m = Math.floor(ms / 60_000)
  const s = Math.floor((ms % 60_000) / 1_000)
  return `${m}:${s.toString().padStart(2, '0')}`
}

function NumField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <View style={{ flex: 1, gap: 6 }}>
      <Text style={appStyles.sectionLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        keyboardType="decimal-pad"
        style={styles.numInput}
        placeholderTextColor={colors.textMuted}
      />
    </View>
  )
}

function BigCounter({ label, value, sub, accent = false }: { label: string; value: string; sub: string; accent?: boolean }) {
  return (
    <View style={[styles.counter, accent && styles.counterAccent]}>
      <Text style={appStyles.sectionLabel}>{label}</Text>
      <Text style={[styles.counterNum, accent && { color: colors.accent }]}>{value}</Text>
      <Text style={[appStyles.sectionLabel, { color: colors.textMuted }]}>{sub}</Text>
    </View>
  )
}

export default function ActivityScreen() {
  const [shape, setShape]           = useState<Shape>('briefing')
  const [goal, setGoal]             = useState(SHAPES[0]!.sample)
  const [budget, setBudget]         = useState('1.00')
  const [intervalSec, setIntervalSec] = useState('30')
  const [durationMin, setDurationMin] = useState('5')
  const [taskStatus, setTask]       = useState<TaskStatus>('idle')
  const [iterations, setIterations] = useState(0)
  const [msLeft, setMsLeft]         = useState(0)
  const timer = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (taskStatus === 'running') {
      const total = parseFloat(durationMin) * 60_000
      setMsLeft(total)
      timer.current = setInterval(() => {
        setMsLeft(p => {
          const n = p - 1_000
          if (n <= 0) { clearInterval(timer.current!); setTask('stopped'); return 0 }
          return n
        })
        setIterations(n => n + 1)
      }, 1_000)
    }
    return () => { if (timer.current) clearInterval(timer.current) }
  }, [taskStatus])

  const isRunning  = taskStatus === 'running'
  const isApproving = taskStatus === 'approving'
  const budgetNum  = parseFloat(budget || '0')

  const statusPill = taskStatus === 'running' ? [appStyles.pill, appStyles.pillAccent]
    : taskStatus === 'error' ? [appStyles.pill, styles.pillDanger]
    : appStyles.pill
  const statusText = taskStatus === 'running' ? [appStyles.pillText, appStyles.pillAccentText]
    : taskStatus === 'error' ? [appStyles.pillText, { color: colors.danger }]
    : appStyles.pillText

  return (
    <SafeAreaView style={appStyles.screen} edges={['top']}>
      <View style={appStyles.header}>
        <Text style={appStyles.headerTitle}>SAGE</Text>
        <View style={[appStyles.pill, appStyles.pillAccent]}>
          <View style={styles.dot} />
          <Text style={[appStyles.pillText, appStyles.pillAccentText]}>devnet</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={styles.heading}>
          <Text style={styles.headNum}>03</Text>
          <Text style={styles.headTitle}>Activity</Text>
        </View>

        {/* ── Main task card ── */}
        <View style={appStyles.card}>
          <View style={[appStyles.spaceBetween, { marginBottom: 20 }]}>
            <Text style={styles.cardTitle}>Autonomous task</Text>
            <View style={statusPill}>
              <Text style={statusText}>● {taskStatus}</Text>
            </View>
          </View>

          {/* SETUP FORM */}
          {!isRunning && taskStatus !== 'stopped' && (
            <View style={{ gap: 20 }}>
              {/* Shape pills */}
              <View style={{ gap: 8 }}>
                <Text style={appStyles.sectionLabel}>Shape</Text>
                <View style={styles.shapeRow}>
                  {SHAPES.map(s => {
                    const active = shape === s.value
                    return (
                      <TouchableOpacity
                        key={s.value}
                        activeOpacity={0.75}
                        onPress={() => { setShape(s.value); setGoal(s.sample) }}
                        style={[styles.shapePill, active && styles.shapePillActive]}
                      >
                        <Text style={[styles.shapePillText, active && styles.shapePillTextActive]}>
                          {s.label}
                        </Text>
                      </TouchableOpacity>
                    )
                  })}
                </View>
              </View>

              {/* Goal */}
              <View style={{ gap: 8 }}>
                <Text style={appStyles.sectionLabel}>Goal</Text>
                <TextInput
                  value={goal}
                  onChangeText={setGoal}
                  multiline
                  numberOfLines={3}
                  placeholder="What should the agent do?"
                  placeholderTextColor={colors.textMuted}
                  style={styles.goalInput}
                />
              </View>

              {/* Params */}
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <NumField label="Budget USDC" value={budget}      onChange={setBudget} />
                <NumField label="Interval s"   value={intervalSec} onChange={setIntervalSec} />
                <NumField label="Duration min" value={durationMin} onChange={setDurationMin} />
              </View>

              <TouchableOpacity
                activeOpacity={0.85}
                style={[appStyles.btnPrimary, { paddingVertical: 16 }, isApproving && { opacity: 0.5 }]}
                onPress={() => { setIterations(0); setTask('approving'); setTimeout(() => setTask('running'), 1200) }}
                disabled={isApproving}
              >
                <Text style={[appStyles.btnPrimaryText, { fontSize: 15 }]}>
                  {isApproving ? 'Approving on-chain…' : `Start — sign once for $${budgetNum.toFixed(2)} cap`}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* LIVE COUNTERS */}
          {isRunning && (
            <View style={{ gap: 16 }}>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <BigCounter label="Cap left"   value={`$${budgetNum.toFixed(2)}`} sub={`of $${budgetNum.toFixed(2)}`} />
                <BigCounter label="Time left"  value={formatMs(msLeft)}            sub="m:ss" accent />
                <BigCounter label="Iterations" value={String(iterations)}          sub="on-chain" />
              </View>
              <TouchableOpacity
                activeOpacity={0.8}
                style={appStyles.btnOutline}
                onPress={() => { if (timer.current) clearInterval(timer.current); setTask('stopped') }}
              >
                <Text style={appStyles.btnOutlineText}>Stop and refund leftover</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* STOPPED */}
          {taskStatus === 'stopped' && (
            <View style={{ gap: 14 }}>
              <View style={styles.stoppedBox}>
                <Text style={styles.stoppedText}>
                  {iterations > 0
                    ? `Completed ${iterations} iteration${iterations !== 1 ? 's' : ''}. Vault refunded.`
                    : 'Closed before any iterations. Vault refunded.'}
                </Text>
              </View>
              <TouchableOpacity activeOpacity={0.8} style={appStyles.btnOutline} onPress={() => setTask('idle')}>
                <Text style={appStyles.btnOutlineText}>New task</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* How it works */}
        {taskStatus === 'idle' && (
          <View style={appStyles.card}>
            <Text style={[appStyles.sectionLabel, { marginBottom: 14 }]}>How it works</Text>
            {HOW.map((line, i) => (
              <View
                key={i}
                style={[styles.howRow, i < HOW.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.rule }]}
              >
                <View style={styles.howNum}>
                  <Text style={{ fontFamily: 'monospace', fontSize: 10, color: colors.accent, letterSpacing: 1 }}>
                    0{i + 1}
                  </Text>
                </View>
                <Text style={styles.howText}>{line}</Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  scroll:    { padding: 16, paddingBottom: 32, gap: 14 },
  heading:   { flexDirection: 'row', alignItems: 'baseline', gap: 10 },
  headNum:   { fontFamily: 'monospace', fontSize: 11, letterSpacing: 3, color: colors.textMuted },
  headTitle: { fontSize: 24, fontWeight: '800', color: colors.textPrimary, letterSpacing: -0.4 },
  dot:       { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.accent,
                shadowColor: colors.accent, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.8, shadowRadius: 4 },
  cardTitle: { fontSize: 15, fontWeight: '800', color: colors.textPrimary },

  // Shape pills — fully filled when active
  shapeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  shapePill: {
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 999,
    backgroundColor: colors.surfaceHigh, borderWidth: 1, borderColor: colors.border,
  },
  shapePillActive: {
    backgroundColor: colors.accent, borderColor: colors.accent,
    ...shadows.accent,
  },
  shapePillText:       { fontFamily: 'monospace', fontSize: 12, fontWeight: '600', color: colors.textSub },
  shapePillTextActive: { color: '#000', fontWeight: '800' },

  // Inputs
  goalInput: {
    borderWidth: 1, borderColor: colors.borderBright, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 13, color: colors.textPrimary,
    backgroundColor: colors.surfaceHigh,
    minHeight: 80, textAlignVertical: 'top',
    fontFamily: 'monospace', lineHeight: 20,
  },
  numInput: {
    borderWidth: 1, borderColor: colors.border, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 11,
    fontSize: 13, color: colors.textPrimary,
    backgroundColor: colors.surfaceHigh, fontFamily: 'monospace',
  },

  // Counters
  counter: {
    flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: 12,
    padding: 14, alignItems: 'center', backgroundColor: colors.surfaceHigh, gap: 4,
  },
  counterAccent: { borderColor: colors.accent, backgroundColor: colors.accentDim },
  counterNum: {
    fontFamily: 'monospace', fontSize: 22, fontWeight: '800',
    color: colors.textPrimary, letterSpacing: -0.5, marginVertical: 3,
  },

  // Stopped
  stoppedBox: {
    backgroundColor: colors.surfaceHigh, borderWidth: 1,
    borderColor: colors.border, borderRadius: 10, padding: 14,
  },
  stoppedText: { fontFamily: 'monospace', fontSize: 12, color: colors.textSub, lineHeight: 18 },

  // Status pills
  pillDanger: { backgroundColor: colors.dangerDim, borderColor: colors.danger },

  // How it works
  howRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 14, paddingVertical: 12 },
  howNum: {
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: colors.accentDim, borderWidth: 1, borderColor: colors.accent,
    alignItems: 'center', justifyContent: 'center',
  },
  howText: { flex: 1, fontSize: 13, color: colors.textSub, lineHeight: 20 },
})
