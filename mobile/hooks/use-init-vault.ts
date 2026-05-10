import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useMobileWallet } from '@wallet-ui/react-native-kit'
import { buildInitVaultIx } from '@/lib/sage/instructions'
import { loadOrCreateAgentSigner } from '@/lib/agent-identity'

export function useInitVault() {
  const { account, sendTransaction, chain } = useMobileWallet()
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      if (!account) throw new Error('Wallet not connected')

      // Load (or create) the persistent agent keypair before init. Its
      // pubkey is baked into vault.agent_keypair on-chain and is the
      // only signer the program will accept for release_step +
      // complete_task on this vault. This is what makes the autonomous
      // loop silent (no MWA prompt per iteration).
      const agent = await loadOrCreateAgentSigner()

      const ix = await buildInitVaultIx(account.address, agent.address)
      return sendTransaction([ix])
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['vault-account', chain, account?.address] })
      qc.invalidateQueries({ queryKey: ['vault-usdc',   chain, account?.address] })
    },
  })
}
