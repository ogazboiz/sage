import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useWallet } from "@solana/wallet-adapter-react";

import { useSageProgram } from "@/hooks/useSageProgram";
import { useInitVault } from "@/hooks/useInitVault";
import {
  useOwnerUsdcBalance,
  useVaultUsdcBalance,
} from "@/hooks/useTokenBalances";
import {
  deriveUserVaultPda,
  fetchUserVault,
  PROGRAM_ID_STRING,
  SAGE_USDC_MINT,
} from "@/lib/sage-sdk";

function explorerUrl(addr: string): string {
  return `https://solscan.io/account/${addr}?cluster=devnet`;
}

function txUrl(sig: string): string {
  return `https://solscan.io/tx/${sig}?cluster=devnet`;
}

function shortAddr(addr: string): string {
  return `${addr.slice(0, 6)}…${addr.slice(-6)}`;
}

export function VaultPanel() {
  const { publicKey } = useWallet();
  const program = useSageProgram();

  const vaultPda = useMemo(() => {
    if (!publicKey) return null;
    return deriveUserVaultPda(publicKey)[0];
  }, [publicKey]);

  const vaultQuery = useQuery({
    queryKey: ["sage-vault", publicKey?.toBase58()],
    enabled: Boolean(program && publicKey),
    queryFn: async () => {
      if (!program || !publicKey) return null;
      return fetchUserVault(program, publicKey);
    },
  });

  const ownerBalance = useOwnerUsdcBalance();
  const vaultBalance = useVaultUsdcBalance();
  const initVault = useInitVault();

  if (!publicKey) {
    return (
      <div className="card p-10 text-center space-y-3">
        <p className="label-mono">Vault</p>
        <p className="text-sage-text-dim">
          Connect a wallet to spin up your Sage vault.
        </p>
      </div>
    );
  }

  const balanceUsd = vaultBalance.data ?? 0;
  const totalDeposited = vaultQuery.data
    ? Number(vaultQuery.data.totalDeposited.toString()) / 1_000_000
    : 0;
  const totalSpent = vaultQuery.data
    ? Number(vaultQuery.data.totalSpent.toString()) / 1_000_000
    : 0;
  const exists = Boolean(vaultQuery.data);

  return (
    <div className="card p-7 space-y-6">
      {/* Top: balance + status pills */}
      <div className="flex flex-wrap items-start justify-between gap-6">
        <div className="space-y-2">
          <p className="label-mono">Vault balance · SAGE-USDC</p>
          <p className="num-mono text-5xl font-bold text-sage-text">
            ${balanceUsd.toFixed(2)}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            {exists ? (
              <>
                <span className="pill">
                  ${totalDeposited.toFixed(2)} deposited
                </span>
                <span className="pill pill-accent">
                  ${(totalDeposited - totalSpent).toFixed(2)} idle
                </span>
                <span className="pill">${totalSpent.toFixed(2)} spent</span>
              </>
            ) : (
              <span className="pill pill-warning">No vault yet</span>
            )}
          </div>
        </div>

        <div className="text-right space-y-1">
          <p className="label-mono">Wallet</p>
          <p className="num-mono text-2xl font-semibold text-sage-text">
            {ownerBalance.data?.toFixed(2) ?? "—"}
          </p>
          <p className="text-[11px] font-mono text-sage-text-dim">SAGE-USDC</p>
        </div>
      </div>

      {/* Vault PDA + actions */}
      <div className="grid md:grid-cols-2 gap-4 pt-4 border-t border-dashed border-sage-border-soft">
        <div className="space-y-1">
          <p className="label-mono">Vault PDA</p>
          {vaultPda && (
            <a
              className="font-mono text-xs break-all text-sage-text hover:text-sage-accent"
              href={explorerUrl(vaultPda.toBase58())}
              target="_blank"
              rel="noreferrer"
            >
              {shortAddr(vaultPda.toBase58())}
            </a>
          )}
        </div>
        <div className="flex md:justify-end items-start gap-2">
          {!exists && (
            <button
              type="button"
              disabled={initVault.isPending}
              onClick={() => initVault.mutate()}
              className="btn btn-primary"
            >
              {initVault.isPending ? "Initialising…" : "Initialise vault"}
            </button>
          )}
          {exists && (
            <button
              type="button"
              onClick={() => vaultQuery.refetch()}
              className="btn btn-ghost text-xs text-sage-accent"
            >
              refresh
            </button>
          )}
        </div>
      </div>

      {/* Active task */}
      {vaultQuery.data?.activeTask && (
        <div className="card bg-white p-4 space-y-2 border-sage-accent!">
          <div className="flex items-center justify-between">
            <p className="label-mono">● Active task</p>
            <span className="pill pill-accent">running</span>
          </div>
          <p className="font-mono text-[11px] text-sage-text-dim break-all">
            task_id{" "}
            {Buffer.from(vaultQuery.data.activeTask.taskId)
              .toString("hex")
              .slice(0, 10)}
            …
          </p>
          <p className="text-sm text-sage-text">
            <span className="num-mono font-semibold">
              {(
                Number(
                  vaultQuery.data.activeTask.budgetRemaining.toString(),
                ) / 1_000_000
              ).toFixed(2)}
            </span>{" "}
            <span className="text-sage-text-dim">remaining ·</span>{" "}
            <span className="num-mono">
              {vaultQuery.data.activeTask.stepsExecuted}
            </span>{" "}
            <span className="text-sage-text-dim">steps</span>
          </p>
        </div>
      )}

      {/* Init success */}
      {initVault.isSuccess && (
        <p className="text-xs text-sage-accent break-all border-t border-dashed border-sage-border-soft pt-3">
          Vault initialised.{" "}
          <a
            href={txUrl(initVault.data.signature)}
            target="_blank"
            rel="noreferrer"
            className="underline"
          >
            view tx
          </a>
        </p>
      )}
      {initVault.isError && (
        <p className="text-xs text-sage-danger break-all border-t border-dashed border-sage-border-soft pt-3">
          {(initVault.error as Error).message}
        </p>
      )}

      {/* Footer addresses */}
      <div className="border-t border-dashed border-sage-border-soft pt-3 grid grid-cols-2 gap-2 text-[11px] font-mono">
        <div>
          <p className="text-sage-text-dim uppercase tracking-wider mb-1">
            Program
          </p>
          <a
            className="text-sage-text hover:text-sage-accent break-all"
            href={explorerUrl(PROGRAM_ID_STRING)}
            target="_blank"
            rel="noreferrer"
          >
            {shortAddr(PROGRAM_ID_STRING)}
          </a>
        </div>
        <div className="text-right">
          <p className="text-sage-text-dim uppercase tracking-wider mb-1">
            USDC mint
          </p>
          <a
            className="text-sage-text hover:text-sage-accent break-all"
            href={explorerUrl(SAGE_USDC_MINT.toBase58())}
            target="_blank"
            rel="noreferrer"
          >
            {shortAddr(SAGE_USDC_MINT.toBase58())}
          </a>
        </div>
      </div>
    </div>
  );
}
