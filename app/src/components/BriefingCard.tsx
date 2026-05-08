import { useQuery } from "@tanstack/react-query";

import { usePayBriefing } from "@/hooks/usePayBriefing";
import { fetchChallenge } from "@/lib/x402";

const BRIEFING_URL =
  import.meta.env.VITE_BRIEFING_URL ?? "http://localhost:3001/brief";

function shortAddr(addr: string, n = 4): string {
  return `${addr.slice(0, n)}…${addr.slice(-n)}`;
}

export function BriefingCard() {
  const pay = usePayBriefing();
  const result = pay.data;

  // Fetch a fresh 402 challenge so the displayed numbers come from the
  // server, not from hardcoded copy. Refetched after a successful payment so
  // the user can pay again.
  const challenge = useQuery({
    queryKey: ["x402-challenge", BRIEFING_URL, result?.signature],
    queryFn: () => fetchChallenge(BRIEFING_URL),
    staleTime: 60_000,
    enabled: !pay.isPending,
  });

  const c = challenge.data;
  const refundEstimate = c
    ? Math.max(parseFloat(c.amount) * 0.5, 0).toFixed(2)
    : "0.10";

  // RECEIPT MODE — after successful payment (X402WebV2 design).
  if (result) {
    return (
      <div className="card p-6 space-y-5">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="pill pill-accent">● Settled on-chain</span>
          <span className="label-mono">receipt</span>
        </div>

        <div>
          <h3 className="text-base font-semibold text-sage-text">
            Solana DeFi briefing
          </h3>
          <p className="font-mono text-[11px] text-sage-text-dim mt-1 break-all">
            {BRIEFING_URL.replace(/^https?:\/\//, "")}
          </p>
        </div>

        <div className="card bg-white p-4">
          <p className="label-mono mb-2">Briefing</p>
          <p className="text-[13px] text-sage-text leading-relaxed">
            {result.briefing}
          </p>
        </div>

        <div className="card bg-white p-4 space-y-1.5 text-[12px]">
          <p className="label-mono mb-2">Payment proof</p>
          <div className="flex justify-between font-mono">
            <span className="text-sage-text-dim">tx</span>
            <a
              href={`https://solscan.io/tx/${result.signature}?cluster=devnet`}
              target="_blank"
              rel="noreferrer"
              className="text-sage-accent underline"
            >
              {shortAddr(result.signature, 6)}
            </a>
          </div>
          {c && (
            <>
              <div className="flex justify-between font-mono">
                <span className="text-sage-text-dim">amount</span>
                <span className="text-sage-text">{c.amount} {c.asset}</span>
              </div>
              <div className="flex justify-between font-mono">
                <span className="text-sage-text-dim">to treasury</span>
                <span className="text-sage-text">{shortAddr(c.recipient, 6)}</span>
              </div>
              <div className="flex justify-between font-mono">
                <span className="text-sage-text-dim">network</span>
                <span className="text-sage-text">{c.network}</span>
              </div>
            </>
          )}
        </div>

        <button
          type="button"
          onClick={() => pay.reset()}
          className="btn w-full"
        >
          Pay for another briefing ›
        </button>
      </div>
    );
  }

  // QUOTE MODE — show the live 402 challenge before payment.
  return (
    <div className="card p-6 space-y-5">
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

      {challenge.isLoading && (
        <p className="text-sm text-sage-text-dim font-mono">
          Fetching quote…
        </p>
      )}

      {challenge.isError && (
        <p className="text-xs text-sage-danger break-all">
          Couldn't reach briefing service:{" "}
          {(challenge.error as Error).message}
        </p>
      )}

      {c && (
        <>
          {/* Live quote breakdown */}
          <div className="border-y border-dashed border-sage-border-soft py-3 space-y-1.5 text-[12px]">
            <div className="flex justify-between">
              <span className="text-sage-text-dim">Quote</span>
              <span className="num-mono font-medium">
                {c.amount} {c.asset}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sage-text-dim">Recipient</span>
              <span className="num-mono font-medium">
                {shortAddr(c.recipient, 6)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sage-text-dim">Refund if unused</span>
              <span className="num-mono font-medium">
                ~{refundEstimate} {c.asset}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sage-text-dim">Network</span>
              <span className="num-mono font-medium">{c.network}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sage-text-dim">Nonce</span>
              <span className="num-mono font-medium">
                {c.nonce.slice(0, 8)}…
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sage-text-dim">Expires</span>
              <span className="num-mono font-medium">
                {Math.round(c.expiresIn / 60)}m
              </span>
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
              "That'll cost about{" "}
              {Math.round(parseFloat(c.amount) * 100)} cents from your vault.
              Continue?"
            </p>
          </div>

          {/* Pending stage indicator */}
          {pay.isPending ? (
            <div className="card bg-white p-4 space-y-3">
              <p className="label-mono">Settling on-chain…</p>
              <div className="space-y-1.5 text-[12px] font-mono">
                {[
                  ["fetching-quote", "Fetching quote"],
                  ["awaiting-signature", "Waiting for wallet signature"],
                  ["confirming", "Confirming on-chain"],
                  ["verifying", "Verifying with x402 service"],
                ].map(([key, label]) => {
                  const stages: Record<string, number> = {
                    "fetching-quote": 0,
                    "awaiting-signature": 1,
                    confirming: 2,
                    verifying: 3,
                  };
                  const idx = stages[key]!;
                  const cur = stages[pay.stage] ?? -1;
                  const done = idx < cur;
                  const active = idx === cur;
                  return (
                    <div
                      key={key}
                      className="flex items-center gap-2"
                    >
                      <span
                        className={
                          done
                            ? "text-sage-accent"
                            : active
                              ? "text-sage-text"
                              : "text-sage-text-faint"
                        }
                      >
                        {done ? "✓" : active ? "●" : "○"}
                      </span>
                      <span
                        className={
                          done
                            ? "text-sage-text-dim"
                            : active
                              ? "text-sage-text font-medium"
                              : "text-sage-text-faint"
                        }
                      >
                        {label}
                      </span>
                    </div>
                  );
                })}
              </div>
              {pay.stage === "awaiting-signature" && (
                <p className="text-[11px] text-sage-warning border border-sage-warning/40 bg-sage-warning-soft rounded p-2">
                  Open Backpack — the signature popup is waiting. If you're in
                  Chrome's mobile preview, the popup appears outside the
                  emulated viewport.
                </p>
              )}
              <button
                type="button"
                onClick={() => pay.reset()}
                className="btn w-full text-[12px]"
              >
                Cancel
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => challenge.refetch()}
                className="btn"
              >
                {challenge.isFetching ? "Refreshing…" : "Refresh quote"}
              </button>
              <button
                type="button"
                onClick={() => pay.mutate()}
                className="btn btn-primary"
              >
                Yes, pay {c.amount}
              </button>
            </div>
          )}

          <p className="label-mono text-center">
            approve_task → release_step → settle on-chain → receipt
          </p>
        </>
      )}

      {pay.isError && (
        <p className="text-xs text-sage-danger break-all border-t border-dashed border-sage-border-soft pt-3">
          {(pay.error as Error).message}
        </p>
      )}
    </div>
  );
}
