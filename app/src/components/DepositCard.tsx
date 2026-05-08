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
    <div className="card p-6 space-y-4">
      <div className="flex items-baseline justify-between">
        <h3 className="text-base font-semibold text-sage-text">Deposit</h3>
        <p className="label-mono">Move USDC into vault</p>
      </div>

      <div className="grid grid-cols-2 gap-3 text-[11px] font-mono">
        <div className="border border-dashed border-sage-border-soft rounded p-2">
          <p className="label-mono mb-1">Wallet</p>
          <p className="num-mono text-sage-text text-base font-semibold">
            {ownerBalance.data?.toFixed(2) ?? "—"}
          </p>
        </div>
        <div className="border border-dashed border-sage-border-soft rounded p-2">
          <p className="label-mono mb-1">Vault</p>
          <p className="num-mono text-sage-text text-base font-semibold">
            {vaultBalance.data?.toFixed(2) ?? "—"}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <input
          type="number"
          step="0.01"
          min="0"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="flex-1 rounded-md border border-sage-border bg-white px-3 py-2 text-sage-text outline-none focus:border-sage-accent"
        />
        <span className="label-mono">SAGE-USDC</span>
        <button
          type="button"
          disabled={!canSubmit}
          onClick={() => deposit.mutate(parsed)}
          className="btn btn-primary"
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
        <p className="text-xs text-sage-accent break-all">
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
