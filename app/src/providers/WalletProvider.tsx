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

  // Empty wallets array on purpose. Phantom, Solflare, Backpack, and other
  // modern Solana wallets register themselves via the wallet-standard
  // protocol — the adapter picks them up automatically. Listing legacy
  // PhantomWalletAdapter / SolflareWalletAdapter explicitly causes them to
  // bind to the deprecated window.solana path which Phantom's current build
  // actively rejects ("WalletConnectionError: Connection rejected").
  const wallets = useMemo(() => [], []);

  // Surface the actual underlying error rather than the generic "Unexpected
  // error" the adapter swallows.
  const onError = useCallback((err: Error) => {
    console.error("[wallet]", err.name, err.message, err);
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
