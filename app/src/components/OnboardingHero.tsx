import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";

import { PROGRAM_ID_STRING, SAGE_USDC_MINT } from "@/lib/sage-sdk";

function shortAddr(addr: string): string {
  return `${addr.slice(0, 4)}…${addr.slice(-4)}`;
}

const STEPS: { n: string; label: string; detail: string }[] = [
  {
    n: "01",
    label: "Sign once",
    detail: "approve_task on Solana opens a USDC cap and an expiry.",
  },
  {
    n: "02",
    label: "Walk away",
    detail:
      "An in-browser agent_keypair signs each release_step. No more wallet popups.",
  },
  {
    n: "03",
    label: "Loop runs",
    detail:
      "Paid endpoints settle on-chain: /brief, /yield-snapshot, /market-pulse, /synthesize, /alert-check.",
  },
  {
    n: "04",
    label: "Program stops it",
    detail:
      "Program rejects any release over the cap. complete_task refunds whatever is left.",
  },
];

export function OnboardingHero() {
  return (
    <div className="card bg-sage-surface px-6 py-12 md:px-12 md:py-16">
      <div className="mx-auto max-w-[760px] flex flex-col gap-8 md:gap-10">
        {/* Trust + identity */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="pill pill-accent">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-sage-accent" />
            devnet
          </span>
          <span className="pill">dev3pack</span>
          <span className="pill">solana · li.fi · elevenlabs · x402</span>
        </div>

        {/* Headline + sub */}
        <div className="space-y-4 md:space-y-5">
          <h1 className="text-[36px] md:text-[56px] font-semibold text-sage-text leading-[0.98] tracking-tight max-w-[640px]">
            The on-chain spending limit your AI agent can't bypass.
          </h1>
          <p className="text-[16px] md:text-[18px] text-sage-text-dim leading-normal max-w-[560px]">
            Set a USDC budget. Speak a task. The Solana program enforces
            every cent and refunds whatever is left.
          </p>
        </div>

        {/* CTA */}
        <div className="pt-1">
          <WalletMultiButton />
        </div>

        {/* How it works — concrete, numbered, walks the lifecycle */}
        <div className="pt-4 border-t border-dashed border-sage-border-soft">
          <p className="label-mono mb-5">How it works</p>
          <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-4 md:gap-5">
            {STEPS.map((s) => (
              <div key={s.n} className="space-y-1.5">
                <p className="font-mono text-[11px] text-sage-text-dim tracking-widest">
                  {s.n}
                </p>
                <p className="text-[14px] font-semibold text-sage-text">
                  {s.label}
                </p>
                <p className="text-[12px] text-sage-text-dim leading-snug">
                  {s.detail}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Demo cue + try-it line */}
        <div className="rounded-md border border-sage-border-soft bg-white/50 p-4 space-y-2">
          <p className="label-mono">Try it after connecting</p>
          <p className="text-[13px] text-sage-text leading-snug">
            <span className="font-mono text-sage-accent">"</span>
            Run a cross-chain USDC briefing every 30 seconds for 2 minutes,
            max one dollar.
            <span className="font-mono text-sage-accent">"</span>
          </p>
          <p className="text-[11px] text-sage-text-dim leading-snug">
            Voice opens the task. You sign once. The agent fires four to
            five paid services, you watch the vault counter tick to zero
            on-chain, and the program refunds the rest.
          </p>
        </div>

        {/* Proof footer */}
        <div className="pt-3 border-t border-dashed border-sage-border-soft flex flex-wrap gap-x-5 gap-y-2 text-[11px] font-mono text-sage-text-dim">
          <a
            href={`https://solscan.io/account/${PROGRAM_ID_STRING}?cluster=devnet`}
            target="_blank"
            rel="noreferrer"
            className="hover:text-sage-text"
          >
            program {shortAddr(PROGRAM_ID_STRING)} ↗
          </a>
          <a
            href={`https://solscan.io/account/${SAGE_USDC_MINT.toBase58()}?cluster=devnet`}
            target="_blank"
            rel="noreferrer"
            className="hover:text-sage-text"
          >
            usdc {shortAddr(SAGE_USDC_MINT.toBase58())} ↗
          </a>
          <a
            href="https://github.com/ogazboiz/sage"
            target="_blank"
            rel="noreferrer"
            className="hover:text-sage-text"
          >
            github ↗
          </a>
        </div>
      </div>
    </div>
  );
}
