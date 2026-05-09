import React from 'react'
import { Text, View } from 'react-native'
import { ellipsify } from '@/utils/ellipsify'
import { useNetworkGetGenesisHash } from './use-network-get-genesis-hash'
import { appStyles, colors } from '@/constants/app-styles'

export function NetworkFeatureGetGenesisHash() {
  const { data, isLoading } = useNetworkGetGenesisHash()
  return (
    <View style={appStyles.spaceBetween}>
      <Text style={[appStyles.subtitle, { fontSize: 13 }]}>Genesis Hash</Text>
      <Text style={[appStyles.mono, { color: colors.textSecondary }]}>
        {isLoading ? '—' : ellipsify(data, 6)}
      </Text>
    </View>
  )
}
