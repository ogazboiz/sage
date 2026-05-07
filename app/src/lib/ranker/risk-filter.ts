import type { CautionReason, EarnVault, RiskTier } from "@/lib/lifi/types";

const HIGH_RISK_APY = 250;
const HIGH_RISK_TVL = 2_000_000;

export function getCautionReasons(vault: EarnVault): CautionReason[] {
  const reasons: CautionReason[] = [];
  const { apy, tvl } = vault.analytics;

  if (apy.total > 0 && apy.reward / apy.total > 0.6) {
    reasons.push("reward-heavy");
  }

  const apy1d = vault.analytics.apyHistory?.d1 ?? apy.total;
  const apy7d = vault.analytics.apyHistory?.d7 ?? apy.total;
  const apy30d = vault.analytics.apyHistory?.d30 ?? apy.total;

  if (apy30d > 0 && apy1d > apy30d * 3) {
    reasons.push("apy-spike");
  }

  if (
    apy30d > apy7d &&
    apy7d > apy1d &&
    apy1d < apy30d * 0.5 &&
    apy30d > 0
  ) {
    reasons.push("declining-yield");
  }

  if (tvl.usd < 250_000) {
    reasons.push("micro-tvl");
  }

  return reasons;
}

export function classifyRisk(vault: EarnVault): RiskTier {
  const apy = vault.analytics.apy.total;
  const tvl = vault.analytics.tvl.usd;
  if (apy > HIGH_RISK_APY && tvl < HIGH_RISK_TVL) {
    return "high-risk";
  }
  if (getCautionReasons(vault).length > 0) {
    return "caution";
  }
  return "ok";
}
