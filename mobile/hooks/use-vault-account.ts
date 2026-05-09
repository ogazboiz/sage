import { useQuery } from '@tanstack/react-query'
import { useMobileWallet } from '@wallet-ui/react-native-kit'
import { getVaultPda } from '@/lib/sage/pdas'
import { decodeVaultAccount, VaultState } from '@/lib/sage/vault'

const EMPTY: VaultState = { exists: false, totalDeposited: 0, totalSpent: 0, activeTask: null }

export function useVaultAccount() {
  const { account, client, chain } = useMobileWallet()

  return useQuery<VaultState>({
    queryKey: ['vault-account', chain, account?.address],
    enabled: !!account,
    refetchInterval: 12_000,
    queryFn: async () => {
      if (!account) return EMPTY
      const [vaultPda] = await getVaultPda(account.address)

      const res = await client.rpc
        .getAccountInfo(vaultPda, { encoding: 'base64' })
        .send()

      if (!res.value) return EMPTY

      // data is [base64string, encoding] when encoding='base64'
      const raw = res.value.data
      const b64 = Array.isArray(raw) ? (raw as [string, string])[0] : (raw as string)
      return decodeVaultAccount(b64)
    },
  })
}
