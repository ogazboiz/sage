import { usePayBriefing } from "@/hooks/usePayBriefing";

const BRIEFING_URL =
  import.meta.env.VITE_BRIEFING_URL ?? "http://localhost:3001/brief";

export function BriefingCard() {
  const pay = usePayBriefing();

  const result = pay.data;

  return (
    <div className="card p-6 space-y-5">
      {/* Header — HTTP 402 pill */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="pill pill-accent">● HTTP 402</span>
        <span className="label-mono">payment required</span>
      </div>

      <div>
        <h3 className="text-base font-semibold text-sage-text">
          Solana DeFi briefing
        </h3>
        <p className="font-mono text-[11px] text-sage-text-dim mt-1 break-all">
          {BRIEFING_URL.replace(/^https?:\/\//, "")}
        </p>
      </div>

      {/* Quote breakdown */}
      <div className="border-y border-dashed border-sage-border-soft py-3 space-y-1.5 text-[12px]">
        <div className="flex justify-between">
          <span className="text-sage-text-dim">Quote</span>
          <span className="num-mono font-medium">0.20 USDC</span>
        </div>
        <div className="flex justify-between">
          <span className="text-sage-text-dim">Budget cap</span>
          <span className="num-mono font-medium">0.30 USDC</span>
        </div>
        <div className="flex justify-between">
          <span className="text-sage-text-dim">Refund if unused</span>
          <span className="num-mono font-medium">0.10 USDC</span>
        </div>
        <div className="flex justify-between">
          <span className="text-sage-text-dim">Network</span>
          <span className="num-mono font-medium">Solana SPL · devnet</span>
        </div>
      </div>

      {/* Voice prompt line */}
      <div className="flex items-start gap-3">
        <div className="flex gap-0.5 pt-1">
          {[8, 14, 20, 14, 8].map((h, i) => (
            <span
              key={i}
              className="w-0.5 bg-sage-accent rounded-sm"
              style={{ height: `${h}px` }}
            />
          ))}
        </div>
        <p className="text-[13px] italic text-sage-text leading-snug">
          "That'll cost about 20 cents from your vault. Continue?"
        </p>
      </div>

      {/* Actions */}
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          disabled={pay.isPending}
          className="btn"
          onClick={() => pay.reset()}
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={() => pay.mutate()}
          disabled={pay.isPending}
          className="btn btn-primary"
        >
          {pay.isPending ? "Settling…" : "Yes, pay 0.20"}
        </button>
      </div>

      <p className="label-mono text-center">
        approve_task → release_step → settle on-chain → receipt
      </p>

      {/* Error */}
      {pay.isError && (
        <p className="text-xs text-sage-danger break-all border-t border-dashed border-sage-border-soft pt-3">
          {(pay.error as Error).message}
        </p>
      )}

      {/* Result */}
      {result && (
        <div className="space-y-3 border-t border-dashed border-sage-border-soft pt-4">
          <p className="label-mono">Briefing</p>
          <p className="text-[13px] text-sage-text leading-relaxed">
            {result.briefing}
          </p>
          <a
            href={`https://solscan.io/tx/${result.signature}?cluster=devnet`}
            target="_blank"
            rel="noreferrer"
            className="inline-block text-[11px] text-sage-accent underline font-mono"
          >
            ↗ settlement on solscan · {result.signature.slice(0, 8)}…
          </a>
        </div>
      )}
    </div>
  );
}
