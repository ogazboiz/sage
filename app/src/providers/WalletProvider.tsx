import { useCallback, useMemo } from "react";
import { clusterApiUrl } from "@solana/web3.js";
import { WalletAdapterNetwork } from "@solana/wallet-adapter-base";
import {
  ConnectionProvider,
  WalletProvider as SolanaWalletProvider,
} from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";

import "@solana/wallet-adapter-react-ui/styles.css";

const NETWORK = WalletAdapterNetwork.Devnet;

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const endpoint = useMemo(() => {
    const override = import.meta.env.VITE_SOLANA_RPC;
    if (override) return override;
    return clusterApiUrl(NETWORK);
  }, []);

  // Modern Solana wallets (Phantom, Solflare, Backpack, Glow, etc.) all
  // register themselves via the wallet-standard browser API. The adapter
  // picks them up automatically with an empty wallets list.
  const wallets = useMemo(() => [], []);

  // Surface the actual underlying error rather than the generic message the
  // WalletConnectionError wrapper swallows. The cause and stack reveal which
  // extension actually rejected and why.
  const onError = useCallback((err: Error) => {
    console.error("[wallet] error:", err.name, err.message);
    if ((err as Error & { cause?: unknown }).cause) {
      console.error(
        "[wallet] cause:",
        (err as Error & { cause: unknown }).cause,
      );
    }
    console.error("[wallet] stack:", err.stack);
  }, []);

  return (
    <ConnectionProvider endpoint={endpoint}>
      <SolanaWalletProvider
        wallets={wallets}
        autoConnect={false}
        onError={onError}
      >
        <WalletModalProvider>{children}</WalletModalProvider>
      </SolanaWalletProvider>
    </ConnectionProvider>
  );
}
