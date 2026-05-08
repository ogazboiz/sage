// Subset of the LI.FI Earn API response shape we actually use.
// See https://earn.li.fi/v1/vaults

export interface EarnApy {
  base: number | null;
  reward: number | null;
  total: number | null;
}

export interface EarnTvl {
  // API returns a string. We normalise to number in the ranker.
  usd: string;
}

export interface EarnAnalytics {
  apy: EarnApy;
  apy1d?: number | null;
  apy7d?: number | null;
  apy30d?: number | null;
  tvl: EarnTvl;
}

export interface EarnUnderlyingToken {
  symbol: string;
  address: string;
  decimals: number;
}

export interface EarnProtocol {
  name: string;
  url?: string;
}

export interface EarnVault {
  slug: string;
  name: string;
  chainId: number;
  network: string;
  address: string;
  tags?: string[];
  protocol: EarnProtocol;
  underlyingTokens: EarnUnderlyingToken[];
  analytics: EarnAnalytics;
  isTransactional?: boolean;
  isRedeemable?: boolean;
}

export interface EarnVaultsResponse {
  data: EarnVault[];
  nextCursor?: string;
  total?: number;
}

export type CautionReason =
  | "reward-heavy"
  | "apy-spike"
  | "declining-yield"
  | "micro-tvl";

export type RiskTier = "ok" | "caution" | "high-risk";

export interface RankedVault extends EarnVault {
  riskTier: RiskTier;
  cautions: CautionReason[];
  apyTotal: number;
  tvlUsd: number;
}
