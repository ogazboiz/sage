import React from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { useMobileWallet } from '@wallet-ui/react-native-kit'
import { appStyles, colors } from '@/constants/app-styles'
import { AccountFeatureGetBalance } from './account-feature-get-balance'
import { AccountFeatureConnect } from './account-feature-connect'
import { AccountFeatureSignIn } from './account-feature-sign-in'
import { AccountFeatureSignMessage } from './account-feature-sign-message'
import { AccountFeatureSignTransaction } from './account-feature-sign-transaction'
import { AccountFeatureDisconnect } from './account-feature-disconnect'
import { ellipsify } from '@/utils/ellipsify'

export function AccountFeatureIndex() {
  const { account } = useMobileWallet()

  if (!account) {
    return (
      <View style={appStyles.section}>
        <View style={[appStyles.card, styles.hero]}>
          <Text style={styles.solanaSymbol}>◎</Text>
          <View style={styles.heroText}>
            <Text style={appStyles.title}>Connect Wallet</Text>
            <Text style={[appStyles.subtitle, { textAlign: 'center', marginTop: 6 }]}>
              Connect your Solana wallet to access the ecosystem
            </Text>
          </View>
          <View style={styles.heroActions}>
            <AccountFeatureConnect />
            <AccountFeatureSignIn />
          </View>
        </View>
      </View>
    )
  }

  return (
    <View style={appStyles.section}>
      <View style={appStyles.card}>
        <View style={[appStyles.spaceBetween, { marginBottom: 20 }]}>
          <View style={appStyles.row}>
            <View style={styles.dot} />
            <Text style={styles.connectedLabel}>Connected</Text>
          </View>
          <Text style={appStyles.mono}>{ellipsify(account.address.toString(), 4)}</Text>
        </View>
        <AccountFeatureGetBalance address={account.address} />
      </View>

      <Text style={appStyles.sectionLabel}>Actions</Text>
      <View style={appStyles.card}>
        <AccountFeatureSignIn account={account} />
        <View style={[appStyles.divider, { marginVertical: 2 }]} />
        <AccountFeatureSignMessage address={account.address} />
        <View style={[appStyles.divider, { marginVertical: 2 }]} />
        <AccountFeatureSignTransaction address={account.address} />
      </View>

      <AccountFeatureDisconnect />
    </View>
  )
}

const styles = StyleSheet.create({
  hero: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 24,
  },
  solanaSymbol: {
    fontSize: 64,
    color: colors.accent,
  },
  heroText: {
    alignItems: 'center',
    gap: 4,
  },
  heroActions: {
    width: '100%',
    gap: 12,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.green,
    marginRight: 8,
  },
  connectedLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.green,
  },
})
