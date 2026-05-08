import { useWalletModal } from "@solana/wallet-adapter-react-ui";

// ConnectWebV1 / ConnectMobileV1 — the default variant in
// sage/project/wf-connect.jsx. Centered wallet card with two named rows
// and a 1-of-3 step footer.
export function OnboardingHero() {
  const { setVisible } = useWalletModal();
  const openModal = () => setVisible(true);

  return (
    <div className="min-h-[560px] flex items-center justify-center px-2 md:px-10 py-6">
      <div className="card w-full max-w-[420px] p-6 md:p-7 bg-white flex flex-col gap-4">
        {/* logo placeholder circle */}
        <div className="w-9 h-9 rounded-full border-[1.5px] border-sage-border" />

        <div>
          <h1 className="text-[20px] font-semibold text-sage-text leading-tight">
            Welcome to Sage
          </h1>
          <p className="text-[13px] text-sage-text-dim mt-1.5 leading-snug">
            A voice-first agent that manages a budget you control on Solana.
          </p>
        </div>

        <button
          type="button"
          onClick={openModal}
          className="rounded-md border border-sage-border-soft p-3 flex items-center gap-3 hover:border-sage-border transition-colors text-left"
        >
          <div className="w-7 h-7 bg-[#7C3AED] rounded-md shrink-0" />
          <div className="flex-1">
            <p className="text-[12px] font-semibold text-sage-text">Phantom</p>
            <p className="text-[10px] text-sage-text-dim">Detected</p>
          </div>
          <span className="btn btn-primary btn-sm">Connect</span>
        </button>

        <button
          type="button"
          onClick={openModal}
          className="rounded-md border border-sage-border-soft p-2.5 flex items-center gap-3 hover:border-sage-border transition-colors text-left"
        >
          <div className="w-[22px] h-[22px] bg-[#FBA21A] rounded shrink-0" />
          <span className="flex-1 text-[12px] text-sage-text">Solflare</span>
          <span className="text-sage-text-dim">›</span>
        </button>

        <button
          type="button"
          onClick={openModal}
          className="rounded-md border border-sage-border-soft p-2.5 flex items-center gap-3 hover:border-sage-border transition-colors text-left"
        >
          <div className="w-[22px] h-[22px] bg-sage-text rounded shrink-0" />
          <span className="flex-1 text-[12px] text-sage-text">Backpack</span>
          <span className="text-sage-text-dim">›</span>
        </button>

        <div className="flex justify-between items-center pt-1.5 text-[10px] text-sage-text-dim font-mono">
          <span>STEP 1 OF 3 · WALLET</span>
          <span>· · ·</span>
        </div>
      </div>
    </div>
  );
}
