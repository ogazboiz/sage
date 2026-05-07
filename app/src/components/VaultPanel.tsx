import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useWallet } from "@solana/wallet-adapter-react";

import { useSageProgram } from "@/hooks/useSageProgram";
import { useInitVault } from "@/hooks/useInitVault";
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

  const initVault = useInitVault();

  if (!publicKey) {
    return (
      <div className="rounded-2xl border border-sage-border bg-sage-surface p-8 text-center">
        <p className="text-sage-text-dim">
          Connect a wallet to spin up your Sage vault.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-sage-border bg-sage-surface p-8 space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs uppercase tracking-widest text-sage-text-dim">
            Vault PDA
          </p>
          {vaultPda && (
            <a
              className="font-mono text-sm break-all text-sage-text hover:text-sage-accent"
              href={explorerUrl(vaultPda.toBase58())}
              target="_blank"
              rel="noreferrer"
            >
              {vaultPda.toBase58()}
            </a>
          )}
        </div>
        <button
          type="button"
          onClick={() => vaultQuery.refetch()}
          className="text-xs text-sage-accent hover:underline"
        >
          refresh
        </button>
      </div>

      <div>
        <p className="text-xs uppercase tracking-widest text-sage-text-dim">
          Status
        </p>
        {vaultQuery.isLoading ? (
          <p className="text-sage-text-dim">Loading…</p>
        ) : vaultQuery.data ? (
          <div className="space-y-1">
            <p className="text-sage-success">Vault initialised</p>
            <p className="text-sm text-sage-text-dim">
              Total deposited:{" "}
              <span className="text-sage-text">
                {vaultQuery.data.totalDeposited.toString()}
              </span>{" "}
              · Total spent:{" "}
              <span className="text-sage-text">
                {vaultQuery.data.totalSpent.toString()}
              </span>
            </p>
            <p className="text-sm text-sage-text-dim">
              Active task:{" "}
              <span className="text-sage-text">
                {vaultQuery.data.activeTask ? "yes" : "none"}
              </span>
            </p>
            <p className="text-xs text-sage-text-dim mt-2 break-all">
              Agent identity:{" "}
              <span className="font-mono text-sage-text">
                {vaultQuery.data.agentKeypair.toBase58()}
              </span>
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sage-warning">No vault yet for this wallet.</p>
            <button
              type="button"
              disabled={initVault.isPending}
              onClick={() => initVault.mutate()}
              className="rounded-md bg-sage-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {initVault.isPending ? "Initialising…" : "Initialise vault"}
            </button>
            {initVault.isSuccess && (
              <p className="text-xs text-sage-success break-all">
                Done.{" "}
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
          </div>
        )}
      </div>

      <div className="border-t border-sage-border pt-4 space-y-1 text-xs text-sage-text-dim">
        <p>
          Program:{" "}
          <a
            className="font-mono text-sage-text hover:text-sage-accent"
            href={explorerUrl(PROGRAM_ID_STRING)}
            target="_blank"
            rel="noreferrer"
          >
            {PROGRAM_ID_STRING}
          </a>
        </p>
        <p>
          USDC mint:{" "}
          <a
            className="font-mono text-sage-text hover:text-sage-accent"
            href={explorerUrl(SAGE_USDC_MINT.toBase58())}
            target="_blank"
            rel="noreferrer"
          >
            {SAGE_USDC_MINT.toBase58()}
          </a>
        </p>
      </div>
    </div>
  );
}
