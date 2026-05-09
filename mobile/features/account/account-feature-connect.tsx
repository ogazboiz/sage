import { TouchableOpacity, Text } from 'react-native'
import React from 'react'
import { useMobileWallet } from '@wallet-ui/react-native-kit'
import { appStyles } from '@/constants/app-styles'

export function AccountFeatureConnect() {
  const { account, connect } = useMobileWallet()

  return (
    <TouchableOpacity
      style={[appStyles.btnPrimary, !!account && { opacity: 0.4 }]}
      onPress={connect}
      disabled={!!account}
      activeOpacity={0.8}
    >
      <Text style={appStyles.btnPrimaryText}>Connect Wallet</Text>
    </TouchableOpacity>
  )
}
