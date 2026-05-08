import { useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";

import { BridgeCard } from "@/components/BridgeCard";
import { BriefingCard } from "@/components/BriefingCard";
import { DepositCard } from "@/components/DepositCard";
import { OnboardingHero } from "@/components/OnboardingHero";
import { VaultPanel } from "@/components/VaultPanel";
import { VoiceAgent } from "@/components/VoiceAgent";
import { YieldList } from "@/components/YieldList";

type Screen = "voice" | "vault" | "bridge" | "yield" | "briefing";

const SCREENS: { key: Screen; n: string; label: string; blurb: string }[] = [
  {
    key: "voice",
    n: "01",
    label: "Talk",
    blurb: "Voice-first home. Speak intent, the agent acts.",
  },
  {
    key: "vault",
    n: "02",
    label: "Vault",
    blurb: "Balance, active task, ledger.",
  },
  {
    key: "bridge",
    n: "03",
    label: "Bridge",
    blurb: "LI.FI Composer · fund the vault from any chain.",
  },
  {
    key: "yield",
    n: "04",
    label: "Yield",
    blurb: "LI.FI Earn · ranked vaults across chains.",
  },
  {
    key: "briefing",
    n: "05",
    label: "Briefing",
    blurb: "x402 paid task · voice → quote → on-chain settlement.",
  },
];

interface ScreenContext {
  go: (s: Screen) => void;
}

function App() {
  const { connected } = useWallet();
  const [screen, setScreen] = useState<Screen>("voice");
  const ctx: ScreenContext = { go: setScreen };

  const current = SCREENS.find((s) => s.key === screen)!;

  return (
    <div className="min-h-full">
      <header className="border-b border-sage-border bg-white">
        <div className="mx-auto max-w-5xl px-6 py-3 flex items-center gap-6">
          <div className="font-mono text-sm tracking-[0.18em] text-sage-text font-semibold">
            SAGE
          </div>
          {connected && (
            <nav className="hidden md:flex items-center gap-1">
              {SCREENS.map((s) => {
                const active = screen === s.key;
                return (
                  <button
                    key={s.key}
                    type="button"
                    onClick={() => setScreen(s.key)}
                    className={`px-3 py-1.5 text-[13px] rounded-md transition-colors ${
                      active
                        ? "text-sage-text font-medium bg-sage-surface-soft"
                        : "text-sage-text-dim hover:text-sage-text"
                    }`}
                  >
                    {s.label}
                  </button>
                );
              })}
            </nav>
          )}
          <div className="flex-1" />
          <span className="pill pill-accent">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-sage-accent" />
            devnet
          </span>
          {connected && <WalletMultiButton />}
        </div>
      </header>

      {!connected ? (
        <main className="mx-auto max-w-5xl px-6 py-10">
          <OnboardingHero />
        </main>
      ) : (
        <main className="mx-auto max-w-5xl px-6 py-8 space-y-6">
          {/* Screen header — section number + title + blurb, like wireframe section heads */}
          <div className="flex items-baseline justify-between gap-4 flex-wrap">
            <div className="flex items-baseline gap-3">
              <span className="font-mono text-[11px] tracking-widest text-sage-text-dim">
                {current.n}
              </span>
              <div>
                <h2 className="text-[22px] font-semibold text-sage-text tracking-[-0.01em]">
                  {current.label}
                </h2>
                <p className="text-sm text-sage-text-dim">{current.blurb}</p>
              </div>
            </div>

            {/* Mobile screen switcher */}
            <div className="md:hidden flex gap-1 border border-sage-border rounded-md overflow-hidden">
              {SCREENS.map((s) => (
                <button
                  key={s.key}
                  type="button"
                  onClick={() => setScreen(s.key)}
                  className={`px-2.5 py-1 text-[11px] ${
                    screen === s.key
                      ? "bg-sage-text text-white"
                      : "bg-white text-sage-text"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Active screen */}
          {screen === "vault" && (
            <div className="space-y-6">
              <VaultPanel ctx={ctx} />
              <DepositCard />
            </div>
          )}

          {screen === "yield" && <YieldList />}

          {screen === "voice" && <VoiceAgent ctx={ctx} />}

          {screen === "bridge" && <BridgeCard />}

          {screen === "briefing" && (
            <BriefingCard onGoToVault={() => setScreen("vault")} />
          )}

          <footer className="pt-10 pb-6 text-[11px] text-sage-text-dim font-mono flex flex-wrap gap-x-4 gap-y-1">
            <span>devnet</span>
            <span>·</span>
            <a
              className="hover:text-sage-text"
              href="https://github.com/ogazboiz/sage"
              target="_blank"
              rel="noreferrer"
            >
              github
            </a>
            <span>·</span>
            <a
              className="hover:text-sage-text"
              href="https://solscan.io/account/64VYGx9kPeizgiqVRWGMBxbbsLV1n7YZTk8MezvpjqtZ?cluster=devnet"
              target="_blank"
              rel="noreferrer"
            >
              program
            </a>
          </footer>
        </main>
      )}
    </div>
  );
}

export default App;
export type { Screen, ScreenContext };
