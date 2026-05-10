import React, { useState } from 'react'
import {
  Alert, ScrollView, StyleSheet, Text,
  TextInput, TouchableOpacity, View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useMobileWallet } from '@wallet-ui/react-native-kit'
import { colors, appStyles } from '@/constants/app-styles'
import { AccountFeatureConnect } from '@/features/account/account-feature-connect'
import { AccountFeatureDisconnect } from '@/features/account/account-feature-disconnect'
import { useVaultAccount } from '@/hooks/use-vault-account'
import { useOwnerUsdcBalance, useVaultUsdcBalance } from '@/hooks/use-usdc-balance'
import { useInitVault } from '@/hooks/use-init-vault'
import { useDeposit } from '@/hooks/use-deposit'
import { useCancelTask } from '@/hooks/use-cancel-task'

const PROGRAM_ID = '64VYGx9kPeizgiqVRWGMBxbbsLV1n7YZTk8MezvpjqtZ'
const short = (s: string, n = 6) => `${s.slice(0, n)}…${s.slice(-n)}`

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={appStyles.sectionLabel}>{label}</Text>
      <Text style={styles.infoVal}>{value}</Text>
    </View>
  )
}

function LedgerRow({ kind, amount, detail }: { kind: string; amount: string; detail?: string }) {
  return (
    <View style={styles.ledgerRow}>
      <View style={styles.ledgerIcon} />
      <View style={{ flex: 1 }}>
        <Text style={styles.ledgerKind}>{kind}</Text>
        {detail && <Text style={[appStyles.mono, { fontSize: 10, marginTop: 2 }]}>{detail}</Text>}
      </View>
      <Text style={styles.ledgerAmt}>{amount}</Text>
    </View>
  )
}

export default function VaultScreen() {
  const { account }  = useMobileWallet()
  const vault        = useVaultAccount()
  const ownerUsdc    = useOwnerUsdcBalance()
  const vaultUsdc    = useVaultUsdcBalance()
  const initVault    = useInitVault()
  const deposit      = useDeposit()
  const cancelTask   = useCancelTask()

  const [depositAmt, setDepositAmt] = useState('0.10')

  const vaultBalance   = vaultUsdc.data ?? 0
  const walletBalance  = ownerUsdc.data ?? 0
  const vaultExists    = vault.data?.exists ?? false
  const totalDeposited = vault.data?.totalDeposited ?? 0
  const totalSpent     = vault.data?.totalSpent ?? 0
  const reserved       = vault.data?.activeTask?.budgetRemaining ?? 0
  const idleBalance    = Math.max(vaultBalance - reserved, 0)

  const parsedDeposit = parseFloat(depositAmt)
  const canDeposit    = Number.isFinite(parsedDeposit) && parsedDeposit > 0 && !deposit.isPending

  const handleInit = () =>
    initVault.mutate(undefined, {
      onError: (e) => Alert.alert('Init failed', (e as Error).message),
    })

  const handleDeposit = () =>
    deposit.mutate(parsedDeposit, {
      onError: (e) => Alert.alert('Deposit failed', (e as Error).message),
    })

  return (
    <SafeAreaView style={appStyles.screen} edges={['top']}>
      <View style={appStyles.header}>
        <Text style={appStyles.headerTitle}>SAGE</Text>
        <View style={[appStyles.pill, appStyles.pillAccent]}>
          <View style={styles.dot} />
          <Text style={[appStyles.pillText, appStyles.pillAccentText]}>devnet</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.heading}>
          <Text style={styles.headNum}>02</Text>
          <Text style={styles.headTitle}>Vault</Text>
        </View>

        {/* ── DISCONNECTED ── */}
        {!account && (
          <View style={[appStyles.card, { paddingVertical: 40 }]}>
            <View style={[appStyles.pill, appStyles.pillAccent, { alignSelf: 'flex-start', marginBottom: 24 }]}>
              <View style={styles.dot} />
              <Text style={[appStyles.pillText, appStyles.pillAccentText]}>devnet</Text>
            </View>
            <Text style={styles.heroTitle}>A wallet that{'\n'}does what you say.</Text>
            <Text style={styles.heroSub}>
              Speak intent. A Solana program holds your USDC and releases it only when you confirm.
            </Text>
            <View style={{ height: 1, backgroundColor: colors.border, marginVertical: 24 }} />
            <AccountFeatureConnect />
          </View>
        )}

        {/* ── CONNECTED ── */}
        {account && (
          <>
            {/* Balance hero */}
            <View style={appStyles.cardAccent}>
              <View style={appStyles.spaceBetween}>
                <Text style={appStyles.sectionLabel}>Vault balance · SAGE-USDC</Text>
                {(vault.isFetching || vaultUsdc.isFetching) && (
                  <Text style={[appStyles.sectionLabel, { color: colors.accent }]}>↻</Text>
                )}
              </View>
              <View style={styles.balanceRow}>
                <Text style={styles.balanceCurrency}>$</Text>
                <Text style={styles.balanceNum}>
                  {vaultUsdc.isLoading ? '—' : vaultBalance.toFixed(2)}
                </Text>
              </View>
              <View style={styles.pillRow}>
                {vaultExists ? (
                  <>
                    <View style={[appStyles.pill, appStyles.pillAccent]}>
                      <Text style={[appStyles.pillText, appStyles.pillAccentText]}>
                        ${idleBalance.toFixed(2)} idle
                      </Text>
                    </View>
                    {reserved > 0 && (
                      <View style={[appStyles.pill, appStyles.pillWarning]}>
                        <Text style={[appStyles.pillText, appStyles.pillWarningText]}>
                          ${reserved.toFixed(2)} reserved
                        </Text>
                      </View>
                    )}
                    <View style={appStyles.pill}>
                      <Text style={appStyles.pillText}>${totalSpent.toFixed(2)} spent</Text>
                    </View>
                  </>
                ) : (
                  <View style={[appStyles.pill, appStyles.pillWarning]}>
                    <Text style={[appStyles.pillText, appStyles.pillWarningText]}>
                      {vault.isLoading ? 'Loading…' : 'No vault yet'}
                    </Text>
                  </View>
                )}
              </View>
            </View>

            {/* Cancel-task recovery — appears if vault has stale active task */}
            {vault.data?.activeTask && (
              <View style={[styles.errorBanner, { gap: 8 }]}>
                <Text style={styles.errorBannerText}>
                  ⚠ Active task on vault · ${vault.data.activeTask.budgetRemaining.toFixed(2)} reserved
                </Text>
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() =>
                    cancelTask.mutate(undefined, {
                      onError: e => Alert.alert('Cancel failed', (e as Error).message),
                    })
                  }
                  disabled={cancelTask.isPending}
                  style={[appStyles.btnOutline, cancelTask.isPending && { opacity: 0.5 }]}
                >
                  <Text style={appStyles.btnOutlineText}>
                    {cancelTask.isPending ? 'Cancelling…' : 'Cancel & refund'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Init vault */}
            {!vaultExists && !vault.isLoading && (
              <TouchableOpacity
                activeOpacity={0.85}
                style={[
                  appStyles.btnPrimary,
                  { paddingVertical: 16 },
                  initVault.isPending && { opacity: 0.5 },
                ]}
                onPress={handleInit}
                disabled={initVault.isPending}
              >
                <Text style={[appStyles.btnPrimaryText, { fontSize: 16 }]}>
                  {initVault.isPending ? 'Initialising on-chain…' : '+ Initialise vault'}
                </Text>
              </TouchableOpacity>
            )}

            {initVault.isSuccess && (
              <View style={styles.successBanner}>
                <Text style={styles.successBannerText}>✓ Vault initialised on devnet</Text>
              </View>
            )}
            {initVault.isError && (
              <View style={styles.errorBanner}>
                <Text style={styles.errorBannerText}>{(initVault.error as Error).message}</Text>
              </View>
            )}

            {/* Vault exists: deposit + ledger */}
            {vaultExists && (
              <>
                <TouchableOpacity
                  activeOpacity={0.8}
                  style={appStyles.btnOutline}
                  onPress={() => { vault.refetch(); vaultUsdc.refetch(); ownerUsdc.refetch() }}
                >
                  <Text style={appStyles.btnOutlineText}>↻ Refresh balances</Text>
                </TouchableOpacity>

                {/* Deposit card */}
                <View style={appStyles.card}>
                  <Text style={[appStyles.sectionLabel, { marginBottom: 14 }]}>Deposit USDC</Text>
                  <View style={styles.balancePair}>
                    <View style={styles.miniCard}>
                      <Text style={appStyles.sectionLabel}>Wallet USDC</Text>
                      <Text style={styles.miniNum}>
                        {ownerUsdc.isLoading ? '—' : `$${walletBalance.toFixed(2)}`}
                      </Text>
                    </View>
                    <View style={[styles.miniCard, { borderColor: colors.accent }]}>
                      <Text style={appStyles.sectionLabel}>Vault USDC</Text>
                      <Text style={[styles.miniNum, { color: colors.accent }]}>
                        {vaultUsdc.isLoading ? '—' : `$${vaultBalance.toFixed(2)}`}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.depositRow}>
                    <TextInput
                      value={depositAmt}
                      onChangeText={setDepositAmt}
                      keyboardType="decimal-pad"
                      style={styles.depositInput}
                      placeholderTextColor={colors.textMuted}
                    />
                    <Text style={appStyles.sectionLabel}>USDC</Text>
                    <TouchableOpacity
                      activeOpacity={0.85}
                      style={[appStyles.btnPrimary, !canDeposit && { opacity: 0.4 }]}
                      onPress={handleDeposit}
                      disabled={!canDeposit}
                    >
                      <Text style={appStyles.btnPrimaryText}>
                        {deposit.isPending ? '…' : 'Deposit'}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {deposit.isError && (
                    <Text style={styles.errTxt}>{(deposit.error as Error).message}</Text>
                  )}
                  {deposit.isSuccess && (
                    <Text style={styles.okTxt}>✓ Deposit confirmed on devnet</Text>
                  )}
                </View>

                {/* Ledger */}
                <View style={appStyles.card}>
                  <View style={[appStyles.spaceBetween, { marginBottom: 14 }]}>
                    <Text style={styles.ledgerTitle}>Ledger</Text>
                    <Text style={appStyles.sectionLabel}>on-chain totals</Text>
                  </View>
                  {totalDeposited > 0 ? (
                    <>
                      <LedgerRow
                        kind="Total deposited"
                        amount={`+$${totalDeposited.toFixed(2)}`}
                        detail="deposit instructions"
                      />
                      {totalSpent > 0 && (
                        <LedgerRow
                          kind="Total spent"
                          amount={`-$${totalSpent.toFixed(2)}`}
                          detail="x402 step releases"
                        />
                      )}
                    </>
                  ) : (
                    <Text style={[appStyles.mono, { color: colors.textMuted, fontSize: 11, lineHeight: 18 }]}>
                      Deposit USDC to populate the ledger.
                    </Text>
                  )}
                </View>
              </>
            )}

            {/* Addresses */}
            <View style={appStyles.card}>
              <Text style={[appStyles.sectionLabel, { marginBottom: 12 }]}>On-chain</Text>
              <InfoRow label="Wallet"    value={short(account.address)} />
              <View style={styles.rowDiv} />
              <InfoRow label="Program"   value={short(PROGRAM_ID)} />
              <View style={styles.rowDiv} />
              <InfoRow label="USDC Mint" value="4zMM…cDU" />
              <View style={styles.rowDiv} />
              <InfoRow label="Network"   value="Solana Devnet" />
            </View>

            {/* Disconnect — same role as the WalletMultiButton dropdown on
                web. Kept compact; nav handles the rest. */}
            <View style={{ alignItems: 'flex-start', marginTop: 4 }}>
              <AccountFeatureDisconnect />
            </View>
          </>
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
  dot: {
    width: 6, height: 6, borderRadius: 3, backgroundColor: colors.accent,
    shadowColor: colors.accent, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.8, shadowRadius: 4,
  },
  heroTitle: { fontSize: 28, fontWeight: '800', color: colors.textPrimary, letterSpacing: -0.5, lineHeight: 36, marginBottom: 14 },
  heroSub:   { fontSize: 14, color: colors.textSub, lineHeight: 22 },
  balanceRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 4, marginVertical: 14 },
  balanceCurrency: { fontFamily: 'monospace', fontSize: 26, fontWeight: '800', color: colors.accent, paddingBottom: 6 },
  balanceNum: { fontFamily: 'monospace', fontSize: 50, fontWeight: '800', color: colors.textPrimary, letterSpacing: -2, lineHeight: 54 },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  balancePair: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  miniCard: {
    flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: 10,
    padding: 12, gap: 6, backgroundColor: colors.surfaceHigh,
  },
  miniNum: { fontFamily: 'monospace', fontSize: 18, fontWeight: '800', color: colors.textPrimary, marginTop: 2 },
  depositRow:  { flexDirection: 'row', alignItems: 'center', gap: 8 },
  depositInput: {
    flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 10,
    fontSize: 16, fontFamily: 'monospace', color: colors.textPrimary,
    backgroundColor: colors.surfaceHigh,
  },
  successBanner: { backgroundColor: colors.accentDim, borderWidth: 1, borderColor: colors.accent, borderRadius: 8, padding: 12 },
  successBannerText: { fontFamily: 'monospace', fontSize: 12, color: colors.accent },
  errorBanner: { backgroundColor: 'rgba(255,90,117,0.1)', borderWidth: 1, borderColor: colors.danger, borderRadius: 8, padding: 12 },
  errorBannerText: { fontFamily: 'monospace', fontSize: 12, color: colors.danger },
  errTxt: { fontFamily: 'monospace', fontSize: 11, color: colors.danger, marginTop: 6 },
  okTxt:  { fontFamily: 'monospace', fontSize: 11, color: colors.accent, marginTop: 6 },
  infoRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  infoVal: { fontFamily: 'monospace', fontSize: 12, color: colors.textSub },
  rowDiv:  { height: 1, backgroundColor: colors.rule, marginVertical: 10 },
  ledgerTitle: { fontSize: 14, fontWeight: '700', color: colors.textPrimary },
  ledgerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.rule },
  ledgerIcon: { width: 26, height: 26, borderRadius: 13, borderWidth: 1, borderColor: colors.borderBright, backgroundColor: colors.surfaceHigh },
  ledgerKind: { fontSize: 13, fontWeight: '600', color: colors.textPrimary },
  ledgerAmt:  { fontFamily: 'monospace', fontSize: 12, color: colors.textSub },
})
