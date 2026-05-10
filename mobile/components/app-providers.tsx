import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { PropsWithChildren } from 'react'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { ConversationProvider } from '@elevenlabs/react-native'
import { NetworkProvider } from '@/features/network/network-provider'
import { MobileWalletProvider } from '@wallet-ui/react-native-kit'
import { AppConfig } from '@/constants/app-config'

const queryClient = new QueryClient()

// Per the official docs, ConversationProvider takes no required props —
// agentId is passed only at startSession() time. We pass none here.
export function AppProviders({ children }: PropsWithChildren) {
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <NetworkProvider
          networks={AppConfig.networks}
          render={({ selectedNetwork }) => (
            <MobileWalletProvider cluster={selectedNetwork} identity={AppConfig.identity}>
              <ConversationProvider>
                {children}
              </ConversationProvider>
            </MobileWalletProvider>
          )}
        />
      </QueryClientProvider>
    </SafeAreaProvider>
  )
}
