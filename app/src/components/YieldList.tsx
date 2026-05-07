import { useState } from "react";

import { useSolanaVaults } from "@/hooks/useSolanaVaults";
import type { Objective } from "@/lib/ranker";
import { VaultCard } from "./VaultCard";

const TARGET_OPTIONS = [
  { label: "All", value: null },
  { label: "USDC", value: "USDC" },
  { label: "USDT", value: "USDT" },
  { label: "SOL", value: "SOL" },
];

const OBJECTIVE_OPTIONS: { label: string; value: Objective }[] = [
  { label: "Balanced", value: "balanced" },
  { label: "Safest", value: "safest" },
  { label: "Highest", value: "highest" },
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
    <section className="space-y-4">
      <div className="flex items-baseline justify-between">
        <h2 className="text-xl font-semibold text-sage-text">
          Solana yield
        </h2>
        <p className="text-xs text-sage-text-dim">
          Live from LI.FI Earn
        </p>
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex gap-1.5 rounded-full border border-sage-border p-1">
          {TARGET_OPTIONS.map((opt) => (
            <button
              key={opt.label}
              type="button"
              onClick={() => setTargetSymbol(opt.value)}
              className={`px-3 py-1 rounded-full text-xs ${
                targetSymbol === opt.value
                  ? "bg-sage-accent text-white"
                  : "text-sage-text-dim hover:text-sage-text"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <div className="flex gap-1.5 rounded-full border border-sage-border p-1">
          {OBJECTIVE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setObjective(opt.value)}
              className={`px-3 py-1 rounded-full text-xs ${
                objective === opt.value
                  ? "bg-sage-accent text-white"
                  : "text-sage-text-dim hover:text-sage-text"
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
          Include caution-flagged vaults
        </label>
      </div>

      {query.isLoading && (
        <p className="text-sage-text-dim">Walking the vault universe…</p>
      )}

      {query.isError && (
        <p className="text-sage-danger">
          Couldn't reach LI.FI Earn:{" "}
          {(query.error as Error)?.message ?? "unknown error"}
        </p>
      )}

      {query.data && (
        <>
          <p className="text-xs text-sage-text-dim">
            {query.data.ranked.length} ranked / {query.data.all.length} on Solana
          </p>
          <div className="space-y-3">
            {query.data.ranked.map((vault) => (
              <VaultCard key={vault.slug} vault={vault} />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
