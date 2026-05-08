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

function tvlNumber(v: EarnVault): number {
  const raw = v.analytics.tvl.usd;
  const n = typeof raw === "string" ? parseFloat(raw) : raw;
  return Number.isFinite(n) ? n : 0;
}

function apyNumber(v: EarnVault): number {
  return v.analytics.apy.total ?? 0;
}

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
      const ok = v.underlyingTokens.some((u) =>
        symbolMatches(intent.targetSymbol!, u.symbol),
      );
      if (!ok) continue;
    }
    const apy = apyNumber(v);
    const tvl = tvlNumber(v);
    if (intent.minApy != null && apy < intent.minApy) continue;
    if (intent.maxApy != null && apy > intent.maxApy) continue;
    if (intent.minTvlUsd != null && tvl < intent.minTvlUsd) continue;
    if (
      intent.includeProtocols?.length &&
      !intent.includeProtocols.includes(v.protocol.name)
    )
      continue;
    if (
      intent.excludeProtocols?.length &&
      intent.excludeProtocols.includes(v.protocol.name)
    )
      continue;
    if (v.isTransactional === false) continue;

    const tier = classifyRisk(v);
    if (!allowed.includes(tier)) continue;

    filtered.push({
      ...v,
      riskTier: tier,
      cautions: getCautionReasons(v),
      apyTotal: apy,
      tvlUsd: tvl,
    });
  }

  const objective = intent.objective ?? "balanced";
  filtered.sort((a, b) => {
    if (objective === "safest") {
      return b.tvlUsd - a.tvlUsd;
    }
    if (objective === "highest") {
      return b.apyTotal - a.apyTotal;
    }
    const maxApy = Math.max(...filtered.map((v) => v.apyTotal), 1);
    const maxTvl = Math.max(...filtered.map((v) => v.tvlUsd), 1);
    const score = (v: RankedVault) =>
      0.55 * (v.apyTotal / maxApy) + 0.45 * (v.tvlUsd / maxTvl);
    return score(b) - score(a);
  });

  const limit = intent.resultCount ?? DEFAULT_RESULTS;
  if (intent.targetSymbol) {
    return filtered.slice(0, limit);
  }
  const counts = new Map<string, number>();
  const out: RankedVault[] = [];
  for (const v of filtered) {
    const used = counts.get(v.protocol.name) ?? 0;
    if (used >= PROTOCOL_DIVERSITY_CAP) continue;
    counts.set(v.protocol.name, used + 1);
    out.push(v);
    if (out.length >= limit) break;
  }
  return out;
}
