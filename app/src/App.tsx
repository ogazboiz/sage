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

type Screen = "vault" | "yield" | "voice" | "bridge";

const SCREENS: { key: Screen; label: string }[] = [
  { key: "vault", label: "Vault" },
  { key: "yield", label: "Yield" },
  { key: "voice", label: "Voice" },
  { key: "bridge", label: "Bridge" },
];

const SCREEN_BLURB: Record<Screen, string> = {
  vault: "Balance, active task, and the on-chain ledger.",
  yield: "Live LI.FI Earn vaults, ranked by your intent.",
  voice: "ElevenLabs Conversational Agent with on-chain tool calls.",
  bridge: "LI.FI Composer · cross-chain funding into your vault.",
};

function App() {
  const { connected } = useWallet();
  const [screen, setScreen] = useState<Screen>("vault");

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
          {/* Screen header */}
          <div className="flex items-baseline justify-between gap-4 flex-wrap">
            <div>
              <h2 className="text-[22px] font-semibold text-sage-text tracking-[-0.01em]">
                {SCREENS.find((s) => s.key === screen)?.label}
              </h2>
              <p className="text-sm text-sage-text-dim mt-1">
                {SCREEN_BLURB[screen]}
              </p>
            </div>

            {/* Mobile screen switcher */}
            <div className="md:hidden flex gap-1 border border-sage-border rounded-md overflow-hidden">
              {SCREENS.map((s) => (
                <button
                  key={s.key}
                  type="button"
                  onClick={() => setScreen(s.key)}
                  className={`px-3 py-1 text-[12px] ${
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
              <VaultPanel />
              <div className="grid md:grid-cols-2 gap-6">
                <DepositCard />
                <BriefingCard />
              </div>
            </div>
          )}

          {screen === "yield" && <YieldList />}

          {screen === "voice" && <VoiceAgent />}

          {screen === "bridge" && <BridgeCard />}

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
