import { usePayBriefing } from "@/hooks/usePayBriefing";

export function BriefingCard() {
  const pay = usePayBriefing();

  return (
    <div className="rounded-2xl border border-sage-border bg-sage-surface p-6 space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-sage-text">
          x402 paid briefing
        </h3>
        <p className="text-sm text-sage-text-dim">
          Vault releases 0.20 SAGE-USDC to the briefing service treasury
          with the nonce in a memo. Service verifies on-chain, returns text.
        </p>
      </div>

      <button
        type="button"
        onClick={() => pay.mutate()}
        disabled={pay.isPending}
        className="rounded-md bg-sage-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {pay.isPending ? "Settling…" : "Pay 0.20 USDC and read briefing"}
      </button>

      {pay.isError && (
        <p className="text-xs text-sage-danger break-all">
          {(pay.error as Error).message}
        </p>
      )}

      {pay.isSuccess && (
        <div className="space-y-2">
          <p className="text-sm text-sage-text">{pay.data.briefing}</p>
          <p className="text-xs text-sage-success">
            <a
              href={`https://solscan.io/tx/${pay.data.signature}?cluster=devnet`}
              target="_blank"
              rel="noreferrer"
              className="underline"
            >
              View settlement on solscan
            </a>
          </p>
        </div>
      )}
    </div>
  );
}
