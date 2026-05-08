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
import type { ScreenContext } from "@/App";

function explorerUrl(addr: string): string {
  return `https://solscan.io/account/${addr}?cluster=devnet`;
}

function txUrl(sig: string): string {
  return `https://solscan.io/tx/${sig}?cluster=devnet`;
}

function shortAddr(addr: string, n = 4): string {
  return `${addr.slice(0, n)}…${addr.slice(-n)}`;
}

function TxRow({
  kind,
  amount,
  time,
  detail,
  href,
}: {
  kind: string;
  amount: string;
  time: string;
  detail?: string;
  href?: string;
}) {
  const inner = (
    <div className="grid grid-cols-[26px_1fr_auto] gap-3 items-center py-2.5 row-divider">
      <div className="w-[26px] h-[26px] rounded-full border border-sage-border-soft" />
      <div>
        <p className="text-[13px] font-medium text-sage-text leading-tight">
          {kind}
        </p>
        {detail && (
          <p className="text-[10px] text-sage-text-dim font-mono mt-0.5">
            {detail}
          </p>
        )}
      </div>
      <div className="text-right">
        <p className="num-mono text-[12px] text-sage-text">{amount}</p>
        <p className="text-[10px] text-sage-text-dim font-mono">{time}</p>
      </div>
    </div>
  );
  return href ? (
    <a href={href} target="_blank" rel="noreferrer" className="block hover:bg-sage-surface-soft px-1 -mx-1 rounded">
      {inner}
    </a>
  ) : (
    inner
  );
}

export function VaultPanel({ ctx }: { ctx?: ScreenContext }) {
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

  const balanceUsd = vaultBalance.data ?? 0;
  const totalDeposited = vaultQuery.data
    ? Number(vaultQuery.data.totalDeposited.toString()) / 1_000_000
    : 0;
  const totalSpent = vaultQuery.data
    ? Number(vaultQuery.data.totalSpent.toString()) / 1_000_000
    : 0;
  const exists = Boolean(vaultQuery.data);
  const idle = balanceUsd;
  const deployed = Math.max(totalDeposited - totalSpent - idle, 0);
  const activeTask = vaultQuery.data?.activeTask ?? null;
  const taskBudgetRemaining = activeTask
    ? Number(activeTask.budgetRemaining.toString()) / 1_000_000
    : 0;

  return (
    <div className="grid md:grid-cols-[1.2fr_1fr] gap-5">
      {/* LEFT — balance, actions, active task */}
      <div className="space-y-4">
        {/* Balance card */}
        <div className="card p-5 space-y-2">
          <p className="label-mono">Vault balance · SAGE-USDC</p>
          <p className="num-mono text-[44px] font-bold text-sage-text leading-none tracking-[-0.02em]">
            ${balanceUsd.toFixed(2)}
          </p>
          <div className="flex flex-wrap gap-1.5 pt-1">
            {exists ? (
              <>
                <span className="pill">${deployed.toFixed(2)} deployed</span>
                <span className="pill pill-accent">
                  ${idle.toFixed(2)} idle
                </span>
                <span className="pill">${totalSpent.toFixed(2)} spent</span>
              </>
            ) : (
              <span className="pill pill-warning">No vault yet</span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="grid grid-cols-3 gap-2">
          {!exists ? (
            <button
              type="button"
              disabled={initVault.isPending}
              onClick={() => initVault.mutate()}
              className="btn btn-primary col-span-3"
            >
              {initVault.isPending ? "Initialising…" : "+ Initialise vault"}
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={() => ctx?.go("bridge")}
                className="btn btn-primary"
              >
                + Fund
              </button>
              <button
                type="button"
                onClick={() => vaultQuery.refetch()}
                className="btn"
              >
                Refresh
              </button>
              <button
                type="button"
                onClick={() => ctx?.go("yield")}
                className="btn"
              >
                Find yield ›
              </button>
            </>
          )}
        </div>

        {initVault.isSuccess && (
          <p className="text-xs text-sage-accent break-all">
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
          <p className="text-xs text-sage-danger break-all">
            {(initVault.error as Error).message}
          </p>
        )}

        {/* Active task */}
        {activeTask && (
          <div className="card p-4 space-y-2 border-sage-accent!">
            <div className="flex items-center justify-between">
              <p className="label-mono">● Active task</p>
              <span className="pill pill-accent">running</span>
            </div>
            <p className="text-[13px] font-semibold text-sage-text">
              x402 task
            </p>
            <p className="font-mono text-[10px] text-sage-text-dim break-all">
              task_id{" "}
              {Buffer.from(activeTask.taskId).toString("hex").slice(0, 10)}…
            </p>
            <div className="flex items-center gap-2 mt-1">
              <div className="flex-1 h-1.5 rounded-full bg-sage-rule overflow-hidden">
                <div
                  className="h-full bg-sage-accent"
                  style={{
                    width: `${
                      activeTask.stepsExecuted > 0
                        ? Math.min(
                            (activeTask.stepsExecuted /
                              (activeTask.stepsExecuted + 1)) *
                              100,
                            95,
                          )
                        : 5
                    }%`,
                  }}
                />
              </div>
              <span className="num-mono text-[10px] text-sage-text-dim">
                {taskBudgetRemaining.toFixed(2)} remaining
              </span>
            </div>
            <p className="text-[11px] text-sage-text-dim">
              {activeTask.stepsExecuted} steps executed
            </p>
          </div>
        )}

        {/* Vault PDA + program addresses */}
        <div className="card p-4 space-y-2 text-[11px] font-mono">
          <div className="flex justify-between">
            <span className="text-sage-text-dim uppercase tracking-wider">
              Vault PDA
            </span>
            {vaultPda ? (
              <a
                href={explorerUrl(vaultPda.toBase58())}
                target="_blank"
                rel="noreferrer"
                className="text-sage-text hover:text-sage-accent"
              >
                {shortAddr(vaultPda.toBase58())}
              </a>
            ) : (
              <span className="text-sage-text-dim">—</span>
            )}
          </div>
          <div className="flex justify-between">
            <span className="text-sage-text-dim uppercase tracking-wider">
              Program
            </span>
            <a
              href={explorerUrl(PROGRAM_ID_STRING)}
              target="_blank"
              rel="noreferrer"
              className="text-sage-text hover:text-sage-accent"
            >
              {shortAddr(PROGRAM_ID_STRING)}
            </a>
          </div>
          <div className="flex justify-between">
            <span className="text-sage-text-dim uppercase tracking-wider">
              USDC mint
            </span>
            <a
              href={explorerUrl(SAGE_USDC_MINT.toBase58())}
              target="_blank"
              rel="noreferrer"
              className="text-sage-text hover:text-sage-accent"
            >
              {shortAddr(SAGE_USDC_MINT.toBase58())}
            </a>
          </div>
          <div className="flex justify-between border-t border-dashed border-sage-border-soft pt-2 mt-2">
            <span className="text-sage-text-dim uppercase tracking-wider">
              Wallet USDC
            </span>
            <span className="text-sage-text">
              {ownerBalance.data?.toFixed(2) ?? "—"}
            </span>
          </div>
        </div>
      </div>

      {/* RIGHT — ledger */}
      <div className="card p-5 flex flex-col">
        <div className="flex items-baseline justify-between mb-2">
          <h3 className="text-[14px] font-semibold text-sage-text">Ledger</h3>
          <span className="label-mono">10 most recent</span>
        </div>
        <div className="flex-1">
          {exists ? (
            <>
              <TxRow
                kind="Vault initialised"
                amount="—"
                time="now"
                detail="init_user_vault"
              />
              {totalDeposited > 0 && (
                <TxRow
                  kind="Deposit"
                  amount={`+${totalDeposited.toFixed(2)}`}
                  time="—"
                  detail="deposit instruction"
                />
              )}
              {totalSpent > 0 && (
                <TxRow
                  kind="x402 release"
                  amount={`-${totalSpent.toFixed(2)}`}
                  time="—"
                  detail="release_step → treasury"
                />
              )}
              {!totalDeposited && !totalSpent && (
                <p className="text-[11px] text-sage-text-dim font-mono pt-2">
                  Make a deposit to populate the ledger.
                </p>
              )}
            </>
          ) : (
            <p className="text-[12px] text-sage-text-dim leading-relaxed">
              Initialise the vault and your activity appears here. Every
              instruction emits an on-chain event linked to solscan.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
