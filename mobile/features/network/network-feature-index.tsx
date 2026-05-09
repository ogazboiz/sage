import React from 'react'
import { Text, View } from 'react-native'
import { NetworkFeatureGetVersion } from './network-feature-get-version'
import { NetworkFeatureGetGenesisHash } from './network-feature-get-genesis-hash'
import { NetworkUiSelect } from './network-ui-select'
import { useNetwork } from './use-network'
import { appStyles } from '@/constants/app-styles'

export function NetworkFeatureIndex() {
  const { selectedNetwork, networks, setSelectedNetwork } = useNetwork()
  return (
    <View style={appStyles.section}>
      <Text style={appStyles.sectionLabel}>Network</Text>
      <View style={appStyles.card}>
        <NetworkUiSelect
          networks={networks}
          selectedNetwork={selectedNetwork}
          setSelectedNetwork={setSelectedNetwork}
        />
        <View style={[appStyles.divider, { marginVertical: 16 }]} />
        <View style={{ gap: 14 }}>
          <NetworkFeatureGetVersion />
          <NetworkFeatureGetGenesisHash />
        </View>
      </View>
    </View>
  )
}
