import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";

const STEPS: [string, string, string][] = [
  ["1", "Connect Phantom", "Vault PDA derived from your key"],
  ["2", "Fund from any chain", "LI.FI bridges USDC into the vault"],
  ["3", "Talk to Sage", "Voice → tool call → on-chain action"],
];

export function OnboardingHero() {
  return (
    <div className="grid md:grid-cols-[1fr_360px] gap-0 card overflow-hidden">
      {/* Left — tutorial copy + numbered steps (ConnectWebV3) */}
      <div className="p-6 md:px-[60px] md:py-[50px] bg-sage-surface flex flex-col gap-4 md:gap-[18px]">
        <p className="label-mono">Sage · tutorial</p>

        <h1 className="text-[28px] md:text-[32px] font-semibold text-sage-text leading-[1.15] tracking-[-0.5px] max-w-[480px]">
          A wallet that does what you say.
        </h1>

        <p className="text-[13px] text-sage-text-dim leading-[1.5] max-w-[440px]">
          Sage holds USDC in a Solana program you own. You speak intent. Sage
          proposes, you confirm, the on-chain budget releases the cents.
        </p>

        <div className="flex flex-col gap-3 mt-2">
          {STEPS.map(([n, title, sub]) => (
            <div key={n} className="flex gap-3 items-start">
              <div className="w-6 h-6 shrink-0 rounded-full border border-sage-border flex items-center justify-center font-mono text-[11px] font-semibold text-sage-text">
                {n}
              </div>
              <div>
                <p className="text-[13px] font-semibold text-sage-text">
                  {title}
                </p>
                <p className="text-[11px] text-sage-text-dim mt-0.5">{sub}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-3">
          <WalletMultiButton />
        </div>
      </div>

      {/* Right — live preview pane */}
      <div className="p-5 border-t md:border-t-0 md:border-l border-sage-border bg-white flex flex-col gap-2.5">
        <p className="label-mono text-[9px]">Live preview</p>

        <div className="card bg-white p-2.5">
          <p className="label-mono">Vault PDA</p>
          <p className="font-mono text-[10px] text-sage-text mt-1">
            (derives on connect)
          </p>
        </div>

        <div className="card bg-white p-2.5">
          <p className="label-mono">Balance</p>
          <p className="num-mono text-[22px] font-bold text-sage-text mt-1 leading-none">
            $0.00
          </p>
        </div>

        <div className="space-y-1.5 pt-1">
          <span
            className="block h-1.5 rounded bg-sage-rule"
            style={{ width: "100%" }}
          />
          <span
            className="block h-1.5 rounded bg-sage-rule"
            style={{ width: "85%" }}
          />
          <span
            className="block h-1.5 rounded bg-sage-rule"
            style={{ width: "60%" }}
          />
          <span
            className="block h-1.5 rounded bg-sage-rule"
            style={{ width: "78%" }}
          />
        </div>

        <p className="font-mono text-[10px] text-sage-text-dim mt-1.5">
          ← Updates as you complete steps
        </p>
      </div>
    </div>
  );
}
