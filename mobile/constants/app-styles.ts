import { StyleSheet, Platform } from 'react-native'

// Paper-and-ink palette — mirrors the sage web app exactly
export const colors = {
  bg:           '#f0eee9',
  surface:      '#fafaf7',
  surfaceHigh:  '#f4f2ec',
  border:       '#1f2937',
  borderBright: '#374151',
  borderSoft:   '#d1d5db',
  rule:         '#e5e7eb',
  accent:       '#0f766e',
  accentDim:    'rgba(15,118,110,0.12)',
  accentGlow:   'rgba(15,118,110,0.06)',
  textPrimary:  '#1f2937',
  textSub:      '#4b5563',
  textMuted:    '#9ca3af',
  success:      '#16a34a',
  warning:      '#ca8a04',
  warningDim:   'rgba(202,138,4,0.12)',
  danger:       '#dc2626',
  dangerDim:    'rgba(220,38,38,0.10)',
  // Legacy aliases
  card:         '#fafaf7',
  cardBorder:   '#1f2937',
  green:        '#16a34a',
  textSecondary:'#4b5563',
  error:        '#dc2626',
  divider:      '#e5e7eb',
  textDim:      '#4b5563',
  textFaint:    '#9ca3af',
  surfaceSoft:  '#f4f2ec',
}

const cardShadow = Platform.select({
  ios:     { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8 },
  android: { elevation: 2 },
}) ?? {}

const accentShadow = Platform.select({
  ios:     { shadowColor: colors.accent, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 12 },
  android: { elevation: 6 },
}) ?? {}

export const shadows = { card: cardShadow, accent: accentShadow }

export const appStyles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  scrollContent: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 48, gap: 16 },
  header: {
    paddingHorizontal: 20, paddingVertical: 16,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderBottomWidth: 1, borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  headerTitle: {
    fontSize: 14, fontWeight: '800', color: colors.textPrimary,
    letterSpacing: 3.5, fontFamily: 'monospace', textTransform: 'uppercase',
  },
  card: {
    backgroundColor: colors.surface, borderColor: colors.border,
    borderRadius: 8, borderWidth: 1, padding: 18, ...cardShadow,
  },
  cardAccent: {
    backgroundColor: colors.surface, borderColor: colors.border,
    borderRadius: 8, borderWidth: 1, borderTopColor: colors.accent, borderTopWidth: 2,
    padding: 18, ...cardShadow,
  },
  section:       { gap: 10 },
  sectionLabel:  {
    fontSize: 10, fontWeight: '700', color: colors.textMuted,
    letterSpacing: 1.6, textTransform: 'uppercase', fontFamily: 'monospace',
  },
  title:    { fontSize: 22, fontWeight: '700', color: colors.textPrimary, letterSpacing: -0.3 },
  subtitle: { fontSize: 14, color: colors.textSub, lineHeight: 22 },
  mono:     { fontFamily: 'monospace', fontSize: 12, color: colors.textSub },

  btnPrimary: {
    backgroundColor: colors.accent, borderRadius: 6,
    paddingVertical: 13, paddingHorizontal: 18,
    alignItems: 'center', justifyContent: 'center', ...accentShadow,
  },
  btnPrimaryText: { fontSize: 14, fontWeight: '700', color: '#fff', letterSpacing: 0.2 },
  btnOutline: {
    backgroundColor: '#fff', borderRadius: 6, borderWidth: 1,
    borderColor: colors.border, paddingVertical: 13, paddingHorizontal: 18,
    alignItems: 'center', justifyContent: 'center',
  },
  btnOutlineText: { fontSize: 14, fontWeight: '600', color: colors.textPrimary },
  btnDanger: {
    backgroundColor: 'transparent', borderRadius: 6, borderWidth: 1,
    borderColor: colors.danger, paddingVertical: 13, paddingHorizontal: 18,
    alignItems: 'center', justifyContent: 'center',
  },
  btnDangerText: { fontSize: 14, fontWeight: '600', color: colors.danger },

  pill: {
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999,
    backgroundColor: '#f3f4f6', borderWidth: 1, borderColor: colors.borderSoft,
    flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start',
  },
  pillText:        { fontSize: 11, fontWeight: '500', color: colors.textPrimary, fontFamily: 'monospace' },
  pillAccent:      { backgroundColor: 'rgba(15,118,110,0.10)', borderColor: colors.accent },
  pillAccentText:  { color: colors.accent },
  pillWarning:     { backgroundColor: colors.warningDim, borderColor: colors.warning },
  pillWarningText: { color: colors.warning },
  pillActive:      { backgroundColor: colors.accentDim, borderColor: colors.accent },
  pillActiveText:  { color: colors.accent },

  divider:       { height: 1, backgroundColor: colors.rule },
  dashedDivider: { height: 1, backgroundColor: colors.borderSoft },
  row:           { flexDirection: 'row', alignItems: 'center' },
  spaceBetween:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
})
