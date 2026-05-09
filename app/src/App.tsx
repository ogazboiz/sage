import { useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";

import { AutonomousTaskPanel } from "@/components/AutonomousTaskPanel";
import { BridgeCard } from "@/components/BridgeCard";
import { DepositCard } from "@/components/DepositCard";
import { OnboardingHero } from "@/components/OnboardingHero";
import { VaultPanel } from "@/components/VaultPanel";
import { VoiceAgent } from "@/components/VoiceAgent";

type Screen = "voice" | "vault" | "bridge" | "activity";

const SCREENS: { key: Screen; n: string; label: string }[] = [
  { key: "voice", n: "01", label: "Talk" },
  { key: "vault", n: "02", label: "Vault" },
  { key: "bridge", n: "03", label: "Bridge" },
  { key: "activity", n: "04", label: "Activity" },
];

interface ScreenContext {
  go: (s: Screen) => void;
}

function TabIcon({ screen, active }: { screen: Screen; active: boolean }) {
  const stroke = active ? "currentColor" : "currentColor";
  const sw = 1.5;
  switch (screen) {
    case "voice":
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="9" stroke={stroke} strokeWidth={sw} />
          <circle
            cx="12"
            cy="12"
            r="4"
            fill={active ? "currentColor" : "none"}
            stroke={stroke}
            strokeWidth={sw}
          />
        </svg>
      );
    case "vault":
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <rect
            x="3.5"
            y="6"
            width="17"
            height="13"
            rx="2"
            stroke={stroke}
            strokeWidth={sw}
          />
          <path d="M3.5 10h17" stroke={stroke} strokeWidth={sw} />
        </svg>
      );
    case "bridge":
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <path
            d="M3 17V8M21 17V8M3 12c4-2 8-2 12 0s8 2 12 0"
            stroke={stroke}
            strokeWidth={sw}
            strokeLinecap="round"
          />
        </svg>
      );
    case "activity":
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <path
            d="M3 12h4l3-7 4 14 3-7h4"
            stroke={stroke}
            strokeWidth={sw}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
  }
}

function App() {
  const { connected } = useWallet();
  const [screen, setScreen] = useState<Screen>("voice");
  const ctx: ScreenContext = { go: setScreen };

  const current = SCREENS.find((s) => s.key === screen)!;

  return (
    <div className="min-h-full">
      <header className="border-b border-sage-border bg-white">
        <div className="mx-auto max-w-5xl px-4 md:px-6 py-3 flex items-center gap-3 md:gap-6">
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

      {/* Mobile bottom tab bar — matches wireframe phone nav pattern */}
      {connected && (
        <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-white border-t border-sage-border safe-bottom">
          <div className="grid grid-cols-5">
            {SCREENS.map((s) => {
              const active = screen === s.key;
              return (
                <button
                  key={s.key}
                  type="button"
                  onClick={() => setScreen(s.key)}
                  className={`flex flex-col items-center justify-center gap-1 py-2.5 ${
                    active ? "text-sage-accent" : "text-sage-text-dim"
                  }`}
                >
                  <TabIcon screen={s.key} active={active} />
                  <span
                    className={`text-[10px] font-mono tracking-wider ${
                      active ? "text-sage-text font-semibold" : ""
                    }`}
                  >
                    {s.label}
                  </span>
                </button>
              );
            })}
          </div>
        </nav>
      )}

      {!connected ? (
        <main className="mx-auto max-w-5xl px-4 md:px-6 py-6 md:py-10">
          <OnboardingHero />
        </main>
      ) : (
        <main className="mx-auto max-w-5xl px-4 md:px-6 py-6 md:py-8 pb-24 md:pb-8 space-y-5 md:space-y-6">
          {/* Screen header — section number + title */}
          <div className="flex items-baseline gap-3">
            <span className="font-mono text-[11px] tracking-widest text-sage-text-dim">
              {current.n}
            </span>
            <h2 className="text-[22px] font-semibold text-sage-text tracking-[-0.01em]">
              {current.label}
            </h2>
          </div>

          {/* Active screen */}
          {screen === "vault" && (
            <div className="space-y-6">
              <VaultPanel ctx={ctx} />
              <DepositCard />
            </div>
          )}

          {screen === "voice" && <VoiceAgent ctx={ctx} />}

          {screen === "bridge" && <BridgeCard />}

          {screen === "activity" && <AutonomousTaskPanel />}

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
