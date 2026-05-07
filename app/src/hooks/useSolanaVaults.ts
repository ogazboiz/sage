import { useQuery } from "@tanstack/react-query";

import { fetchAllSolanaVaults } from "@/lib/lifi";
import { rankVaultsForIntent, type RankIntent } from "@/lib/ranker";

export function useSolanaVaults(intent: RankIntent) {
  return useQuery({
    queryKey: ["solana-vaults", JSON.stringify(intent)],
    queryFn: async ({ signal }) => {
      const all = await fetchAllSolanaVaults({ signal, minTvlUsd: 50_000 });
      const ranked = rankVaultsForIntent(all, intent);
      return { all, ranked };
    },
  });
}
