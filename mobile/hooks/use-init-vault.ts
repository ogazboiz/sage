import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useMobileWallet } from '@wallet-ui/react-native-kit'
import { buildInitVaultIx } from '@/lib/sage/instructions'

export function useInitVault() {
  const { account, sendTransaction, chain } = useMobileWallet()
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      if (!account) throw new Error('Wallet not connected')
      const ix = await buildInitVaultIx(account.address)
      return sendTransaction([ix])
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['vault-account', chain, account?.address] })
      qc.invalidateQueries({ queryKey: ['vault-usdc',   chain, account?.address] })
    },
  })
}
