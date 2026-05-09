import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useMobileWallet } from '@wallet-ui/react-native-kit'
import { buildCreateAtaIx, buildDepositIx } from '@/lib/sage/instructions'

export function useDeposit() {
  const { account, sendTransactions, chain } = useMobileWallet()
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async (amountUsdc: number) => {
      if (!account) throw new Error('Wallet not connected')
      if (!Number.isFinite(amountUsdc) || amountUsdc <= 0) throw new Error('Invalid amount')

      // Idempotently create owner USDC ATA, then deposit
      const createAta = await buildCreateAtaIx(account.address)
      const deposit   = await buildDepositIx(account.address, amountUsdc)

      // sendTransactions sends each array as a separate transaction
      return sendTransactions([createAta, deposit])
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['vault-account', chain, account?.address] })
      qc.invalidateQueries({ queryKey: ['vault-usdc',   chain, account?.address] })
      qc.invalidateQueries({ queryKey: ['owner-usdc',   chain, account?.address] })
    },
  })
}
