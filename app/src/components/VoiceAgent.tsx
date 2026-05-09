import { useEffect, useMemo, useRef, useState } from "react";
import { useConversation } from "@elevenlabs/react";
import {
  useConnection,
  useWallet,
} from "@solana/wallet-adapter-react";

import { useSageProgram } from "@/hooks/useSageProgram";
import { useSolanaVaults } from "@/hooks/useSolanaVaults";
import { useDeposit } from "@/hooks/useDeposit";
import { useDeployYield } from "@/hooks/useDeployYield";
import { usePayBriefing } from "@/hooks/usePayBriefing";
import { snapshotVault, type SageProgram } from "@/lib/sage-sdk";
import type { ClientTools } from "@elevenlabs/react";
import type { PublicKey } from "@solana/web3.js";
import type { ScreenContext } from "@/App";
import { useOwnerUsdcBalance, useVaultUsdcBalance } from "@/hooks/useTokenBalances";

const AGENT_ID = import.meta.env.VITE_ELEVENLABS_AGENT_ID;

interface ToolDeps {
  program: SageProgram | null;
  publicKey: PublicKey | null;
  vaultsData: ReturnType<typeof useSolanaVaults>["data"];
  deposit: ReturnType<typeof useDeposit>;
  payBriefing: ReturnType<typeof usePayBriefing>;
  deployYield: ReturnType<typeof useDeployYield>;
  ownerUsdcBalance: number | null | undefined;
  vaultUsdcBalance: number | null | undefined;
}

// Voice tools cannot pop a wallet directly: the call originates inside an
// ElevenLabs websocket message handler, and browsers strip the user-gesture
// flag from that call stack, so wallet adapters reject the connect/sign
// prompt. The agent proposes, the user clicks Confirm, and the click is the
// user gesture the wallet needs.
type Pending =
  | { kind: "deposit"; amount: number }
  | { kind: "briefing" }
  | {
      kind: "yield";
      slug: string;
      protocol: string;
      network: string;
      apy: number;
      amount: number;
    };

export function VoiceAgent({ ctx }: { ctx?: ScreenContext }) {
  const program = useSageProgram();
  const { publicKey } = useWallet();
  const { connection: _connection } = useConnection();
  const vaultBalance = useVaultUsdcBalance();
  const ownerBalance = useOwnerUsdcBalance();
  const vaults = useSolanaVaults({
    targetSymbol: "USDC",
    objective: "safest",
    resultCount: 3,
  });
  const deposit = useDeposit();
  const payBriefing = usePayBriefing();
  const deployYield = useDeployYield();
  const [transcript, setTranscript] = useState<string[]>([]);
  const [pending, setPending] = useState<Pending | null>(null);
  const [lastDisconnect, setLastDisconnect] = useState<{
    reason: string;
    message?: string;
    quota?: boolean;
  } | null>(null);

  // The ElevenLabs SDK captures the clientTools closure at session start, so a
  // stale closure can read publicKey=null even after the wallet connects mid
  // session. Funnel everything through a ref that we update in an effect.
  const depsRef = useRef<ToolDeps>({
    program: null,
    publicKey: null,
    vaultsData: undefined,
    deposit,
    payBriefing,
    deployYield,
    ownerUsdcBalance: undefined,
    vaultUsdcBalance: undefined,
  });
  useEffect(() => {
    depsRef.current = {
      program,
      publicKey,
      vaultsData: vaults.data,
      deposit,
      payBriefing,
      deployYield,
      ownerUsdcBalance: ownerBalance.data,
      vaultUsdcBalance: vaultBalance.data,
    };
  }, [
    program,
    publicKey,
    vaults.data,
    deposit,
    payBriefing,
    deployYield,
    ownerBalance.data,
    vaultBalance.data,
  ]);

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
          source: "LI.FI Earn",
        });
      },

      find_idle_assets: async () => {
        // Free read tool: surfaces idle USDC the user could put to work and
        // suggests where, sourced from LI.FI Earn. No payment required.
        const data = depsRef.current.vaultsData;
        const ownerUsdc = depsRef.current.ownerUsdcBalance ?? 0;
        const vaultUsdc = depsRef.current.vaultUsdcBalance ?? 0;

        const top =
          data?.ranked.slice(0, 3).map((v) => ({
            protocol: v.protocol.name,
            network: v.network,
            apy: v.apyTotal.toFixed(2),
            risk: v.riskTier,
          })) ?? [];

        return JSON.stringify({
          ownerWalletUsdc: ownerUsdc.toFixed(2),
          sageVaultUsdc: vaultUsdc.toFixed(2),
          guidance:
            ownerUsdc > 0.01
              ? `${ownerUsdc.toFixed(
                  2,
                )} USDC sits idle in the user's wallet. Suggest depositing it into the Sage vault and running an autonomous task to deploy it.`
              : "User's wallet has no idle USDC outside the Sage vault.",
          topYield: top,
          source: "LI.FI Earn",
        });
      },

      propose_deposit: async ({ amount }: Record<string, unknown>) => {
        const num = Number(amount);
        if (!Number.isFinite(num) || num <= 0) {
          return "Invalid amount.";
        }
        const { publicKey } = depsRef.current;
        if (!publicKey) return "Wallet not connected.";
        // Return immediately. ElevenLabs imposes a tool-call timeout and the
        // user has to click the wallet, so we surface a confirm card and let
        // the agent know to wait for a contextual update with the result.
        setPending({ kind: "deposit", amount: num });
        return `Showed the user a confirm card for ${num.toFixed(
          2,
        )} USDC. Tell them to tap Confirm on screen, then wait for an update with the transaction result.`;
      },

      pay_briefing: async () => {
        const { publicKey } = depsRef.current;
        if (!publicKey) return "Wallet not connected.";
        setPending({ kind: "briefing" });
        return "Showed the user a confirm card for the 0.20 USDC briefing. Tell them to tap Confirm on screen, then wait for an update with the result.";
      },

      start_autonomous_task: async (params: Record<string, unknown>) => {
        const { publicKey } = depsRef.current;
        if (!publicKey) return "Wallet not connected.";
        const goal = String(params.goal ?? "").trim();
        const budget = Number(params.budget);
        const intervalSeconds = Number(params.intervalSeconds ?? 30);
        const durationMinutes = Number(params.durationMinutes ?? 5);
        if (!goal) return "Need a goal sentence.";
        if (!Number.isFinite(budget) || budget <= 0)
          return "Need a positive budget.";
        if (!Number.isFinite(intervalSeconds) || intervalSeconds < 5)
          return "Interval must be at least 5 seconds.";
        if (!Number.isFinite(durationMinutes) || durationMinutes <= 0)
          return "Duration must be positive.";

        // Stash for the Activity tab to pick up
        try {
          sessionStorage.setItem(
            "sage:pending-autonomous",
            JSON.stringify({
              goal,
              budget,
              intervalSeconds,
              durationMinutes,
            }),
          );
        } catch {
          /* sessionStorage unavailable */
        }
        ctx?.go("activity");
        return `Pre-filled the Activity tab with goal "${goal}", $${budget.toFixed(
          2,
        )} cap, every ${intervalSeconds}s for ${durationMinutes} min. Tell the user to tap Start to approve the cap on-chain.`;
      },

      propose_yield_deposit: async (
        params: Record<string, unknown>,
      ) => {
        const slug = String(params.slug ?? "").trim();
        const num = Number(params.amount);
        if (!slug) return "Invalid slug.";
        if (!Number.isFinite(num) || num <= 0) return "Invalid amount.";
        const { publicKey, vaultsData } = depsRef.current;
        if (!publicKey) return "Wallet not connected.";
        const match = vaultsData?.ranked.find((v) => v.slug === slug);
        if (!match) {
          return `Unknown yield slug ${slug}. Call find_yield first to surface ranked options.`;
        }
        setPending({
          kind: "yield",
          slug: match.slug,
          protocol: match.protocol.name,
          network: match.network,
          apy: match.apyTotal,
          amount: num,
        });
        return `Showed the user a confirm card for deploying ${num.toFixed(
          2,
        )} USDC into ${match.protocol.name} (${match.network}) at ${match.apyTotal.toFixed(
          2,
        )}% APY. Tell them to tap Confirm on screen, then wait for an update with the result.`;
      },
    };
    // depsRef reads always pick up the latest values, so we don't depend on
    // them here. tools is stable for the lifetime of the session.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const conversation = useConversation({
    clientTools: tools,
    onConnect: () => {
      console.info("[voice] connected");
      setLastDisconnect(null);
    },
    onMessage: (m) => {
      const text = `${m.source}: ${m.message}`;
      setTranscript((prev) => [...prev.slice(-9), text]);
    },
    onError: (message, context) => {
      console.error("[voice] error:", message, context);
      setTranscript((prev) => [
        ...prev.slice(-9),
        `error: ${typeof message === "string" ? message : JSON.stringify(message)}`,
      ]);
    },
    onDisconnect: (details) => {
      // DisconnectionDetails: { reason, message?, closeCode?, closeReason? }.
      // Logging the full object is the only way to know whether the server
      // closed with an inactivity timeout, an agent error, or a network drop.
      console.error("[voice] disconnected:", details);
      const message =
        "message" in details && details.message ? details.message : undefined;
      const quota = Boolean(message && /quota/i.test(message));
      setLastDisconnect({ reason: details.reason, message, quota });
      setTranscript((prev) => [
        ...prev.slice(-9),
        `disconnected · ${details.reason}${
          message ? ` · ${message}` : ""
        }${
          "closeCode" in details && details.closeCode
            ? ` · ${details.closeCode}`
            : ""
        }`,
      ]);
      setPending(null);
    },
    onUnhandledClientToolCall: (call) => {
      console.warn("[voice] unhandled tool call:", call);
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
          <code className="font-mono">find_idle_assets</code>,{" "}
          <code className="font-mono">propose_deposit</code>,{" "}
          <code className="font-mono">propose_yield_deposit</code>,{" "}
          <code className="font-mono">pay_briefing</code>, and{" "}
          <code className="font-mono">start_autonomous_task</code>.
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

  // The user click is the wallet's required user gesture. Once the tx
  // settles (or fails) we push the result back to the agent via a
  // contextual update so it can speak it. The tool call itself already
  // returned, so this stays well clear of the ElevenLabs tool timeout.
  async function confirmPending() {
    if (!pending) return;
    const current = pending;
    setPending(null);
    let update: string;
    if (current.kind === "deposit") {
      try {
        const sig = await depsRef.current.deposit.mutateAsync(current.amount);
        update = `Deposit confirmed. ${current.amount.toFixed(
          2,
        )} USDC moved into the vault. tx ${sig.slice(0, 12)}…`;
      } catch (err) {
        update = `Deposit failed: ${(err as Error).message}`;
      }
    } else if (current.kind === "briefing") {
      try {
        const result = await depsRef.current.payBriefing.mutateAsync();
        update = `Briefing settled on-chain. tx ${result.signature.slice(
          0,
          12,
        )}…  Briefing text: ${result.briefing}`;
      } catch (err) {
        update = `Briefing failed: ${(err as Error).message}`;
      }
    } else {
      try {
        const position = await depsRef.current.deployYield.mutateAsync({
          slug: current.slug,
          protocol: current.protocol,
          network: current.network,
          amount: current.amount,
          apy: current.apy,
        });
        update = `Deployed ${position.amount.toFixed(2)} USDC into ${
          position.protocol
        } at ${position.apy.toFixed(2)}% APY. tx ${position.signature.slice(
          0,
          12,
        )}…`;
      } catch (err) {
        update = `Yield deploy failed: ${(err as Error).message}`;
      }
    }
    try {
      conversation.sendContextualUpdate(update);
    } catch (err) {
      console.warn("[voice] contextual update failed:", err);
    }
  }

  function cancelPending() {
    setPending(null);
    try {
      conversation.sendContextualUpdate(
        "User cancelled the on-screen confirmation.",
      );
    } catch {
      /* session may have ended */
    }
  }

  // Last agent line for the subtitle bar (V1 design).
  const lastAgentLine = transcript
    .slice()
    .reverse()
    .find((line) => line.startsWith("ai:"))
    ?.replace(/^ai:\s*/, "");

  // Tool calls observed (V2 timeline) — derive from transcript message lines.
  const toolEvents = transcript.filter((line) =>
    /(get_vault_status|find_yield|find_idle_assets|propose_deposit|propose_yield_deposit|pay_briefing|start_autonomous_task)/.test(line),
  );

  if (!isActive) {
    return (
      <div className="card p-5 md:p-7">
        <div className="flex items-center justify-end">
          <span className="pill">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-sage-text-dim" />
            {conversation.status}
          </span>
        </div>

        {lastDisconnect?.quota && (
          <div className="mt-4 border border-sage-warning/40 bg-sage-warning-soft rounded-md p-4 text-[12px] text-sage-text">
            <p className="font-semibold">ElevenLabs quota reached</p>
            <p className="text-sage-text-dim mt-1">
              The conversational AI minute cap on this API key is exceeded.
              Swap{" "}
              <code className="font-mono">ELEVENLABS_API_KEY</code> in{" "}
              <code className="font-mono">app/.env.local</code> for a key with
              remaining minutes, then restart the dev server.
            </p>
          </div>
        )}
        {lastDisconnect && !lastDisconnect.quota && (
          <div className="mt-4 border border-sage-border-soft rounded-md p-4 text-[12px] text-sage-text-dim">
            Session ended · {lastDisconnect.reason}
            {lastDisconnect.message ? ` · ${lastDisconnect.message}` : ""}
          </div>
        )}

        <div className="flex flex-col items-center gap-4 py-6">
          <Orb speaking={false} listening={false} size={144} />
          <button
            type="button"
            onClick={start}
            className="btn btn-primary btn-lg"
          >
            ● Start talking
          </button>
          {vaultBalance.data != null && (
            <button
              type="button"
              className="text-xs text-sage-text-dim hover:text-sage-text"
              onClick={() => ctx?.go("vault")}
            >
              Vault{" "}
              <span className="num-mono text-sage-text font-semibold">
                ${vaultBalance.data.toFixed(2)}
              </span>{" "}
              ›
            </button>
          )}
        </div>
      </div>
    );
  }

  // Active state — V1 CarPlay-style dark hero with subtitle, plus V2 timeline rail
  return (
    <div className="rounded-lg overflow-hidden border border-sage-border grid md:grid-cols-[1fr_280px]">
      {/* Hero */}
      <div className="relative bg-[#0F172A] text-white p-5 md:p-8 min-h-[380px] md:min-h-[420px] flex flex-col">
        {/* Top strip — vault context (VaultV3 design: reduce vault to 2 numbers) */}
        <div className="flex items-start justify-between text-[11px] font-mono">
          <div>
            <p className="opacity-50 tracking-widest">VAULT</p>
            <p className="text-[18px] mt-1 font-mono font-semibold tracking-[-0.02em]">
              ${vaultBalance.data?.toFixed(2) ?? "—"}
            </p>
          </div>
          <div className="text-right">
            <p className="opacity-50 tracking-widest">SESSION</p>
            <p className="mt-1">● {conversation.mode}</p>
          </div>
        </div>

        <div className="flex items-center gap-3 text-[11px] font-mono mt-4 opacity-70">
          <span className="tracking-widest">SAGE · LIVE</span>
          <span className="flex-1" />
          <button
            type="button"
            onClick={() => conversation.setMuted(!conversation.isMuted)}
            className="opacity-70 hover:opacity-100"
          >
            {conversation.isMuted ? "Unmute" : "Mute"}
          </button>
          <button
            type="button"
            onClick={() => conversation.endSession()}
            className="opacity-70 hover:opacity-100"
          >
            End
          </button>
        </div>

        <div className="flex-1 flex items-center justify-center py-4">
          {pending ? (
            <div className="w-full max-w-[360px] rounded-lg border border-white/20 bg-white/5 p-5 space-y-4">
              <p className="font-mono text-[10px] tracking-widest text-white/55">
                ● CONFIRM ON-CHAIN
              </p>
              <div>
                {pending.kind === "deposit" && (
                  <>
                    <p className="text-white/70 text-[13px]">Deposit</p>
                    <p className="font-mono text-[32px] font-bold leading-none mt-1">
                      ${pending.amount.toFixed(2)}
                    </p>
                    <p className="text-white/50 text-[11px] mt-1">
                      USDC into your vault
                    </p>
                  </>
                )}
                {pending.kind === "briefing" && (
                  <>
                    <p className="text-white/70 text-[13px]">Pay briefing</p>
                    <p className="font-mono text-[32px] font-bold leading-none mt-1">
                      $0.20
                    </p>
                    <p className="text-white/50 text-[11px] mt-1">
                      x402 settle from vault
                    </p>
                  </>
                )}
                {pending.kind === "yield" && (
                  <>
                    <p className="text-white/70 text-[13px]">
                      Deploy to {pending.protocol}
                    </p>
                    <p className="font-mono text-[32px] font-bold leading-none mt-1">
                      ${pending.amount.toFixed(2)}
                    </p>
                    <p className="text-white/50 text-[11px] mt-1">
                      {pending.network} · {pending.apy.toFixed(2)}% APY
                    </p>
                  </>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={cancelPending}
                  disabled={
                    deposit.isPending ||
                    payBriefing.isPending ||
                    deployYield.isPending
                  }
                  className="flex-1 px-3 py-2 text-[13px] rounded-md border border-white/30 text-white/80 hover:bg-white/5 disabled:opacity-40"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmPending}
                  disabled={
                    deposit.isPending ||
                    payBriefing.isPending ||
                    deployYield.isPending
                  }
                  className="flex-1 px-3 py-2 text-[13px] rounded-md bg-sage-accent text-white font-medium disabled:opacity-50"
                >
                  {deposit.isPending ||
                  payBriefing.isPending ||
                  deployYield.isPending
                    ? "Signing…"
                    : "Confirm"}
                </button>
              </div>
            </div>
          ) : (
            <Orb
              speaking={speaking}
              listening={!speaking}
              size={160}
              dark
            />
          )}
        </div>

        <div className="border-t border-white/15 pt-4 md:pt-5">
          <p className="font-mono text-[10px] tracking-widest text-white/55 mb-2">
            ● SAGE · {speaking ? "SPEAKING" : "LISTENING"}
          </p>
          <p className="text-[16px] md:text-[20px] font-medium leading-snug min-h-[2.5em]">
            {lastAgentLine ?? (speaking ? "…" : "Listening.")}
          </p>
        </div>
      </div>

      {/* Tool timeline rail */}
      <div className="bg-white p-5 space-y-3 border-t md:border-t-0 md:border-l border-sage-border">
        <p className="label-mono">Tool calls</p>

        <div className="space-y-2">
          {[
            "get_vault_status",
            "find_yield",
            "find_idle_assets",
            "propose_deposit",
            "propose_yield_deposit",
            "pay_briefing",
            "start_autonomous_task",
          ].map((tool) => {
            const seen = toolEvents.some((e) => e.includes(tool));
            return (
              <div
                key={tool}
                className="flex items-center justify-between text-[11px] font-mono py-1.5 border-b border-dashed border-sage-border-soft"
              >
                <span className={seen ? "text-sage-text" : "text-sage-text-dim"}>
                  {tool}
                </span>
                <span
                  className={
                    seen ? "text-sage-accent" : "text-sage-text-faint"
                  }
                >
                  {seen ? "✓" : "○"}
                </span>
              </div>
            );
          })}
        </div>

        {transcript.length > 0 && (
          <div className="pt-2">
            <p className="label-mono mb-2">Transcript</p>
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {transcript.slice(-8).map((line, i) => (
                <p
                  key={i}
                  className="text-[10px] font-mono text-sage-text-dim leading-snug"
                >
                  {line}
                </p>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Orb({
  speaking,
  listening,
  size = 140,
  dark = false,
}: {
  speaking: boolean;
  listening: boolean;
  size?: number;
  dark?: boolean;
}) {
  const stroke = dark ? "rgba(255,255,255,0.85)" : "var(--color-sage-border)";
  const accent = "var(--color-sage-accent)";
  const accentSoft = "var(--color-sage-accent-soft)";
  return (
    <div
      className="relative"
      style={{ width: size, height: size }}
    >
      {[1, 0.78, 0.55].map((s, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            inset: `${(1 - s) * (size / 2)}px`,
            borderRadius: "50%",
            border: `1.5px solid ${i === 2 ? accent : stroke}`,
            background: i === 2 ? accentSoft : "transparent",
            opacity: i === 0 ? 0.3 : i === 1 ? 0.6 : 1,
            transition: "all 220ms ease",
            transform: speaking ? "scale(1.06)" : "scale(1)",
          }}
        />
      ))}
      <div className="absolute inset-0 flex items-center justify-center">
        <span
          className="font-mono uppercase tracking-widest"
          style={{
            color: dark ? "rgba(255,255,255,0.85)" : "var(--color-sage-accent)",
            fontSize: size > 160 ? 12 : 10,
          }}
        >
          {speaking ? "speaking" : listening ? "listening" : "Sage"}
        </span>
      </div>
    </div>
  );
}
