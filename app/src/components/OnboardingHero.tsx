import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";

import {
  PROGRAM_ID_STRING,
  SAGE_USDC_MINT,
} from "@/lib/sage-sdk";

const STEPS = [
  { n: "1", title: "Connect" },
  { n: "2", title: "Fund" },
  { n: "3", title: "Talk" },
];

function shortAddr(addr: string): string {
  return `${addr.slice(0, 6)}…${addr.slice(-6)}`;
}

export function OnboardingHero() {
  return (
    <div className="grid md:grid-cols-[1fr_360px] gap-0 card overflow-hidden">
      {/* Left — copy and steps */}
      <div className="p-6 md:p-10 space-y-6 md:space-y-8 bg-sage-surface">
        <p className="label-mono">Sage · tutorial</p>

        <h1 className="text-4xl md:text-[42px] font-semibold text-sage-text leading-tight tracking-[-0.02em]">
          A wallet that does what you say.
        </h1>

        <div className="flex items-center gap-4">
          {STEPS.map((s) => (
            <div key={s.n} className="flex items-center gap-2">
              <div className="w-7 h-7 shrink-0 rounded-full border border-sage-border flex items-center justify-center font-mono text-sm font-semibold text-sage-text">
                {s.n}
              </div>
              <p className="text-sm font-semibold text-sage-text">{s.title}</p>
            </div>
          ))}
        </div>

        <div className="pt-2">
          <WalletMultiButton />
        </div>
      </div>

      {/* Right — live preview */}
      <div className="p-5 md:p-7 border-t md:border-t-0 md:border-l border-sage-border bg-white space-y-4">
        <p className="label-mono">Live preview</p>

        <div className="card bg-sage-surface p-4 space-y-1">
          <p className="label-mono">Vault PDA</p>
          <p className="font-mono text-xs text-sage-text-dim">
            (derives from your wallet)
          </p>
        </div>

        <div className="card bg-sage-surface p-4 space-y-1">
          <p className="label-mono">Balance</p>
          <p className="num-mono text-3xl font-bold text-sage-text">$0.00</p>
        </div>

        <div className="card bg-sage-surface p-4 space-y-2">
          <p className="label-mono">Voice agent</p>
          <p className="text-xs text-sage-text-dim font-mono">disconnected</p>
          <div className="flex gap-1">
            {Array.from({ length: 14 }).map((_, i) => (
              <span
                key={i}
                className="w-0.5 bg-sage-text-dim/40"
                style={{ height: `${[8, 12, 18, 22, 14, 10, 6, 16, 24, 20, 12, 8, 14, 18][i]}px` }}
              />
            ))}
          </div>
        </div>

        <div className="border-t border-dashed border-sage-border-soft pt-3 space-y-1.5 text-[11px] font-mono text-sage-text-dim">
          <div className="flex justify-between gap-2">
            <span>Program</span>
            <a
              href={`https://solscan.io/account/${PROGRAM_ID_STRING}?cluster=devnet`}
              target="_blank"
              rel="noreferrer"
              className="text-sage-text hover:text-sage-accent break-all"
            >
              {shortAddr(PROGRAM_ID_STRING)}
            </a>
          </div>
          <div className="flex justify-between gap-2">
            <span>USDC mint</span>
            <a
              href={`https://solscan.io/account/${SAGE_USDC_MINT.toBase58()}?cluster=devnet`}
              target="_blank"
              rel="noreferrer"
              className="text-sage-text hover:text-sage-accent break-all"
            >
              {shortAddr(SAGE_USDC_MINT.toBase58())}
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
