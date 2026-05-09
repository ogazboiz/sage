import { TouchableOpacity, Text } from 'react-native'
import React from 'react'
import { useMobileWallet } from '@wallet-ui/react-native-kit'
import { appStyles } from '@/constants/app-styles'

export function AccountFeatureDisconnect() {
  const { account, disconnect } = useMobileWallet()

  return (
    <TouchableOpacity
      style={[appStyles.btnDanger, !account && { opacity: 0.4 }]}
      onPress={disconnect}
      disabled={!account}
      activeOpacity={0.8}
    >
      <Text style={appStyles.btnDangerText}>Disconnect</Text>
    </TouchableOpacity>
  )
}
