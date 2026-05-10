import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useMobileWallet } from '@wallet-ui/react-native-kit'
import { buildCancelTaskIx } from '@/lib/sage/instructions'

// Owner-side recovery — clears a stale active_task slot on the vault.
// Used when the agent crashed before calling complete_task and a new
// approve_task fails with TaskActive (Anchor 6000).
export function useCancelTask() {
  const { account, sendTransaction, chain } = useMobileWallet()
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      if (!account) throw new Error('Wallet not connected')
      const ix = await buildCancelTaskIx(account.address)
      return sendTransaction([ix])
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['vault-account', chain, account?.address] })
      qc.invalidateQueries({ queryKey: ['vault-usdc', chain, account?.address] })
    },
  })
}
