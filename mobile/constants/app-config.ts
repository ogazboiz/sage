import { AppIdentity, createSolanaDevnet, SolanaCluster } from '@wallet-ui/react-native-kit'

export class AppConfig {
  static identity: AppIdentity = {
    name: 'sage',
    uri: 'https://sage.app',
    icon: 'favicon.ico',
  }
  // Sage's program is deployed to devnet only — declaring just devnet
  // avoids wallet "incorrect mode" warnings when the user only has
  // devnet permission enabled in the wallet.
  static networks: SolanaCluster[] = [
    createSolanaDevnet({
      url: process.env.EXPO_PUBLIC_SOLANA_RPC ?? 'https://api.devnet.solana.com',
    }),
  ]
}
