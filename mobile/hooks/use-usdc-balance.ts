import { useQuery } from '@tanstack/react-query'
import { useMobileWallet } from '@wallet-ui/react-native-kit'
import { Address } from '@solana/kit'
import { getOwnerUsdc, getVaultPda, getVaultUsdc } from '@/lib/sage/pdas'

type RpcClient = ReturnType<typeof useMobileWallet>['client']

async function fetchUsdcBalance(client: RpcClient, ata: Address): Promise<number | null> {
  try {
    const res = await client.rpc.getTokenAccountBalance(ata).send()
    return res.value.uiAmount ?? null
  } catch {
    return null
  }
}

export function useOwnerUsdcBalance() {
  const { account, client, chain } = useMobileWallet()
  return useQuery<number | null>({
    queryKey: ['owner-usdc', chain, account?.address],
    enabled: !!account,
    refetchInterval: 12_000,
    queryFn: async () => {
      if (!account) return null
      const ata = await getOwnerUsdc(account.address)
      return fetchUsdcBalance(client, ata)
    },
  })
}

export function useVaultUsdcBalance() {
  const { account, client, chain } = useMobileWallet()
  return useQuery<number | null>({
    queryKey: ['vault-usdc', chain, account?.address],
    enabled: !!account,
    refetchInterval: 12_000,
    queryFn: async () => {
      if (!account) return null
      const [vaultPda] = await getVaultPda(account.address)
      const ata = await getVaultUsdc(vaultPda)
      return fetchUsdcBalance(client, ata)
    },
  })
}
