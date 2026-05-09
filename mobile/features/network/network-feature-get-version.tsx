import React from 'react'
import { Text, View } from 'react-native'
import { useNetworkGetVersion } from './use-network-get-version'
import { appStyles, colors } from '@/constants/app-styles'

export function NetworkFeatureGetVersion() {
  const { data, isLoading } = useNetworkGetVersion()
  return (
    <View style={appStyles.spaceBetween}>
      <Text style={[appStyles.subtitle, { fontSize: 13 }]}>Version</Text>
      <Text style={[appStyles.mono, { color: colors.textSecondary }]}>
        {isLoading ? '—' : data?.core ?? '—'}
      </Text>
    </View>
  )
}
