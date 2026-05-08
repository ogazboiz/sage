import type { CautionReason, RankedVault } from "@/lib/lifi";

const CAUTION_LABEL: Record<CautionReason, string> = {
  "reward-heavy": "reward-heavy",
  "apy-spike": "apy spike",
  "declining-yield": "declining yield",
  "micro-tvl": "micro tvl",
};

function pct(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "—";
  return `${n.toFixed(2)}%`;
}

function compactUsd(n: number): string {
  if (!Number.isFinite(n)) return "—";
  if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(2)}B`;
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toFixed(0)}`;
}

export function VaultCard({
  vault,
  rank,
}: {
  vault: RankedVault;
  rank?: number;
}) {
  const symbols = vault.underlyingTokens.map((u) => u.symbol).join(" / ");

  const riskPillClass =
    vault.riskTier === "high-risk"
      ? "pill-danger"
      : vault.riskTier === "caution"
        ? "pill-warning"
        : "pill-accent";

  const riskLabel =
    vault.riskTier === "high-risk"
      ? "high risk"
      : vault.riskTier === "caution"
        ? "caution"
        : "safe";

  return (
    <div className="card bg-white p-4 flex items-center gap-4">
      {rank != null && (
        <div className="w-9 h-9 shrink-0 rounded-full border border-sage-border flex items-center justify-center font-mono font-bold text-sm">
          {rank}
        </div>
      )}
      <div className="w-10 h-10 shrink-0 rounded-md border border-sage-border-soft bg-sage-surface-soft" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-semibold text-sage-text">
            {vault.protocol.name}
          </span>
          <span className="label-mono">{vault.network}</span>
          <span className={`pill ${riskPillClass}`}>{riskLabel}</span>
        </div>
        <p className="label-mono mt-1">
          {symbols} · TVL {compactUsd(vault.tvlUsd)} · base {pct(vault.analytics.apy.base)}{" "}
          · reward {pct(vault.analytics.apy.reward)}
        </p>
        {vault.cautions.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {vault.cautions.map((reason) => (
              <span key={reason} className="pill pill-warning">
                {CAUTION_LABEL[reason]}
              </span>
            ))}
          </div>
        )}
      </div>
      <div className="text-right shrink-0">
        <p className="num-mono text-2xl font-bold text-sage-text leading-none">
          {pct(vault.apyTotal)}
        </p>
        <p className="label-mono mt-1">APY</p>
      </div>
    </div>
  );
}
