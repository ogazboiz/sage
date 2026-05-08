import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";

import { BridgeCard } from "@/components/BridgeCard";
import { BriefingCard } from "@/components/BriefingCard";
import { DepositCard } from "@/components/DepositCard";
import { VaultPanel } from "@/components/VaultPanel";
import { VoiceAgent } from "@/components/VoiceAgent";
import { YieldList } from "@/components/YieldList";

function App() {
  const { connected } = useWallet();

  return (
    <div className="min-h-full">
      <header className="border-b border-sage-border bg-white">
        <div className="mx-auto max-w-5xl px-6 py-3 flex items-center gap-6">
          <div className="font-mono text-sm tracking-[0.18em] text-sage-text font-semibold">
            SAGE
          </div>
          <nav className="hidden md:flex items-center gap-5 text-[13px] text-sage-text-dim">
            <a className="text-sage-text font-medium" href="#vault">
              Vault
            </a>
            <a className="hover:text-sage-text" href="#yield">
              Yield
            </a>
            <a className="hover:text-sage-text" href="#voice">
              Voice
            </a>
            <a className="hover:text-sage-text" href="#bridge">
              Bridge
            </a>
          </nav>
          <div className="flex-1" />
          <span className="pill pill-accent">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-sage-accent" />
            devnet
          </span>
          <WalletMultiButton />
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-8 space-y-10">
        <section id="vault" className="space-y-6">
          <h2 className="label-mono">Vault</h2>
          <VaultPanel />
          {connected && (
            <div className="grid md:grid-cols-2 gap-6">
              <DepositCard />
              <BriefingCard />
            </div>
          )}
        </section>

        <section id="voice" className="space-y-4">
          <h2 className="label-mono">Voice agent</h2>
          <VoiceAgent />
        </section>

        {connected && (
          <section id="bridge" className="space-y-4">
            <h2 className="label-mono">Bridge</h2>
            <BridgeCard />
          </section>
        )}

        <section id="yield" className="space-y-4">
          <h2 className="label-mono">Yield</h2>
          <YieldList />
        </section>

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
    </div>
  );
}

export default App;
