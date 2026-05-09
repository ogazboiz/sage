import React from 'react'
import { TouchableOpacity, Text, View } from 'react-native'
import { SolanaCluster } from '@wallet-ui/react-native-kit'
import { appStyles } from '@/constants/app-styles'

export function NetworkUiSelect({
  networks,
  selectedNetwork,
  setSelectedNetwork,
}: {
  networks: SolanaCluster[]
  selectedNetwork: SolanaCluster
  setSelectedNetwork: (network: SolanaCluster) => void
}) {
  return (
    <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
      {networks.map((network) => {
        const isActive = selectedNetwork.id === network.id
        return (
          <TouchableOpacity
            key={network.id}
            style={[appStyles.pill, isActive && appStyles.pillActive]}
            onPress={() => setSelectedNetwork(network)}
            disabled={isActive}
            activeOpacity={0.7}
          >
            <Text style={[appStyles.pillText, isActive && appStyles.pillActiveText]}>
              {network.label}
            </Text>
          </TouchableOpacity>
        )
      })}
    </View>
  )
}
