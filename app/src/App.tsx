import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";

import { BridgeCard } from "@/components/BridgeCard";
import { BriefingCard } from "@/components/BriefingCard";
import { DepositCard } from "@/components/DepositCard";
import { SimpleVoice } from "@/components/SimpleVoice";
import { VaultPanel } from "@/components/VaultPanel";
import { VoiceAgent } from "@/components/VoiceAgent";
import { YieldList } from "@/components/YieldList";

function App() {
  const { connected } = useWallet();

  return (
    <div className="min-h-full">
      <header className="border-b border-sage-border">
        <div className="mx-auto max-w-3xl px-6 py-4 flex items-center justify-between">
          <div>
            <p className="font-mono text-sm text-sage-text-dim">sage</p>
            <h1 className="text-2xl font-bold text-sage-text">
              Voice-first AI agent wallet on Solana
            </h1>
          </div>
          <WalletMultiButton />
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-12 space-y-8">
        <VaultPanel />
        {connected && <DepositCard />}
        {connected && <BridgeCard />}
        <VoiceAgent />
        {connected && <SimpleVoice />}
        {connected && <BriefingCard />}
        <YieldList />
      </main>
    </div>
  );
}

export default App;
