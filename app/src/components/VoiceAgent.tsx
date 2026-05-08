import { useEffect, useMemo, useRef, useState } from "react";
import { useConversation } from "@elevenlabs/react";
import {
  useConnection,
  useWallet,
} from "@solana/wallet-adapter-react";

import { useSageProgram } from "@/hooks/useSageProgram";
import { useSolanaVaults } from "@/hooks/useSolanaVaults";
import { useDeposit } from "@/hooks/useDeposit";
import { usePayBriefing } from "@/hooks/usePayBriefing";
import { snapshotVault, type SageProgram } from "@/lib/sage-sdk";
import type { ClientTools } from "@elevenlabs/react";
import type { PublicKey } from "@solana/web3.js";

const AGENT_ID = import.meta.env.VITE_ELEVENLABS_AGENT_ID;

interface ToolDeps {
  program: SageProgram | null;
  publicKey: PublicKey | null;
  vaultsData: ReturnType<typeof useSolanaVaults>["data"];
  deposit: ReturnType<typeof useDeposit>;
  payBriefing: ReturnType<typeof usePayBriefing>;
}

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
  const payBriefing = usePayBriefing();
  const [transcript, setTranscript] = useState<string[]>([]);

  // The ElevenLabs SDK captures the clientTools closure at session start, so a
  // stale closure can read publicKey=null even after the wallet connects mid
  // session. Funnel everything through a ref that we update in an effect.
  const depsRef = useRef<ToolDeps>({
    program: null,
    publicKey: null,
    vaultsData: undefined,
    deposit,
    payBriefing,
  });
  useEffect(() => {
    depsRef.current = {
      program,
      publicKey,
      vaultsData: vaults.data,
      deposit,
      payBriefing,
    };
  }, [program, publicKey, vaults.data, deposit, payBriefing]);

  const tools = useMemo<ClientTools>(() => {
    return {
      get_vault_status: async () => {
        const { program, publicKey } = depsRef.current;
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
        const data = depsRef.current.vaultsData;
        if (!data) return "Vault data still loading.";
        const top = data.ranked.slice(0, 3).map((v) => ({
          slug: v.slug,
          protocol: v.protocol.name,
          chain: v.network,
          underlying: v.underlyingTokens.map((u) => u.symbol).join("/"),
          apy: v.apyTotal.toFixed(2),
          tvlUsd: Math.round(v.tvlUsd),
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
        const { program, publicKey, deposit } = depsRef.current;
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

      pay_briefing: async () => {
        const { program, publicKey, payBriefing } = depsRef.current;
        if (!program || !publicKey) return "Wallet not connected.";
        try {
          const result = await payBriefing.mutateAsync();
          return JSON.stringify({
            briefing: result.briefing,
            signature: result.signature,
          });
        } catch (err) {
          return `Briefing payment failed: ${(err as Error).message}`;
        }
      },
    };
    // depsRef reads always pick up the latest values, so we don't depend on
    // them here. tools is stable for the lifetime of the session.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      <div className="card p-6 space-y-2">
        <h3 className="text-base font-semibold text-sage-text">Voice agent</h3>
        <p className="text-sm text-sage-text-dim">
          Set <code className="text-sage-accent font-mono">VITE_ELEVENLABS_AGENT_ID</code>{" "}
          in <code className="font-mono">app/.env.local</code> to enable.
          Create the agent at{" "}
          <a
            href="https://elevenlabs.io/app/conversational-ai"
            target="_blank"
            rel="noreferrer"
            className="underline"
          >
            elevenlabs.io
          </a>
          {" "}with tools <code className="font-mono">get_vault_status</code>,{" "}
          <code className="font-mono">find_yield</code>,{" "}
          <code className="font-mono">propose_deposit</code>, and{" "}
          <code className="font-mono">pay_briefing</code>.
        </p>
      </div>
    );
  }

  const isActive = conversation.status === "connected";
  const speaking = isActive && conversation.mode === "speaking";

  async function start() {
    try {
      const res = await fetch(
        `/api/elevenlabs/v1/convai/conversation/get-signed-url?agent_id=${AGENT_ID}`,
      );
      if (res.ok) {
        const { signed_url } = (await res.json()) as { signed_url: string };
        conversation.startSession({
          signedUrl: signed_url,
          connectionType: "websocket",
        });
        return;
      }
    } catch {
      /* fall through */
    }
    conversation.startSession({
      agentId: AGENT_ID,
      connectionType: "websocket",
    });
  }

  return (
    <div className="card p-7 space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-sage-text">
            Voice agent
          </h3>
          <p className="text-sm text-sage-text-dim mt-1">
            ElevenLabs Conversational Agent. Tools wired to the on-chain vault.
          </p>
        </div>
        <span
          className={`pill ${
            isActive ? "pill-accent" : ""
          }`}
        >
          <span
            className={`inline-block w-1.5 h-1.5 rounded-full ${
              isActive ? "bg-sage-accent" : "bg-sage-text-dim"
            }`}
          />
          {conversation.status}
          {isActive ? ` · ${conversation.mode}` : ""}
        </span>
      </div>

      {/* Orb visualization */}
      <div className="flex flex-col items-center gap-4 py-4">
        <div className="relative w-36 h-36">
          {[1, 0.78, 0.55].map((s, i) => (
            <div
              key={i}
              style={{
                position: "absolute",
                inset: `${(1 - s) * 72}px`,
                borderRadius: "50%",
                border: `1.5px solid ${
                  i === 2 ? "var(--color-sage-accent)" : "var(--color-sage-border)"
                }`,
                background:
                  i === 2 ? "var(--color-sage-accent-soft)" : "transparent",
                opacity: i === 0 ? 0.3 : i === 1 ? 0.6 : 1,
                transition: "all 200ms ease",
                transform: speaking ? "scale(1.05)" : "scale(1)",
              }}
            />
          ))}
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="label-mono text-sage-accent">
              {!isActive
                ? "Sage"
                : speaking
                  ? "speaking"
                  : "listening"}
            </span>
          </div>
        </div>

        <div className="flex gap-3">
          {!isActive ? (
            <button type="button" onClick={start} className="btn btn-primary btn-lg">
              ● Start talking
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={() => conversation.endSession()}
                className="btn"
              >
                End
              </button>
              <button
                type="button"
                onClick={() => conversation.setMuted(!conversation.isMuted)}
                className="btn"
              >
                {conversation.isMuted ? "Unmute" : "Mute"}
              </button>
            </>
          )}
        </div>

        {isActive && (
          <p className="text-xs text-sage-text-dim text-center max-w-md">
            Try: "what's my vault balance" · "find me safe USDC yield" · "give
            me a briefing"
          </p>
        )}
      </div>

      {transcript.length > 0 && (
        <div className="border-t border-dashed border-sage-border-soft pt-4 space-y-2">
          <p className="label-mono">Transcript</p>
          <div className="bg-white border border-sage-border-soft rounded-md p-3 max-h-40 overflow-y-auto space-y-1">
            {transcript.map((line, i) => (
              <p
                key={i}
                className="text-xs font-mono text-sage-text-dim leading-relaxed"
              >
                {line}
              </p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
