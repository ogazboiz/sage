import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";

import { PROGRAM_ID_STRING, SAGE_USDC_MINT } from "@/lib/sage-sdk";

function shortAddr(addr: string): string {
  return `${addr.slice(0, 4)}…${addr.slice(-4)}`;
}

export function OnboardingHero() {
  return (
    <div className="card bg-sage-surface px-6 py-14 md:px-12 md:py-20">
      <div className="mx-auto max-w-[640px] flex flex-col gap-7 md:gap-9">
        <div className="flex flex-wrap items-center gap-2">
          <span className="pill pill-accent">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-sage-accent" />
            devnet
          </span>
          <span className="pill">solana · li.fi · elevenlabs · x402</span>
        </div>

        <h1 className="text-[36px] md:text-[56px] font-semibold text-sage-text leading-[0.98] tracking-tight">
          The on-chain spending limit your AI agent can't bypass.
        </h1>

        <p className="text-[16px] md:text-[18px] text-sage-text-dim leading-normal max-w-[520px]">
          Set a USDC budget. Speak a task. The Solana program enforces every cent.
        </p>

        <p className="text-[13px] text-sage-text-dim italic leading-snug max-w-[520px] border-l-2 border-sage-accent pl-3">
          After connecting, try: <span className="not-italic font-mono text-sage-text">"Run a cross-chain USDC briefing every 30 seconds for 2 minutes, max one dollar."</span>
        </p>

        <div className="pt-1">
          <WalletMultiButton />
        </div>

        <div className="pt-5 border-t border-dashed border-sage-border-soft flex flex-wrap gap-x-5 gap-y-2 text-[11px] font-mono text-sage-text-dim">
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
