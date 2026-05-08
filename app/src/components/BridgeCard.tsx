import { useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useWallet } from "@solana/wallet-adapter-react";

import { fetchQuote, LIFI_SOLANA_CHAIN_ID } from "@/lib/lifi";

const SOURCE_CHAINS: Record<
  number,
  { label: string; color: string; address: string }
> = {
  1: {
    label: "Ethereum",
    color: "#627EEA",
    address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
  },
  8453: {
    label: "Base",
    color: "#0052FF",
    address: "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913",
  },
  42161: {
    label: "Arbitrum",
    color: "#28A0F0",
    address: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
  },
  10: {
    label: "Optimism",
    color: "#FF0420",
    address: "0x0b2c639c533813f4aa9d7837caf62653d097ff85",
  },
  137: {
    label: "Polygon",
    color: "#8247E5",
    address: "0x3c499c542cef5e3811e1192ce70d8cc03d5c3359",
  },
};

const SOLANA_USDC = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";

function shortAddr(addr: string, n = 4): string {
  return `${addr.slice(0, n)}…${addr.slice(-n)}`;
}

export function BridgeCard() {
  const { publicKey } = useWallet();
  const [sourceChainId, setSourceChainId] = useState(8453);
  const [amount, setAmount] = useState("50");

  const destinationAddr = publicKey?.toBase58();
  const source = SOURCE_CHAINS[sourceChainId]!;

  const quote = useMutation({
    mutationFn: async () => {
      if (!destinationAddr) throw new Error("Connect a Solana wallet first");
      const fromAmount = String(BigInt(Math.round(parseFloat(amount) * 10 ** 6)));
      return fetchQuote({
        fromChain: sourceChainId,
        toChain: LIFI_SOLANA_CHAIN_ID,
        fromToken: source.address,
        toToken: SOLANA_USDC,
        fromAmount,
        fromAddress: "0x0000000000000000000000000000000000000001",
        toAddress: destinationAddr,
      });
    },
  });

  const fromAmount = parseFloat(amount) || 0;
  const toAmount = useMemo(() => {
    if (!quote.data?.estimate) return null;
    return Number(quote.data.estimate.toAmount) / 1_000_000;
  }, [quote.data]);
  const slippage = useMemo(() => {
    if (toAmount == null) return null;
    return Math.max(((fromAmount - toAmount) / fromAmount) * 100, 0);
  }, [fromAmount, toAmount]);

  return (
    <div className="card p-5 md:p-7 space-y-5">
      <div className="flex items-baseline justify-between gap-3 flex-wrap">
        <div>
          <h3 className="text-base font-semibold text-sage-text">
            Fund your vault
          </h3>
          <p className="text-sm text-sage-text-dim mt-1">
            LI.FI Composer · cross-chain → Solana
          </p>
        </div>
        <span className="pill">LI.FI Composer</span>
      </div>

      {/* Source + Destination */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* From */}
        <div className="card bg-white p-4 space-y-2 relative">
          <div className="flex items-center justify-between">
            <p className="label-mono">From</p>
            <select
              value={sourceChainId}
              onChange={(e) => setSourceChainId(Number(e.target.value))}
              className="text-[12px] text-sage-text font-medium bg-transparent border-none outline-none cursor-pointer"
            >
              {Object.entries(SOURCE_CHAINS).map(([id, c]) => (
                <option key={id} value={id}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-3 pt-1">
            <div
              className="w-7 h-7 rounded-full shrink-0"
              style={{ background: source.color }}
            />
            <div className="flex-1">
              <p className="text-[14px] font-semibold text-sage-text">
                {source.label}
              </p>
              <p className="text-[10px] text-sage-text-dim font-mono">USDC</p>
            </div>
          </div>
          <div className="border-t border-dashed border-sage-border-soft pt-3 mt-2 flex items-baseline gap-2">
            <input
              type="number"
              step="1"
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="num-mono text-[28px] font-bold text-sage-text bg-transparent border-none outline-none w-24"
            />
            <span className="num-mono text-sage-text-dim text-sm">USDC</span>
          </div>
        </div>

        {/* To */}
        <div className="card bg-white p-4 space-y-2 border-sage-accent!">
          <p className="label-mono">To · your vault</p>
          <div className="flex items-center gap-3 pt-1">
            <div
              className="w-7 h-7 rounded-full shrink-0"
              style={{ background: "#9945FF" }}
            />
            <div className="flex-1 min-w-0">
              <p className="text-[14px] font-semibold text-sage-text">
                Solana · vault PDA
              </p>
              <p className="text-[10px] text-sage-text-dim font-mono truncate">
                {destinationAddr ? shortAddr(destinationAddr, 6) : "(connect wallet)"}
              </p>
            </div>
          </div>
          <div className="border-t border-dashed border-sage-border-soft pt-3 mt-2 flex items-baseline gap-2">
            <span className="num-mono text-[28px] font-bold text-sage-text">
              {toAmount != null ? toAmount.toFixed(2) : "—"}
            </span>
            <span className="num-mono text-sage-text-dim text-sm">
              USDC after fees
            </span>
          </div>
        </div>
      </div>

      {/* Route */}
      <div className="card bg-white p-4">
        <div className="grid grid-cols-2 md:grid-cols-[2fr_1fr_1fr_1fr] gap-3">
          <div className="col-span-2 md:col-span-1">
            <p className="label-mono">Best route</p>
            <p className="text-[13px] font-semibold text-sage-text mt-1">
              {quote.data?.tool ??
                quote.data?.toolDetails?.name ??
                (quote.isPending ? "Quoting…" : "Get a quote to see route")}
            </p>
            {quote.data?.estimate?.executionDuration && (
              <p className="text-[11px] text-sage-text-dim mt-0.5">
                est {Math.round(quote.data.estimate.executionDuration)}s
              </p>
            )}
          </div>
          <div>
            <p className="label-mono">Bridge fee</p>
            <p className="num-mono text-[13px] mt-1">
              {toAmount != null ? `$${(fromAmount - toAmount).toFixed(2)}` : "—"}
            </p>
          </div>
          <div>
            <p className="label-mono">Slippage</p>
            <p className="num-mono text-[13px] mt-1">
              {slippage != null ? `${slippage.toFixed(2)}%` : "—"}
            </p>
          </div>
          <div className="col-span-2 md:col-span-1">
            <p className="label-mono">Min received</p>
            <p className="num-mono text-[13px] mt-1">
              {quote.data?.estimate?.toAmountMin
                ? `${(
                    Number(quote.data.estimate.toAmountMin) / 1_000_000
                  ).toFixed(2)}`
                : "—"}
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => quote.mutate()}
          disabled={quote.isPending || !destinationAddr}
          className="btn btn-primary btn-lg"
        >
          {quote.isPending
            ? "Quoting…"
            : quote.data
              ? `Re-quote on ${source.label}`
              : `Get quote on ${source.label}`}
        </button>
        {quote.data && (
          <a
            className="btn btn-lg"
            href="https://jumper.exchange/?fromChain=8453&toChain=1151111081099710"
            target="_blank"
            rel="noreferrer"
          >
            Other routes ↗
          </a>
        )}
      </div>

      {quote.isError && (
        <p className="text-xs text-sage-danger break-all">
          {(quote.error as Error).message}
        </p>
      )}
    </div>
  );
}
