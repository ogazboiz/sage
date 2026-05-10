import React, { useMemo, useState } from 'react'
import {
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useMutation } from '@tanstack/react-query'
import { useMobileWallet } from '@wallet-ui/react-native-kit'
import { fetchQuote, LIFI_SOLANA_CHAIN_ID, type QuoteResponse } from '@/lib/lifi'
import { colors, appStyles } from '@/constants/app-styles'

const SOURCE_CHAINS: Record<
  number,
  { label: string; color: string; address: string }
> = {
  1:     { label: 'Ethereum', color: '#627EEA', address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48' },
  8453:  { label: 'Base',     color: '#0052FF', address: '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913' },
  42161: { label: 'Arbitrum', color: '#28A0F0', address: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831' },
  10:    { label: 'Optimism', color: '#FF0420', address: '0x0b2c639c533813f4aa9d7837caf62653d097ff85' },
  137:   { label: 'Polygon',  color: '#8247E5', address: '0x3c499c542cef5e3811e1192ce70d8cc03d5c3359' },
}

const SOLANA_USDC = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'

function shortAddr(addr: string, n = 4): string {
  return `${addr.slice(0, n)}…${addr.slice(-n)}`
}

export default function BridgeScreen() {
  const { account } = useMobileWallet()
  const [sourceChainId, setSourceChainId] = useState(8453)
  const [amount, setAmount] = useState('50')
  const [pickerOpen, setPickerOpen] = useState(false)

  const destinationAddr = account?.address ?? null
  const source = SOURCE_CHAINS[sourceChainId]!

  const quote = useMutation<QuoteResponse, Error>({
    mutationFn: async () => {
      if (!destinationAddr) throw new Error('Connect a Solana wallet first')
      const fromAmount = String(BigInt(Math.round(parseFloat(amount) * 10 ** 6)))
      return fetchQuote({
        fromChain: sourceChainId,
        toChain: LIFI_SOLANA_CHAIN_ID,
        fromToken: source.address,
        toToken: SOLANA_USDC,
        fromAmount,
        fromAddress: '0x0000000000000000000000000000000000000001',
        toAddress: destinationAddr,
      })
    },
  })

  const fromAmount = parseFloat(amount) || 0
  const toAmount = useMemo(() => {
    if (!quote.data?.estimate) return null
    return Number(quote.data.estimate.toAmount) / 1_000_000
  }, [quote.data])
  const slippage = useMemo(() => {
    if (toAmount == null) return null
    return Math.max(((fromAmount - toAmount) / fromAmount) * 100, 0)
  }, [fromAmount, toAmount])

  return (
    <SafeAreaView style={appStyles.screen} edges={['top']}>
      <View style={appStyles.header}>
        <Text style={appStyles.headerTitle}>SAGE</Text>
        <View style={[appStyles.pill, appStyles.pillAccent]}>
          <View style={styles.dot} />
          <Text style={[appStyles.pillText, appStyles.pillAccentText]}>devnet</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.heading}>
          <Text style={styles.headNum}>04</Text>
          <Text style={styles.headTitle}>Bridge</Text>
        </View>

        <View style={appStyles.card}>
          <View style={[appStyles.spaceBetween, { marginBottom: 14 }]}>
            <Text style={styles.cardTitle}>Fund vault</Text>
            <View style={appStyles.pill}>
              <Text style={appStyles.pillText}>LI.FI Composer</Text>
            </View>
          </View>

          {/* From */}
          <View style={[styles.subCard, { marginBottom: 12 }]}>
            <View style={appStyles.spaceBetween}>
              <Text style={appStyles.sectionLabel}>From</Text>
              <Pressable onPress={() => setPickerOpen(p => !p)}>
                <Text style={styles.chainLink}>{source.label} ▾</Text>
              </Pressable>
            </View>
            {pickerOpen && (
              <View style={styles.pickerBox}>
                {Object.entries(SOURCE_CHAINS).map(([id, c]) => (
                  <TouchableOpacity
                    key={id}
                    onPress={() => { setSourceChainId(Number(id)); setPickerOpen(false) }}
                    style={styles.pickerRow}
                  >
                    <View style={[styles.chainDot, { backgroundColor: c.color }]} />
                    <Text style={styles.pickerLabel}>{c.label}</Text>
                    {Number(id) === sourceChainId && (
                      <Text style={[appStyles.mono, { color: colors.accent }]}>✓</Text>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            )}
            <View style={styles.chainRow}>
              <View style={[styles.chainDot, { backgroundColor: source.color }]} />
              <View style={{ flex: 1 }}>
                <Text style={styles.chainName}>{source.label}</Text>
                <Text style={[appStyles.mono, { fontSize: 10 }]}>USDC</Text>
              </View>
            </View>
            <View style={styles.amountRow}>
              <TextInput
                value={amount}
                onChangeText={setAmount}
                keyboardType="decimal-pad"
                style={styles.amountInput}
                placeholderTextColor={colors.textMuted}
              />
              <Text style={appStyles.mono}>USDC</Text>
            </View>
          </View>

          {/* To */}
          <View style={[styles.subCard, { borderColor: colors.accent }]}>
            <Text style={appStyles.sectionLabel}>To · your vault</Text>
            <View style={styles.chainRow}>
              <View style={[styles.chainDot, { backgroundColor: '#9945FF' }]} />
              <View style={{ flex: 1 }}>
                <Text style={styles.chainName}>Solana · vault PDA</Text>
                <Text style={[appStyles.mono, { fontSize: 10 }]} numberOfLines={1}>
                  {destinationAddr ? shortAddr(destinationAddr, 6) : '(connect wallet)'}
                </Text>
              </View>
            </View>
            <View style={styles.amountRow}>
              <Text style={styles.amountReadout}>
                {toAmount != null ? toAmount.toFixed(2) : '—'}
              </Text>
              <Text style={appStyles.mono}>USDC after fees</Text>
            </View>
          </View>

          {/* Route summary */}
          <View style={[styles.subCard, { marginTop: 12 }]}>
            <View style={styles.routeRow}>
              <View style={{ flex: 1 }}>
                <Text style={appStyles.sectionLabel}>Best route</Text>
                <Text style={styles.routeName}>
                  {quote.data?.tool ??
                    quote.data?.toolDetails?.name ??
                    (quote.isPending ? 'Quoting…' : 'Get a quote to see route')}
                </Text>
                {quote.data?.estimate?.executionDuration ? (
                  <Text style={[appStyles.mono, { fontSize: 10, marginTop: 2 }]}>
                    est {Math.round(quote.data.estimate.executionDuration)}s
                  </Text>
                ) : null}
              </View>
            </View>
            <View style={styles.routeStats}>
              <View style={styles.routeStat}>
                <Text style={appStyles.sectionLabel}>Bridge fee</Text>
                <Text style={styles.routeStatVal}>
                  {toAmount != null ? `$${(fromAmount - toAmount).toFixed(2)}` : '—'}
                </Text>
              </View>
              <View style={styles.routeStat}>
                <Text style={appStyles.sectionLabel}>Slippage</Text>
                <Text style={styles.routeStatVal}>
                  {slippage != null ? `${slippage.toFixed(2)}%` : '—'}
                </Text>
              </View>
              <View style={styles.routeStat}>
                <Text style={appStyles.sectionLabel}>Min received</Text>
                <Text style={styles.routeStatVal}>
                  {quote.data?.estimate?.toAmountMin
                    ? `${(Number(quote.data.estimate.toAmountMin) / 1_000_000).toFixed(2)}`
                    : '—'}
                </Text>
              </View>
            </View>
          </View>

          {/* Actions */}
          <View style={styles.btnRow}>
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => quote.mutate()}
              disabled={quote.isPending || !destinationAddr}
              style={[
                appStyles.btnPrimary,
                { flex: 1, paddingVertical: 14 },
                (quote.isPending || !destinationAddr) && { opacity: 0.5 },
              ]}
            >
              <Text style={appStyles.btnPrimaryText}>
                {quote.isPending
                  ? 'Quoting…'
                  : quote.data
                    ? `Re-quote on ${source.label}`
                    : `Get quote on ${source.label}`}
              </Text>
            </TouchableOpacity>
            {quote.data && (
              <TouchableOpacity
                activeOpacity={0.85}
                style={[appStyles.btnOutline, { paddingVertical: 14 }]}
                onPress={() =>
                  Linking.openURL(
                    `https://jumper.exchange/?fromChain=${sourceChainId}&toChain=1151111081099710`,
                  )
                }
              >
                <Text style={appStyles.btnOutlineText}>Other routes ↗</Text>
              </TouchableOpacity>
            )}
          </View>

          {quote.isError && (
            <View style={styles.errorBanner}>
              <Text style={styles.errorText}>{(quote.error as Error).message}</Text>
            </View>
          )}
        </View>

        {!destinationAddr && (
          <View style={styles.connectHint}>
            <Text style={[appStyles.mono, { color: colors.textMuted }]}>
              Connect a wallet on the Vault tab to bridge into your vault.
            </Text>
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
  cardTitle: { fontSize: 15, fontWeight: '700', color: colors.textPrimary },

  subCard: {
    backgroundColor: '#fff', borderWidth: 1, borderColor: colors.border,
    borderRadius: 8, padding: 12, gap: 8,
  },
  chainLink: { fontSize: 12, fontWeight: '600', color: colors.accent },
  chainRow:  { flexDirection: 'row', alignItems: 'center', gap: 10, paddingTop: 4 },
  chainDot:  { width: 26, height: 26, borderRadius: 13 },
  chainName: { fontSize: 14, fontWeight: '600', color: colors.textPrimary },
  amountRow: {
    borderTopWidth: 1, borderTopColor: colors.borderSoft, borderStyle: 'dashed',
    paddingTop: 10, marginTop: 4,
    flexDirection: 'row', alignItems: 'baseline', gap: 8,
  },
  amountInput: {
    fontFamily: 'monospace', fontSize: 24, fontWeight: '700', color: colors.textPrimary,
    minWidth: 80, paddingVertical: 0,
  },
  amountReadout: { fontFamily: 'monospace', fontSize: 24, fontWeight: '700', color: colors.textPrimary },

  pickerBox: {
    borderWidth: 1, borderColor: colors.border, borderRadius: 6,
    backgroundColor: colors.surfaceHigh, marginTop: 6,
  },
  pickerRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 10, paddingVertical: 9,
    borderBottomWidth: 1, borderBottomColor: colors.rule,
  },
  pickerLabel: { flex: 1, fontSize: 13, fontWeight: '500', color: colors.textPrimary },

  routeRow: { flexDirection: 'row', alignItems: 'flex-start' },
  routeName: { fontSize: 13, fontWeight: '700', color: colors.textPrimary, marginTop: 2 },
  routeStats: {
    flexDirection: 'row', gap: 12, marginTop: 12,
    paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.rule,
  },
  routeStat: { flex: 1 },
  routeStatVal: { fontFamily: 'monospace', fontSize: 12, color: colors.textPrimary, marginTop: 2 },

  btnRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  errorBanner: {
    marginTop: 10, backgroundColor: 'rgba(255,90,117,0.1)',
    borderWidth: 1, borderColor: colors.danger,
    borderRadius: 8, padding: 10,
  },
  errorText: { fontFamily: 'monospace', fontSize: 11, color: colors.danger },

  connectHint: {
    backgroundColor: colors.surfaceHigh, borderWidth: 1, borderColor: colors.borderSoft,
    borderStyle: 'dashed', borderRadius: 8, padding: 12, alignItems: 'center',
  },
})
