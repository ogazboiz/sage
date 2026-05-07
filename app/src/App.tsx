import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";

import { VaultPanel } from "@/components/VaultPanel";
import { YieldList } from "@/components/YieldList";

function App() {
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

      <main className="mx-auto max-w-3xl px-6 py-12 space-y-10">
        <VaultPanel />
        <YieldList />
      </main>
    </div>
  );
}

export default App;
