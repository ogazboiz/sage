import { Text, View } from 'react-native'
import React from 'react'
import { useAccountGetBalance } from './use-account-get-balance'
import { lamportsToSol } from '@/utils/lamports-to-sol'
import { Address } from '@solana/kit'
import { appStyles, colors } from '@/constants/app-styles'

export function AccountFeatureGetBalance({ address }: { address: Address }) {
  const { data, isLoading } = useAccountGetBalance({ address })
  const balance = isLoading ? null : lamportsToSol(data?.value ?? 0n)

  return (
    <View>
      <Text style={appStyles.sectionLabel}>Balance</Text>
      <View style={[appStyles.row, { alignItems: 'baseline', gap: 6, marginTop: 6 }]}>
        <Text style={{ fontSize: 38, fontWeight: '800', color: colors.textPrimary }}>
          {isLoading ? '—' : balance?.toFixed(4)}
        </Text>
        <Text style={{ fontSize: 18, fontWeight: '600', color: colors.textSecondary }}>SOL</Text>
      </View>
    </View>
  )
}
