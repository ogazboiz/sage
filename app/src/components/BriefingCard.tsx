import { usePayBriefing } from "@/hooks/usePayBriefing";

export function BriefingCard() {
  const pay = usePayBriefing();

  return (
    <div className="card p-6 space-y-4">
      <div className="flex items-baseline justify-between">
        <h3 className="text-base font-semibold text-sage-text">
          x402 paid briefing
        </h3>
        <span className="pill pill-accent">0.20 USDC</span>
      </div>

      <p className="text-sm text-sage-text-dim leading-relaxed">
        Vault releases 0.20 SAGE-USDC to the briefing service treasury with the
        nonce in a memo. Service verifies on-chain, returns text.
      </p>

      <div className="border-t border-dashed border-sage-border-soft pt-4">
        <button
          type="button"
          onClick={() => pay.mutate()}
          disabled={pay.isPending}
          className="btn btn-primary w-full"
        >
          {pay.isPending ? "Settling…" : "Pay 0.20 and read briefing"}
        </button>
      </div>

      {pay.isError && (
        <p className="text-xs text-sage-danger break-all">
          {(pay.error as Error).message}
        </p>
      )}

      {pay.isSuccess && (
        <div className="space-y-2 border-t border-dashed border-sage-border-soft pt-4">
          <p className="label-mono">Briefing</p>
          <p className="text-sm text-sage-text leading-relaxed">
            {pay.data.briefing}
          </p>
          <p className="text-xs">
            <a
              href={`https://solscan.io/tx/${pay.data.signature}?cluster=devnet`}
              target="_blank"
              rel="noreferrer"
              className="text-sage-accent underline font-mono"
            >
              ↗ settlement on solscan
            </a>
          </p>
        </div>
      )}
    </div>
  );
}
