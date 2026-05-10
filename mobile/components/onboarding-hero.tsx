import React from 'react'
import { Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { AccountFeatureConnect } from '@/features/account/account-feature-connect'
import { appStyles, colors } from '@/constants/app-styles'
import { PROGRAM_ADDRESS, USDC_MINT } from '@/lib/sage/constants'

function shortAddr(addr: string): string {
  return `${addr.slice(0, 4)}…${addr.slice(-4)}`
}

// Mobile equivalent of the web OnboardingHero. Same copy, native layout —
// this is what the user sees before connecting a wallet. Tab nav is hidden
// at this stage so the connect CTA is the only entry point.
export function OnboardingHero() {
  return (
    <SafeAreaView style={appStyles.screen} edges={['top', 'bottom']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <View style={appStyles.header}>
          <Text style={appStyles.headerTitle}>SAGE</Text>
          <View style={[appStyles.pill, appStyles.pillAccent]}>
            <View style={styles.dot} />
            <Text style={[appStyles.pillText, appStyles.pillAccentText]}>devnet</Text>
          </View>
        </View>

        <View style={styles.heroCard}>
          <View style={styles.pillRow}>
            <View style={[appStyles.pill, appStyles.pillAccent]}>
              <View style={styles.dot} />
              <Text style={[appStyles.pillText, appStyles.pillAccentText]}>devnet</Text>
            </View>
            <View style={appStyles.pill}>
              <Text style={appStyles.pillText}>solana · li.fi · elevenlabs · x402</Text>
            </View>
          </View>

          <Text style={styles.title}>
            The on-chain spending limit your AI agent can't bypass.
          </Text>

          <Text style={styles.sub}>
            Set a USDC budget. Speak a task. The Solana program enforces every cent.
          </Text>

          <View style={styles.demoCue}>
            <Text style={styles.demoCueLead}>After connecting, try: </Text>
            <Text style={styles.demoCueQuote}>
              "Run a cross-chain USDC briefing every 30 seconds for 2 minutes, max one dollar."
            </Text>
          </View>

          <View style={{ paddingTop: 4 }}>
            <AccountFeatureConnect />
          </View>

          <View style={styles.footer}>
            <TouchableOpacity
              onPress={() =>
                Linking.openURL(`https://solscan.io/account/${PROGRAM_ADDRESS}?cluster=devnet`)
              }
            >
              <Text style={styles.footerLink}>program {shortAddr(PROGRAM_ADDRESS)} ↗</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() =>
                Linking.openURL(`https://solscan.io/account/${USDC_MINT}?cluster=devnet`)
              }
            >
              <Text style={styles.footerLink}>usdc {shortAddr(USDC_MINT)} ↗</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => Linking.openURL('https://github.com/ogazboiz/sage')}>
              <Text style={styles.footerLink}>github ↗</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  scroll: { paddingBottom: 32 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.accent },

  heroCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 8,
    margin: 16,
    padding: 24,
    gap: 22,
  },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },

  title: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.textPrimary,
    lineHeight: 36,
    letterSpacing: -0.6,
  },
  sub: {
    fontSize: 15,
    color: colors.textSub,
    lineHeight: 22,
  },
  demoCue: {
    borderLeftWidth: 2,
    borderLeftColor: colors.accent,
    paddingLeft: 12,
    paddingVertical: 2,
  },
  demoCueLead: {
    fontSize: 12,
    color: colors.textSub,
    fontStyle: 'italic',
    lineHeight: 18,
  },
  demoCueQuote: {
    fontFamily: 'monospace',
    fontSize: 12,
    color: colors.textPrimary,
    lineHeight: 18,
    marginTop: 2,
  },

  footer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
    paddingTop: 18,
    borderTopWidth: 1,
    borderTopColor: colors.borderSoft,
    borderStyle: 'dashed',
  },
  footerLink: {
    fontFamily: 'monospace',
    fontSize: 11,
    color: colors.textSub,
  },
})
