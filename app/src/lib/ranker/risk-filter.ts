import type {
  CautionReason,
  EarnVault,
  RiskTier,
} from "@/lib/lifi/types";

const HIGH_RISK_APY = 250;
const HIGH_RISK_TVL = 2_000_000;

function safeApy(vault: EarnVault): number {
  return vault.analytics.apy.total ?? 0;
}

function safeReward(vault: EarnVault): number {
  return vault.analytics.apy.reward ?? 0;
}

function safeTvl(vault: EarnVault): number {
  const raw = vault.analytics.tvl.usd;
  const n = typeof raw === "string" ? parseFloat(raw) : raw;
  return Number.isFinite(n) ? n : 0;
}

export function getCautionReasons(vault: EarnVault): CautionReason[] {
  const reasons: CautionReason[] = [];
  const total = safeApy(vault);
  const reward = safeReward(vault);

  if (total > 0 && reward / total > 0.6) {
    reasons.push("reward-heavy");
  }

  const apy1d = vault.analytics.apy1d ?? total;
  const apy7d = vault.analytics.apy7d ?? total;
  const apy30d = vault.analytics.apy30d ?? total;

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

  if (safeTvl(vault) < 250_000) {
    reasons.push("micro-tvl");
  }

  return reasons;
}

export function classifyRisk(vault: EarnVault): RiskTier {
  const apy = safeApy(vault);
  const tvl = safeTvl(vault);
  if (apy > HIGH_RISK_APY && tvl < HIGH_RISK_TVL) {
    return "high-risk";
  }
  if (getCautionReasons(vault).length > 0) {
    return "caution";
  }
  return "ok";
}
