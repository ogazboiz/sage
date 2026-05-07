import type { EarnVault, EarnVaultsResponse } from "./types";

const EARN_PROXY = "/api/lifi-earn";

// Solana mainnet chain ID in LI.FI's registry. Earn data is mainnet-only;
// we discover real Solana vaults and use them as candidates regardless of
// where the AgentVault lives during dev.
export const LIFI_SOLANA_CHAIN_ID = 1151111081099710;

export interface FetchVaultsParams {
  cursor?: string;
  chainId?: number;
  sortBy?: "apy" | "tvl" | "balanced";
  minTvlUsd?: number;
  protocol?: string;
  symbol?: string;
  signal?: AbortSignal;
}

export async function fetchEarnVaults(
  params: FetchVaultsParams = {},
): Promise<EarnVaultsResponse> {
  const url = new URL(`${EARN_PROXY}/v1/earn/vaults`, window.location.origin);
  if (params.cursor) url.searchParams.set("cursor", params.cursor);
  if (params.chainId) url.searchParams.set("chainId", String(params.chainId));
  if (params.sortBy) url.searchParams.set("sortBy", params.sortBy);
  if (params.minTvlUsd) url.searchParams.set("minTvlUsd", String(params.minTvlUsd));
  if (params.protocol) url.searchParams.set("protocol", params.protocol);
  if (params.symbol) url.searchParams.set("symbol", params.symbol);

  const res = await fetch(url.toString(), {
    signal: params.signal ?? AbortSignal.timeout(15_000),
  });
  if (!res.ok) {
    throw new Error(`LI.FI Earn ${res.status}: ${await res.text()}`);
  }
  return res.json();
}

export async function fetchAllSolanaVaults(
  options: { signal?: AbortSignal; minTvlUsd?: number } = {},
): Promise<EarnVault[]> {
  const all: EarnVault[] = [];
  let cursor: string | undefined;
  // Cap the walk so a stuck cursor doesn't loop forever.
  for (let i = 0; i < 20; i++) {
    const page = await fetchEarnVaults({
      chainId: LIFI_SOLANA_CHAIN_ID,
      cursor,
      minTvlUsd: options.minTvlUsd,
      signal: options.signal,
    });
    all.push(...page.data);
    if (!page.nextCursor) break;
    cursor = page.nextCursor;
  }
  return all;
}
