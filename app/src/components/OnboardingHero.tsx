import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";

import { PROGRAM_ID_STRING, SAGE_USDC_MINT } from "@/lib/sage-sdk";

function shortAddr(addr: string): string {
  return `${addr.slice(0, 4)}…${addr.slice(-4)}`;
}

const TOOL_STRIP: { line: string; tool?: string; status?: "ok" | "tx" }[] = [
  { line: '"what\'s my balance"' },
  { line: "get_vault_status", tool: "✓", status: "ok" },
  { line: "$50.00  ·  0 deployed  ·  0 spent" },
  { line: '"deposit 10 usdc"' },
  { line: "propose_deposit", tool: "✓", status: "ok" },
  { line: "approve_task → release_step", tool: "✓" },
  { line: "tx 4nF…aZ2", status: "tx" },
];

export function OnboardingHero() {
  return (
    <div className="grid md:grid-cols-[1.3fr_1fr] gap-0 card overflow-hidden">
      {/* LEFT — value prop + connect + proof */}
      <div className="bg-sage-surface px-6 py-7 md:px-10 md:py-12 flex flex-col gap-5 md:gap-6">
        <div className="flex items-center gap-2">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-sage-accent" />
          <p className="label-mono">Sage · devnet live</p>
        </div>

        <h1 className="text-[34px] md:text-[44px] font-semibold text-sage-text leading-[1.05] tracking-[-0.02em] max-w-[520px]">
          A wallet that does what you say.
        </h1>

        <p className="text-[14px] md:text-[15px] text-sage-text-dim leading-[1.55] max-w-[460px]">
          Speak intent. A Solana program you own holds USDC and releases the
          cents the moment you confirm.
        </p>

        <div className="pt-1">
          <WalletMultiButton />
        </div>

        <div className="border-t border-dashed border-sage-border-soft pt-4 mt-2 flex flex-wrap gap-x-5 gap-y-2 text-[11px] font-mono text-sage-text-dim">
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
          <span>devnet</span>
        </div>
      </div>

      {/* RIGHT — frozen demo strip showing the actual flow */}
      <div className="bg-white border-t md:border-t-0 md:border-l border-sage-border px-5 py-6 md:p-6 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <p className="label-mono">Sample · voice → on-chain</p>
          <span className="pill pill-accent">live</span>
        </div>

        <div className="flex flex-col gap-2 font-mono text-[12px]">
          {TOOL_STRIP.map((row, i) => {
            if (row.line.startsWith('"')) {
              return (
                <p
                  key={i}
                  className="italic text-sage-text-dim leading-snug"
                >
                  {row.line}
                </p>
              );
            }
            if (row.tool) {
              return (
                <div
                  key={i}
                  className="flex items-center gap-2 pl-3 border-l border-sage-accent text-sage-text"
                >
                  <span className="text-sage-accent">{row.tool}</span>
                  <span>{row.line}</span>
                </div>
              );
            }
            if (row.status === "tx") {
              return (
                <div
                  key={i}
                  className="pl-3 border-l border-sage-accent text-sage-accent"
                >
                  {row.line}
                </div>
              );
            }
            return (
              <div
                key={i}
                className="pl-3 text-sage-text"
              >
                {row.line}
              </div>
            );
          })}
        </div>

        <div className="border-t border-dashed border-sage-border-soft pt-3 mt-1 flex items-center gap-3">
          <div className="flex gap-0.5">
            {[6, 12, 20, 14, 8, 16, 10].map((h, i) => (
              <span
                key={i}
                className="w-0.5 bg-sage-accent rounded-sm"
                style={{ height: `${h}px` }}
              />
            ))}
          </div>
          <p className="text-[10px] font-mono text-sage-text-dim tracking-wider">
            ELEVENLABS · LI.FI · X402
          </p>
        </div>
      </div>
    </div>
  );
}
