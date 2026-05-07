import { useMemo, useState } from "react";
import { useConversation } from "@elevenlabs/react";
import {
  useConnection,
  useWallet,
} from "@solana/wallet-adapter-react";

import { useSageProgram } from "@/hooks/useSageProgram";
import { useSolanaVaults } from "@/hooks/useSolanaVaults";
import { useDeposit } from "@/hooks/useDeposit";
import { snapshotVault } from "@/lib/sage-sdk";
import type { ClientTools } from "@elevenlabs/react";

const AGENT_ID = import.meta.env.VITE_ELEVENLABS_AGENT_ID;

export function VoiceAgent() {
  const program = useSageProgram();
  const { publicKey } = useWallet();
  const { connection: _connection } = useConnection();
  const vaults = useSolanaVaults({
    targetSymbol: "USDC",
    objective: "safest",
    resultCount: 3,
  });
  const deposit = useDeposit();
  const [transcript, setTranscript] = useState<string[]>([]);

  const tools = useMemo<ClientTools>(() => {
    return {
      get_vault_status: async () => {
        if (!program || !publicKey) return "Wallet not connected.";
        const snap = await snapshotVault(program, publicKey);
        if (!snap.exists) {
          return "No vault yet. Tell the user to tap Initialise vault.";
        }
        return JSON.stringify({
          totalDeposited: snap.totalDepositedUsdc.toFixed(2),
          totalSpent: snap.totalSpentUsdc.toFixed(2),
          activeTask: snap.activeTask
            ? {
                budgetRemaining: snap.activeTask.budgetRemainingUsdc.toFixed(
                  2,
                ),
                steps: snap.activeTask.stepsExecuted,
              }
            : null,
        });
      },

      find_yield: async ({ intent }: Record<string, unknown>) => {
        const data = vaults.data;
        if (!data) return "Vault data still loading.";
        const top = data.ranked.slice(0, 3).map((v) => ({
          slug: v.slug,
          protocol: v.protocol,
          underlying: v.underlying.map((u) => u.symbol).join("/"),
          apy: v.analytics.apy.total.toFixed(2),
          tvl: v.analytics.tvl.usd,
          risk: v.riskTier,
        }));
        return JSON.stringify({
          intent: String(intent ?? ""),
          top,
        });
      },

      propose_deposit: async ({ amount }: Record<string, unknown>) => {
        const num = Number(amount);
        if (!Number.isFinite(num) || num <= 0) {
          return "Invalid amount.";
        }
        if (!program || !publicKey) {
          return "Wallet not connected.";
        }
        try {
          const sig = await deposit.mutateAsync(num);
          return `Deposited ${num.toFixed(2)} SAGE-USDC. Tx ${sig.slice(0, 12)}…`;
        } catch (err) {
          return `Deposit failed: ${(err as Error).message}`;
        }
      },
    };
  }, [program, publicKey, vaults.data, deposit]);

  const conversation = useConversation({
    clientTools: tools,
    onMessage: (m) => {
      const text = `${m.source}: ${m.message}`;
      setTranscript((prev) => [...prev.slice(-9), text]);
    },
    onError: (err) => {
      setTranscript((prev) => [
        ...prev.slice(-9),
        `error: ${typeof err === "string" ? err : JSON.stringify(err)}`,
      ]);
    },
  });

  if (!AGENT_ID) {
    return (
      <div className="rounded-2xl border border-sage-border bg-sage-surface p-6 space-y-2">
        <h3 className="text-lg font-semibold text-sage-text">Voice agent</h3>
        <p className="text-sm text-sage-text-dim">
          Set <code className="text-sage-accent">VITE_ELEVENLABS_AGENT_ID</code>{" "}
          in <code>app/.env.local</code> to enable. Create the agent at{" "}
          <a
            href="https://elevenlabs.io/app/conversational-ai"
            target="_blank"
            rel="noreferrer"
            className="underline"
          >
            elevenlabs.io
          </a>
          {" "}with tools <code>get_vault_status</code>,{" "}
          <code>find_yield</code>, and <code>propose_deposit</code>.
        </p>
      </div>
    );
  }

  const isActive = conversation.status === "connected";

  return (
    <div className="rounded-2xl border border-sage-border bg-sage-surface p-6 space-y-4">
      <div className="flex items-baseline justify-between">
        <h3 className="text-lg font-semibold text-sage-text">Voice agent</h3>
        <p className="text-xs text-sage-text-dim">
          {conversation.status}
          {isActive ? ` · ${conversation.mode}` : ""}
        </p>
      </div>

      <div className="flex gap-3">
        {!isActive ? (
          <button
            type="button"
            onClick={() => conversation.startSession({ agentId: AGENT_ID })}
            className="rounded-md bg-sage-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90"
          >
            Start talking
          </button>
        ) : (
          <button
            type="button"
            onClick={() => conversation.endSession()}
            className="rounded-md border border-sage-border px-4 py-2 text-sm text-sage-text hover:bg-sage-bg"
          >
            End
          </button>
        )}
        {isActive && (
          <button
            type="button"
            onClick={() => conversation.setMuted(!conversation.isMuted)}
            className="rounded-md border border-sage-border px-4 py-2 text-sm text-sage-text hover:bg-sage-bg"
          >
            {conversation.isMuted ? "Unmute" : "Mute"}
          </button>
        )}
      </div>

      {transcript.length > 0 && (
        <div className="rounded-md border border-sage-border bg-sage-bg p-3 max-h-40 overflow-y-auto space-y-1">
          {transcript.map((line, i) => (
            <p key={i} className="text-xs font-mono text-sage-text-dim">
              {line}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
