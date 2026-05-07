import type { EarnVault, RankedVault, RiskTier } from "@/lib/lifi/types";
import { symbolMatches } from "./aliases";
import { classifyRisk, getCautionReasons } from "./risk-filter";

export type Objective = "safest" | "highest" | "balanced";

export interface RankIntent {
  targetSymbol?: string | null;
  targetChainId?: number | null;
  objective?: Objective;
  minApy?: number | null;
  maxApy?: number | null;
  minTvlUsd?: number | null;
  includeProtocols?: string[];
  excludeProtocols?: string[];
  resultCount?: number | null;
  includeCaution?: boolean;
  includeHighRisk?: boolean;
}

const DEFAULT_RESULTS = 8;
const PROTOCOL_DIVERSITY_CAP = 3;

const ALLOWED: Record<RiskTier, RiskTier[]> = {
  ok: ["ok"],
  caution: ["ok", "caution"],
  "high-risk": ["ok", "caution", "high-risk"],
};

export function rankVaultsForIntent(
  vaults: EarnVault[],
  intent: RankIntent,
): RankedVault[] {
  const allowed: RiskTier[] = intent.includeHighRisk
    ? ALLOWED["high-risk"]
    : intent.includeCaution
      ? ALLOWED.caution
      : ALLOWED.ok;

  const filtered: RankedVault[] = [];
  for (const v of vaults) {
    if (intent.targetChainId && v.chainId !== intent.targetChainId) continue;
    if (intent.targetSymbol) {
      const ok = v.underlying.some((u) =>
        symbolMatches(intent.targetSymbol!, u.symbol),
      );
      if (!ok) continue;
    }
    if (intent.minApy != null && v.analytics.apy.total < intent.minApy) continue;
    if (intent.maxApy != null && v.analytics.apy.total > intent.maxApy) continue;
    if (intent.minTvlUsd != null && v.analytics.tvl.usd < intent.minTvlUsd)
      continue;
    if (
      intent.includeProtocols?.length &&
      !intent.includeProtocols.includes(v.protocol)
    )
      continue;
    if (intent.excludeProtocols?.length && intent.excludeProtocols.includes(v.protocol))
      continue;
    if (v.isTransactional === false) continue;

    const tier = classifyRisk(v);
    if (!allowed.includes(tier)) continue;

    filtered.push({
      ...v,
      riskTier: tier,
      cautions: getCautionReasons(v),
    });
  }

  const objective = intent.objective ?? "balanced";
  filtered.sort((a, b) => {
    if (objective === "safest") {
      return b.analytics.tvl.usd - a.analytics.tvl.usd;
    }
    if (objective === "highest") {
      return b.analytics.apy.total - a.analytics.apy.total;
    }
    // balanced: 55% APY weight, 45% TVL weight, normalised against max
    const maxApy = Math.max(...filtered.map((v) => v.analytics.apy.total), 1);
    const maxTvl = Math.max(...filtered.map((v) => v.analytics.tvl.usd), 1);
    const score = (v: RankedVault) =>
      0.55 * (v.analytics.apy.total / maxApy) +
      0.45 * (v.analytics.tvl.usd / maxTvl);
    return score(b) - score(a);
  });

  // Protocol diversity cap when there's no specific symbol target,
  // otherwise the listing collapses to "10 Aave vaults".
  const limit = intent.resultCount ?? DEFAULT_RESULTS;
  if (intent.targetSymbol) {
    return filtered.slice(0, limit);
  }
  const counts = new Map<string, number>();
  const out: RankedVault[] = [];
  for (const v of filtered) {
    const used = counts.get(v.protocol) ?? 0;
    if (used >= PROTOCOL_DIVERSITY_CAP) continue;
    counts.set(v.protocol, used + 1);
    out.push(v);
    if (out.length >= limit) break;
  }
  return out;
}
