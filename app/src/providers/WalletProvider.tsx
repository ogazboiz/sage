import { useCallback, useMemo } from "react";
import { clusterApiUrl } from "@solana/web3.js";
import { WalletAdapterNetwork } from "@solana/wallet-adapter-base";
import {
  ConnectionProvider,
  WalletProvider as SolanaWalletProvider,
} from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import {
  PhantomWalletAdapter,
  SolflareWalletAdapter,
} from "@solana/wallet-adapter-wallets";

import "@solana/wallet-adapter-react-ui/styles.css";

const NETWORK = WalletAdapterNetwork.Devnet;

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const endpoint = useMemo(() => {
    const override = import.meta.env.VITE_SOLANA_RPC;
    if (override) return override;
    return clusterApiUrl(NETWORK);
  }, []);

  // PhantomWalletAdapter and SolflareWalletAdapter both register themselves via
  // the wallet-standard protocol. Listing them explicitly ensures they show up
  // even if the standard auto-detection misses them on some setups.
  const wallets = useMemo(
    () => [new PhantomWalletAdapter(), new SolflareWalletAdapter()],
    [],
  );

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
