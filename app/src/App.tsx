import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";

import { useSageProgram } from "@/hooks/useSageProgram";
import {
  deriveUserVaultPda,
  fetchUserVault,
  PROGRAM_ID_STRING,
  SAGE_USDC_MINT,
} from "@/lib/sage-sdk";

function VaultPanel() {
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
          <p className="font-mono text-sm break-all text-sage-text">
            {vaultPda?.toBase58()}
          </p>
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
          </div>
        ) : (
          <p className="text-sage-warning">
            No vault yet. We'll add an "init" button next.
          </p>
        )}
      </div>

      <div className="border-t border-sage-border pt-4 space-y-1 text-xs text-sage-text-dim">
        <p>
          Program:{" "}
          <span className="font-mono text-sage-text">{PROGRAM_ID_STRING}</span>
        </p>
        <p>
          USDC mint:{" "}
          <span className="font-mono text-sage-text">
            {SAGE_USDC_MINT.toBase58()}
          </span>
        </p>
      </div>
    </div>
  );
}

function App() {
  return (
    <div className="min-h-full">
      <header className="border-b border-sage-border">
        <div className="mx-auto max-w-3xl px-6 py-4 flex items-center justify-between">
          <div>
            <p className="font-mono text-sm text-sage-text-dim">sage</p>
            <h1 className="text-2xl font-bold text-sage-text">
              Voice-first AI agent wallet on Solana
            </h1>
          </div>
          <WalletMultiButton />
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-12 space-y-6">
        <VaultPanel />
      </main>
    </div>
  );
}

export default App;
