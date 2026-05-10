import React, { useEffect, useState } from 'react'
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { colors, appStyles, shadows } from '@/constants/app-styles'
import { useAutonomousTask } from '@/hooks/use-autonomous-task'
import { buildDecidePolicy, type Shape } from '@/lib/autonomous-decide'

type LocalShape = Shape

const SHAPES: { value: LocalShape; label: string; sample: string }[] = [
  { value: 'briefing', label: 'Briefing', sample: 'Brief me on cross-chain USDC every minute for 3 minutes' },
  { value: 'monitor',  label: 'Monitor',  sample: 'Watch Kamino USDC every 30 seconds. Alert on tier change.' },
  { value: 'content',  label: 'Content',  sample: 'Draft a short cross-chain USDC report' },
  { value: 'market',   label: 'Market',   sample: 'Pulse SOL ETH BTC every 30 seconds' },
  { value: 'auto',     label: 'Auto',     sample: 'Whatever fits the goal' },
]

const HOW = [
  'Sign once to approve a USDC spending cap on the vault.',
  'A fresh agent keypair signs each loop step on-chain.',
  'Each step is paid via x402 from the vault.',
  'Unused budget is refunded automatically when you stop.',
]

function formatMs(ms: number) {
  if (ms <= 0) return '0:00'
  const m = Math.floor(ms / 60_000)
  const s = Math.floor((ms % 60_000) / 1_000)
  return `${m}:${s.toString().padStart(2, '0')}`
}

function NumField({ label, value, onChange, editable = true }: { label: string; value: string; onChange: (v: string) => void; editable?: boolean }) {
  return (
    <View style={{ flex: 1, gap: 6 }}>
      <Text style={appStyles.sectionLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        keyboardType="decimal-pad"
        editable={editable}
        style={[styles.numInput, !editable && { opacity: 0.5 }]}
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
  const task = useAutonomousTask()

  const [shape, setShape] = useState<LocalShape>('briefing')
  const [goal, setGoal] = useState(SHAPES[0]!.sample)
  const [budget, setBudget] = useState('1.00')
  const [intervalSec, setIntervalSec] = useState('30')
  const [durationMin, setDurationMin] = useState('3')
  const [showFormAfterWrap, setShowFormAfterWrap] = useState(false)

  // Live countdown derived from endsAt
  const [msLeft, setMsLeft] = useState(0)
  useEffect(() => {
    if (task.status !== 'running' || !task.endsAt) return
    const id = setInterval(() => {
      const remaining = (task.endsAt ?? 0) - Date.now()
      setMsLeft(Math.max(0, remaining))
    }, 500)
    return () => clearInterval(id)
  }, [task.status, task.endsAt])

  const isRunning   = task.status === 'running'
  const isApproving = task.status === 'approving'
  const isStopping  = task.status === 'stopping'
  const isStopped   = task.status === 'stopped'
  const showWrapUp  = isStopped && task.wrapUp && !showFormAfterWrap
  const showForm    = !isRunning && !isApproving && !isStopping && !showWrapUp
  const budgetNum   = parseFloat(budget || '0')

  const statusPillStyle = isRunning
    ? [appStyles.pill, appStyles.pillAccent]
    : task.status === 'error'
    ? [appStyles.pill, styles.pillDanger]
    : appStyles.pill
  const statusTextStyle = isRunning
    ? [appStyles.pillText, appStyles.pillAccentText]
    : task.status === 'error'
    ? [appStyles.pillText, { color: colors.danger }]
    : appStyles.pillText

  const onStart = async () => {
    if (!Number.isFinite(budgetNum) || budgetNum <= 0) {
      Alert.alert('Invalid budget', 'Enter a positive USDC amount')
      return
    }
    const intervalSeconds = Math.max(1, parseInt(intervalSec, 10) || 30)
    const durationMinutes = Math.max(1, parseFloat(durationMin) || 3)
    try {
      setShowFormAfterWrap(false)
      await task.start({
        goal,
        budget: budgetNum,
        intervalSeconds,
        durationMinutes,
        decide: buildDecidePolicy({ goal, shape }),
      })
    } catch (err) {
      Alert.alert('Could not start task', (err as Error).message)
    }
  }

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
            <View style={statusPillStyle as never}>
              <Text style={statusTextStyle as never}>● {task.status}</Text>
            </View>
          </View>

          {/* SETUP FORM */}
          {showForm && (
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
                <NumField label="Interval s"  value={intervalSec} onChange={setIntervalSec} />
                <NumField label="Duration m"  value={durationMin} onChange={setDurationMin} />
              </View>

              {task.error && (
                <View style={styles.errorBanner}>
                  <Text style={styles.errorText}>{task.error}</Text>
                </View>
              )}

              <TouchableOpacity
                activeOpacity={0.85}
                style={[appStyles.btnPrimary, { paddingVertical: 16 }, isApproving && { opacity: 0.5 }]}
                onPress={onStart}
                disabled={isApproving}
              >
                <Text style={[appStyles.btnPrimaryText, { fontSize: 15 }]}>
                  {isApproving ? 'Approving on-chain…' : `Start — sign once for $${budgetNum.toFixed(2)} cap`}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* APPROVING — single-prompt MWA flow */}
          {isApproving && (
            <View style={{ alignItems: 'center', paddingVertical: 18, gap: 8 }}>
              <Text style={styles.cardTitle}>Approve in your wallet</Text>
              <Text style={[appStyles.sectionLabel, { color: colors.textSub, textAlign: 'center' }]}>
                One signature: drips SOL to the agent + opens the on-chain task.
              </Text>
            </View>
          )}

          {/* LIVE COUNTERS */}
          {isRunning && (
            <View style={{ gap: 16 }}>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <BigCounter
                  label="Cap left"
                  value={`$${task.budgetRemaining.toFixed(2)}`}
                  sub={`of $${task.budgetTotal.toFixed(2)}`}
                />
                <BigCounter label="Time left" value={formatMs(msLeft)} sub="m:ss" accent />
                <BigCounter label="Iterations" value={String(task.iterations.length)} sub="on-chain" />
              </View>
              <TouchableOpacity
                activeOpacity={0.8}
                style={appStyles.btnOutline}
                onPress={() => task.stop()}
              >
                <Text style={appStyles.btnOutlineText}>Stop and refund leftover</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* STOPPING */}
          {isStopping && (
            <View style={{ alignItems: 'center', paddingVertical: 18, gap: 8 }}>
              <Text style={styles.cardTitle}>Closing on-chain…</Text>
              <Text style={[appStyles.sectionLabel, { color: colors.textSub }]}>refunding leftover budget</Text>
            </View>
          )}

          {/* WRAP-UP */}
          {showWrapUp && task.wrapUp && (
            <View style={{ gap: 14 }}>
              <View style={styles.wrapBox}>
                <Text style={styles.wrapTitle}>Task complete</Text>
                <Text style={styles.wrapSummary}>{task.wrapUp.summary}</Text>
                <View style={styles.wrapStats}>
                  <Text style={styles.wrapStat}>
                    {task.wrapUp.iterationCount} iterations · ${task.wrapUp.totalSpent.toFixed(2)} spent
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                activeOpacity={0.8}
                style={appStyles.btnOutline}
                onPress={() => setShowFormAfterWrap(true)}
              >
                <Text style={appStyles.btnOutlineText}>Run another task ›</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Live iteration log */}
        {(isRunning || (isStopped && task.iterations.length > 0)) && (
          <View style={appStyles.card}>
            <Text style={[appStyles.sectionLabel, { marginBottom: 12 }]}>Iterations</Text>
            {task.iterations.length === 0 && (
              <Text style={[appStyles.mono, { color: colors.textMuted, fontSize: 11 }]}>
                Waiting for first tick…
              </Text>
            )}
            {task.iterations.slice().reverse().map(it => (
              <View key={it.signature} style={styles.iterRow}>
                <View style={styles.iterHead}>
                  <Text style={styles.iterEndpoint}>{it.endpoint}</Text>
                  <Text style={appStyles.mono}>${it.amount.toFixed(2)}</Text>
                </View>
                <Text style={styles.iterResult} numberOfLines={3}>{it.result}</Text>
              </View>
            ))}
          </View>
        )}

        {/* How it works (only when idle) */}
        {showForm && task.iterations.length === 0 && (
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

  shapeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  shapePill: {
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 999,
    backgroundColor: colors.surfaceHigh, borderWidth: 1, borderColor: colors.border,
  },
  shapePillActive: {
    backgroundColor: colors.accent, borderColor: colors.accent,
    ...shadows.accent,
  },
  shapePillText: { fontFamily: 'monospace', fontSize: 11, fontWeight: '600', color: colors.textSub },
  shapePillTextActive: { color: '#000', fontWeight: '800' },

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

  counter: {
    flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: 12,
    padding: 14, alignItems: 'center', backgroundColor: colors.surfaceHigh, gap: 4,
  },
  counterAccent: { borderColor: colors.accent, backgroundColor: colors.accentDim },
  counterNum: {
    fontFamily: 'monospace', fontSize: 22, fontWeight: '800',
    color: colors.textPrimary, letterSpacing: -0.5, marginVertical: 3,
  },

  wrapBox: {
    backgroundColor: colors.accentDim, borderWidth: 1,
    borderColor: colors.accent, borderRadius: 12, padding: 14, gap: 8,
  },
  wrapTitle: { fontSize: 14, fontWeight: '800', color: colors.accent },
  wrapSummary: { fontSize: 13, color: colors.textPrimary, lineHeight: 19 },
  wrapStats: { paddingTop: 6, borderTopWidth: 1, borderTopColor: colors.accent },
  wrapStat: { fontFamily: 'monospace', fontSize: 11, color: colors.textSub },

  errorBanner: {
    backgroundColor: 'rgba(255,90,117,0.1)', borderWidth: 1, borderColor: colors.danger,
    borderRadius: 8, padding: 10,
  },
  errorText: { fontFamily: 'monospace', fontSize: 11, color: colors.danger },

  pillDanger: { backgroundColor: 'rgba(255,90,117,0.1)', borderColor: colors.danger },

  iterRow: {
    paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: colors.rule,
    gap: 4,
  },
  iterHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  iterEndpoint: { fontFamily: 'monospace', fontSize: 11, fontWeight: '700', color: colors.accent },
  iterResult: { fontSize: 12, color: colors.textSub, lineHeight: 17 },

  howRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 14, paddingVertical: 12 },
  howNum: {
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: colors.accentDim, borderWidth: 1, borderColor: colors.accent,
    alignItems: 'center', justifyContent: 'center',
  },
  howText: { flex: 1, fontSize: 13, color: colors.textSub, lineHeight: 20 },
})
