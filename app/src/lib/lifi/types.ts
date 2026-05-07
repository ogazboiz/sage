// Subset of the LI.FI Earn API response shape we actually use.
// See https://docs.li.fi for the full schema.

export interface EarnApy {
  base: number;
  reward: number;
  total: number;
}

export interface EarnApyHistory {
  d1?: number;
  d7?: number;
  d30?: number;
}

export interface EarnTvl {
  usd: number;
}

export interface EarnAnalytics {
  apy: EarnApy;
  apyHistory?: EarnApyHistory;
  tvl: EarnTvl;
}

export interface EarnTokenRef {
  symbol: string;
  address: string;
  chainId: number;
  decimals: number;
}

export interface EarnVault {
  slug: string;
  name: string;
  protocol: string;
  chainId: number;
  underlying: EarnTokenRef[];
  analytics: EarnAnalytics;
  metadata?: Record<string, unknown>;
  isTransactional?: boolean;
}

export interface EarnVaultsResponse {
  data: EarnVault[];
  nextCursor?: string;
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
}
