import type { CautionReason, RankedVault } from "@/lib/lifi";

const CAUTION_LABEL: Record<CautionReason, string> = {
  "reward-heavy": "reward-heavy",
  "apy-spike": "apy spike",
  "declining-yield": "declining yield",
  "micro-tvl": "micro tvl",
};

function pct(n: number): string {
  if (!Number.isFinite(n)) return "—";
  return `${n.toFixed(2)}%`;
}

function compactUsd(n: number): string {
  if (!Number.isFinite(n)) return "—";
  if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(2)}B`;
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toFixed(0)}`;
}

export function VaultCard({ vault }: { vault: RankedVault }) {
  const apy = vault.analytics.apy;
  const tvl = vault.analytics.tvl;
  const symbols = vault.underlying.map((u) => u.symbol).join(" / ");

  const tierClass =
    vault.riskTier === "high-risk"
      ? "border-sage-danger/40 bg-sage-danger/5"
      : vault.riskTier === "caution"
        ? "border-sage-warning/40 bg-sage-warning/5"
        : "border-sage-border bg-sage-surface";

  return (
    <div
      className={`rounded-xl border p-5 space-y-3 ${tierClass}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-widest text-sage-text-dim">
            {vault.protocol}
          </p>
          <h3 className="text-lg font-semibold text-sage-text">
            {symbols}{" "}
            <span className="text-sage-text-dim font-normal">
              · {vault.name}
            </span>
          </h3>
        </div>
        <div className="text-right">
          <p className="text-xs uppercase tracking-widest text-sage-text-dim">
            APY
          </p>
          <p className="text-2xl font-bold text-sage-text">
            {pct(apy.total)}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 text-xs text-sage-text-dim">
        <span>
          Base{" "}
          <span className="text-sage-text">{pct(apy.base)}</span>
        </span>
        <span>
          Reward{" "}
          <span className="text-sage-text">{pct(apy.reward)}</span>
        </span>
        <span>
          TVL <span className="text-sage-text">{compactUsd(tvl.usd)}</span>
        </span>
      </div>

      {(vault.riskTier !== "ok" || vault.cautions.length > 0) && (
        <div className="flex flex-wrap gap-2">
          {vault.riskTier === "high-risk" && (
            <span className="rounded-full bg-sage-danger/15 px-2.5 py-0.5 text-xs text-sage-danger">
              high risk
            </span>
          )}
          {vault.cautions.map((reason) => (
            <span
              key={reason}
              className="rounded-full bg-sage-warning/15 px-2.5 py-0.5 text-xs text-sage-warning"
            >
              {CAUTION_LABEL[reason]}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
