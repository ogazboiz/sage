import { useState } from "react";

import { useSolanaVaults } from "@/hooks/useSolanaVaults";
import type { Objective } from "@/lib/ranker";
import { VaultCard } from "./VaultCard";

const TARGET_OPTIONS: { label: string; value: string | null }[] = [
  { label: "All", value: null },
  { label: "USDC", value: "USDC" },
  { label: "USDT", value: "USDT" },
  { label: "SOL", value: "SOL" },
];

const OBJECTIVE_OPTIONS: { label: string; value: Objective }[] = [
  { label: "Safest", value: "safest" },
  { label: "Highest APY", value: "highest" },
  { label: "Balanced", value: "balanced" },
];

export function YieldList() {
  const [targetSymbol, setTargetSymbol] = useState<string | null>("USDC");
  const [objective, setObjective] = useState<Objective>("safest");
  const [includeCaution, setIncludeCaution] = useState(false);

  const query = useSolanaVaults({
    targetSymbol,
    objective,
    includeCaution,
    resultCount: 8,
  });

  return (
    <div className="card p-5 md:p-7 space-y-5">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-base font-semibold text-sage-text">Vaults</h3>
        <span className="pill">LI.FI Earn</span>
      </div>

      <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-dashed border-sage-border-soft">
        {/* Objective tabs (segmented) */}
        <div className="flex border border-sage-border rounded-md overflow-hidden">
          {OBJECTIVE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setObjective(opt.value)}
              className={`px-3 py-1.5 text-xs ${
                objective === opt.value
                  ? "bg-sage-text text-white"
                  : "bg-white text-sage-text hover:bg-sage-surface-soft"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Symbol pills */}
        <div className="flex gap-1.5">
          {TARGET_OPTIONS.map((opt) => (
            <button
              key={opt.label}
              type="button"
              onClick={() => setTargetSymbol(opt.value)}
              className={`pill ${
                targetSymbol === opt.value ? "pill-accent" : ""
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <label className="flex items-center gap-2 text-xs text-sage-text-dim">
          <input
            type="checkbox"
            checked={includeCaution}
            onChange={(e) => setIncludeCaution(e.target.checked)}
            className="accent-sage-accent"
          />
          Include caution-flagged
        </label>

        <div className="flex-1" />
        {query.data && (
          <p className="label-mono">
            {query.data.ranked.length} ranked / {query.data.all.length} total
          </p>
        )}
      </div>

      {query.isLoading && (
        <p className="text-sm text-sage-text-dim py-8 text-center">
          Walking the vault universe…
        </p>
      )}

      {query.isError && (
        <p className="text-sm text-sage-danger py-4">
          Couldn't reach LI.FI Earn:{" "}
          {(query.error as Error)?.message ?? "unknown error"}
        </p>
      )}

      {query.data && (
        <div className="space-y-3">
          {query.data.ranked.map((vault, i) => (
            <VaultCard key={vault.slug} vault={vault} rank={i + 1} />
          ))}
        </div>
      )}
    </div>
  );
}
