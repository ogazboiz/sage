import { useState } from "react";

import { useSolanaVaults } from "@/hooks/useSolanaVaults";
import { useDeployYield } from "@/hooks/useDeployYield";
import { useVaultUsdcBalance } from "@/hooks/useTokenBalances";
import type { Objective } from "@/lib/ranker";
import type { RankedVault } from "@/lib/lifi";
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
  const [target, setTarget] = useState<RankedVault | null>(null);
  const [amount, setAmount] = useState("1");

  const query = useSolanaVaults({
    targetSymbol,
    objective,
    includeCaution,
    resultCount: 8,
  });

  const vaultBalance = useVaultUsdcBalance();
  const deploy = useDeployYield();

  const idleBalance = vaultBalance.data ?? 0;
  const parsedAmount = parseFloat(amount);
  const validAmount =
    Number.isFinite(parsedAmount) &&
    parsedAmount > 0 &&
    parsedAmount <= idleBalance;

  function openDeploy(vault: RankedVault) {
    setTarget(vault);
    setAmount(Math.min(idleBalance, 10).toFixed(2));
    deploy.reset();
  }

  async function confirmDeploy() {
    if (!target || !validAmount) return;
    try {
      await deploy.mutateAsync({
        slug: target.slug,
        protocol: target.protocol.name,
        network: target.network,
        amount: parsedAmount,
        apy: target.apyTotal,
      });
      setTarget(null);
    } catch {
      /* error surfaces via deploy.error */
    }
  }

  return (
    <div className="card p-5 md:p-7 space-y-5">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-base font-semibold text-sage-text">Vaults</h3>
        <span className="pill">LI.FI Earn</span>
      </div>

      <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-dashed border-sage-border-soft">
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

      {target && (
        <div className="card bg-white p-4 space-y-3 border-sage-accent!">
          <div className="flex items-baseline justify-between gap-2">
            <p className="text-sm font-semibold text-sage-text">
              Deploy to {target.protocol.name}
            </p>
            <span className="label-mono">{target.network}</span>
          </div>
          <div className="flex items-baseline gap-2">
            <input
              type="number"
              step="0.01"
              min="0"
              max={idleBalance}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="num-mono text-[24px] font-bold text-sage-text bg-transparent border-none outline-none w-32"
            />
            <span className="num-mono text-sage-text-dim text-sm">USDC</span>
            <span className="flex-1" />
            <span className="label-mono">
              vault has ${idleBalance.toFixed(2)}
            </span>
          </div>
          <p className="text-[11px] text-sage-text-dim leading-relaxed">
            Releases USDC from your Sage vault to your wallet, tagged
            <span className="font-mono"> sage-yield:{target.slug}</span> in
            the on-chain memo. The position is tracked locally so the vault
            shows idle vs deployed.
          </p>
          {deploy.isError && (
            <p className="text-xs text-sage-danger break-all">
              {(deploy.error as Error).message}
            </p>
          )}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setTarget(null)}
              disabled={deploy.isPending}
              className="btn flex-1"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={confirmDeploy}
              disabled={!validAmount || deploy.isPending}
              className="btn btn-primary flex-1"
            >
              {deploy.isPending ? "Signing…" : "Confirm deploy"}
            </button>
          </div>
        </div>
      )}

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
            <VaultCard
              key={vault.slug}
              vault={vault}
              rank={i + 1}
              onDeploy={() => openDeploy(vault)}
              deployLabel="Deploy"
              deployDisabled={idleBalance <= 0}
            />
          ))}
        </div>
      )}
    </div>
  );
}
