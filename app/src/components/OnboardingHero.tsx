import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";

import { PROGRAM_ID_STRING, SAGE_USDC_MINT } from "@/lib/sage-sdk";

function shortAddr(addr: string): string {
  return `${addr.slice(0, 4)}…${addr.slice(-4)}`;
}

export function OnboardingHero() {
  return (
    <div className="card bg-sage-surface px-6 py-12 md:py-20">
      <div className="mx-auto max-w-[640px] flex flex-col items-start gap-6 md:gap-8">
        <span className="pill pill-accent">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-sage-accent" />
          devnet
        </span>

        <h1 className="text-[40px] md:text-[56px] font-semibold text-sage-text leading-[1.02] tracking-tight">
          A wallet that does what you say.
        </h1>

        <p className="text-[16px] md:text-[17px] text-sage-text-dim leading-[1.55] max-w-[520px]">
          Speak intent. A Solana program you own holds your USDC and releases
          it the moment you confirm.
        </p>

        <div className="pt-1">
          <WalletMultiButton />
        </div>

        <div className="pt-6 border-t border-dashed border-sage-border-soft w-full flex flex-wrap gap-x-5 gap-y-2 text-[11px] font-mono text-sage-text-dim">
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
        </div>
      </div>
    </div>
  );
}
