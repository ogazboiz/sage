import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useWallet } from "@solana/wallet-adapter-react";

import { fetchQuote, LIFI_SOLANA_CHAIN_ID } from "@/lib/lifi";

const SOURCE_CHAINS = [
  { label: "Ethereum", value: 1 },
  { label: "Base", value: 8453 },
  { label: "Arbitrum", value: 42161 },
  { label: "Optimism", value: 10 },
  { label: "Polygon", value: 137 },
];

// Real Solana mainnet USDC (Circle). LI.FI only routes between listed tokens,
// so the bridge demo lands real USDC; the user's Sage devnet vault is funded
// separately via the Deposit card. In a mainnet build, the vault would hold
// this same mint.
const SOLANA_USDC = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";

// USDC contract addresses per chain. LI.FI uses 0x000…000 for native ETH.
const USDC_ADDRESS_BY_CHAIN: Record<number, string> = {
  1: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
  8453: "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913",
  42161: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
  10: "0x0b2c639c533813f4aa9d7837caf62653d097ff85",
  137: "0x3c499c542cef5e3811e1192ce70d8cc03d5c3359",
};

export function BridgeCard() {
  const { publicKey } = useWallet();
  const [sourceChainId, setSourceChainId] = useState(8453);
  const [amount, setAmount] = useState("10");

  const destinationAddr = publicKey?.toBase58();

  const quote = useMutation({
    mutationFn: async () => {
      const fromToken = USDC_ADDRESS_BY_CHAIN[sourceChainId];
      if (!fromToken) throw new Error("Unsupported source chain");
      if (!destinationAddr) throw new Error("Connect a Solana wallet first");
      const fromAmount = String(BigInt(Math.round(parseFloat(amount) * 10 ** 6)));
      return fetchQuote({
        fromChain: sourceChainId,
        toChain: LIFI_SOLANA_CHAIN_ID,
        fromToken,
        toToken: SOLANA_USDC,
        fromAmount,
        // Quote-only: use a placeholder source-chain address. For actual
        // execution, the user's connected EVM wallet supplies this.
        fromAddress: "0x0000000000000000000000000000000000000001",
        toAddress: destinationAddr,
      });
    },
  });

  return (
    <div className="rounded-2xl border border-sage-border bg-sage-surface p-6 space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-sage-text">
          Cross-chain bridge into Solana
        </h3>
        <p className="text-sm text-sage-text-dim">
          LI.FI Composer routes USDC from any source chain into Solana
          mainnet USDC, landing in the connected wallet. Production routes
          can target the vault PDA directly.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <select
          value={sourceChainId}
          onChange={(e) => setSourceChainId(Number(e.target.value))}
          className="rounded-md border border-sage-border bg-sage-bg px-3 py-2 text-sage-text"
        >
          {SOURCE_CHAINS.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
        <input
          type="number"
          step="1"
          min="0"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="w-24 rounded-md border border-sage-border bg-sage-bg px-3 py-2 text-sage-text"
        />
        <span className="text-sm text-sage-text-dim">USDC →</span>
        <span className="text-sm text-sage-text-dim">USDC on Solana</span>
        <button
          type="button"
          onClick={() => quote.mutate()}
          disabled={quote.isPending || !destinationAddr}
          className="rounded-md bg-sage-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
        >
          {quote.isPending ? "Quoting…" : "Get bridge quote"}
        </button>
      </div>

      {quote.isError && (
        <p className="text-xs text-sage-danger break-all">
          {(quote.error as Error).message}
        </p>
      )}

      {quote.data && (
        <div className="rounded-md border border-sage-border bg-sage-bg p-3 text-xs space-y-1">
          <p>
            Tool:{" "}
            <span className="text-sage-text">
              {quote.data.tool ?? quote.data.toolDetails?.name ?? "—"}
            </span>
          </p>
          {quote.data.estimate && (
            <>
              <p>
                Send:{" "}
                <span className="text-sage-text">
                  {quote.data.estimate.fromAmount}
                </span>{" "}
                {quote.data.action?.fromToken?.symbol ?? ""}
              </p>
              <p>
                Receive:{" "}
                <span className="text-sage-text">
                  {quote.data.estimate.toAmount}
                </span>{" "}
                {quote.data.action?.toToken?.symbol ?? ""}
              </p>
              {quote.data.estimate.executionDuration && (
                <p>
                  ETA:{" "}
                  <span className="text-sage-text">
                    {Math.round(quote.data.estimate.executionDuration)} s
                  </span>
                </p>
              )}
            </>
          )}
          <p className="break-all">
            To address:{" "}
            <span className="font-mono text-sage-text">
              {destinationAddr ?? "(connect wallet)"}
            </span>
          </p>
        </div>
      )}
    </div>
  );
}
