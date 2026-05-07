import { useState } from "react";

import { useDeposit } from "@/hooks/useDeposit";
import {
  useOwnerUsdcBalance,
  useVaultUsdcBalance,
} from "@/hooks/useTokenBalances";

export function DepositCard() {
  const [amount, setAmount] = useState("0.10");
  const ownerBalance = useOwnerUsdcBalance();
  const vaultBalance = useVaultUsdcBalance();
  const deposit = useDeposit();

  const parsed = parseFloat(amount);
  const canSubmit =
    Number.isFinite(parsed) &&
    parsed > 0 &&
    !deposit.isPending &&
    (ownerBalance.data ?? 0) >= parsed;

  return (
    <div className="rounded-2xl border border-sage-border bg-sage-surface p-6 space-y-4">
      <div className="flex items-baseline justify-between">
        <h3 className="text-lg font-semibold text-sage-text">Deposit</h3>
        <p className="text-xs text-sage-text-dim">
          Wallet:{" "}
          <span className="text-sage-text">
            {ownerBalance.data?.toFixed(2) ?? "—"}
          </span>{" "}
          · Vault:{" "}
          <span className="text-sage-text">
            {vaultBalance.data?.toFixed(2) ?? "—"}
          </span>
        </p>
      </div>

      <div className="flex items-center gap-3">
        <input
          type="number"
          step="0.01"
          min="0"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="w-32 rounded-md border border-sage-border bg-sage-bg px-3 py-2 text-sage-text outline-none focus:border-sage-accent"
        />
        <span className="text-sm text-sage-text-dim">SAGE-USDC</span>
        <button
          type="button"
          disabled={!canSubmit}
          onClick={() => deposit.mutate(parsed)}
          className="rounded-md bg-sage-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {deposit.isPending ? "Sending…" : "Deposit"}
        </button>
      </div>

      {deposit.isError && (
        <p className="text-xs text-sage-danger break-all">
          {(deposit.error as Error).message}
        </p>
      )}
      {deposit.isSuccess && (
        <p className="text-xs text-sage-success break-all">
          Deposited.{" "}
          <a
            href={`https://solscan.io/tx/${deposit.data}?cluster=devnet`}
            target="_blank"
            rel="noreferrer"
            className="underline"
          >
            view tx
          </a>
        </p>
      )}
    </div>
  );
}
