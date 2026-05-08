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

const SOLANA_USDC = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";

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
        fromAddress: "0x0000000000000000000000000000000000000001",
        toAddress: destinationAddr,
      });
    },
  });

  return (
    <div className="card p-6 space-y-5">
      <div className="flex items-baseline justify-between gap-3 flex-wrap">
        <div>
          <h3 className="text-base font-semibold text-sage-text">
            Cross-chain bridge into Solana
          </h3>
          <p className="text-sm text-sage-text-dim mt-1">
            LI.FI Composer routes USDC from any source chain into Solana
            mainnet USDC, landing in the connected wallet.
          </p>
        </div>
        <span className="pill">LI.FI Composer</span>
      </div>

      <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-dashed border-sage-border-soft">
        <select
          value={sourceChainId}
          onChange={(e) => setSourceChainId(Number(e.target.value))}
          className="rounded-md border border-sage-border bg-white px-3 py-2 text-sage-text"
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
          className="w-24 rounded-md border border-sage-border bg-white px-3 py-2 text-sage-text"
        />
        <span className="label-mono">USDC → USDC on Solana</span>
        <div className="flex-1" />
        <button
          type="button"
          onClick={() => quote.mutate()}
          disabled={quote.isPending || !destinationAddr}
          className="btn btn-primary"
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
        <div className="grid grid-cols-2 gap-4 border-t border-dashed border-sage-border-soft pt-4">
          <div>
            <p className="label-mono mb-1">Tool</p>
            <p className="text-sage-text font-medium">
              {quote.data.tool ?? quote.data.toolDetails?.name ?? "—"}
            </p>
          </div>
          {quote.data.estimate && (
            <>
              <div>
                <p className="label-mono mb-1">Send</p>
                <p className="num-mono text-sage-text">
                  {quote.data.estimate.fromAmount}{" "}
                  <span className="text-sage-text-dim">
                    {quote.data.action?.fromToken?.symbol ?? ""}
                  </span>
                </p>
              </div>
              <div>
                <p className="label-mono mb-1">Receive</p>
                <p className="num-mono text-sage-text">
                  {quote.data.estimate.toAmount}{" "}
                  <span className="text-sage-text-dim">
                    {quote.data.action?.toToken?.symbol ?? ""}
                  </span>
                </p>
              </div>
              {quote.data.estimate.executionDuration && (
                <div>
                  <p className="label-mono mb-1">ETA</p>
                  <p className="num-mono text-sage-text">
                    {Math.round(quote.data.estimate.executionDuration)} s
                  </p>
                </div>
              )}
            </>
          )}
          <div className="col-span-2">
            <p className="label-mono mb-1">To address</p>
            <p className="font-mono text-xs text-sage-text break-all">
              {destinationAddr ?? "(connect wallet)"}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
