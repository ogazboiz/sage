import { useEffect, useRef, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";

import { useSageProgram } from "@/hooks/useSageProgram";
import { useSolanaVaults } from "@/hooks/useSolanaVaults";
import { useDeposit } from "@/hooks/useDeposit";
import { usePayBriefing } from "@/hooks/usePayBriefing";
import { snapshotVault } from "@/lib/sage-sdk";
import type { RankedVault } from "@/lib/lifi";

// Browser SpeechRecognition + speechSynthesis fallback. Works when ElevenLabs
// LiveKit/WebRTC channels are blocked by the network. Same tool routing as
// the Conversational Agent: balance → vault status, yield → find_yield,
// deposit → on-chain deposit, briefing → x402 paid call.

interface ParsedIntent {
  kind: "status" | "yield" | "deposit" | "briefing" | "unknown";
  amount?: number;
  yieldQuery?: string;
}

function parseIntent(text: string): ParsedIntent {
  const t = text.toLowerCase();
  if (
    t.includes("balance") ||
    t.includes("vault status") ||
    t.includes("how much") ||
    /^(my )?vault\??$/.test(t.trim())
  ) {
    return { kind: "status" };
  }
  if (
    t.includes("brief") ||
    t.includes("summary") ||
    t.includes("report") ||
    t.includes("analysis")
  ) {
    return { kind: "briefing" };
  }
  if (t.includes("deposit") || t.includes("put") || t.includes("add")) {
    const m = t.match(/(\d+(?:\.\d+)?)/);
    return {
      kind: "deposit",
      amount: m ? parseFloat(m[1]) : 0.1,
    };
  }
  if (
    t.includes("yield") ||
    t.includes("earn") ||
    t.includes("apy") ||
    t.includes("vault") ||
    t.includes("find")
  ) {
    return { kind: "yield", yieldQuery: text };
  }
  return { kind: "unknown" };
}

function speak(text: string): Promise<void> {
  return new Promise((resolve) => {
    if (typeof window === "undefined" || !window.speechSynthesis) {
      resolve();
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.05;
    utterance.pitch = 1.0;
    utterance.onend = () => resolve();
    utterance.onerror = () => resolve();
    window.speechSynthesis.speak(utterance);
  });
}

function summariseTopVaults(top: RankedVault[]): string {
  if (top.length === 0) return "No vaults match that intent.";
  const lines = top.map((v, i) => {
    const symbols = v.underlyingTokens.map((u) => u.symbol).join(" or ");
    const apy = v.apyTotal.toFixed(2);
    return `${i + 1}. ${v.protocol.name} on ${v.network}, ${symbols} at ${apy} percent`;
  });
  return `Top picks: ${lines.join(". ")}.`;
}

export function SimpleVoice() {
  const { publicKey } = useWallet();
  const program = useSageProgram();
  const vaults = useSolanaVaults({
    targetSymbol: "USDC",
    objective: "safest",
    resultCount: 3,
  });
  const deposit = useDeposit();
  const payBriefing = usePayBriefing();

  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState<string[]>([]);
  const recognitionRef = useRef<unknown>(null);

  const supported =
    typeof window !== "undefined" &&
    (("SpeechRecognition" in window) ||
      ("webkitSpeechRecognition" in window));

  useEffect(() => {
    if (!supported) return;
    const Ctor =
      (window as unknown as Record<string, unknown>).SpeechRecognition ??
      (window as unknown as Record<string, unknown>).webkitSpeechRecognition;
    if (!Ctor) return;
    const recognition = new (Ctor as new () => unknown)() as {
      lang: string;
      interimResults: boolean;
      continuous: boolean;
      onresult: ((event: unknown) => void) | null;
      onend: (() => void) | null;
      onerror: ((event: { error: string }) => void) | null;
      start: () => void;
      stop: () => void;
    };
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.continuous = false;
    recognitionRef.current = recognition;
    return () => {
      try {
        recognition.stop();
      } catch {
        /* no-op */
      }
    };
  }, [supported]);

  async function handleUtterance(text: string) {
    setTranscript((p) => [...p.slice(-9), `you: ${text}`]);
    const intent = parseIntent(text);

    if (intent.kind === "unknown") {
      const msg =
        "I can check your vault status, find yield, deposit, or pay for a briefing.";
      setTranscript((p) => [...p.slice(-9), `sage: ${msg}`]);
      await speak(msg);
      return;
    }

    if (intent.kind === "status") {
      if (!program || !publicKey) {
        await speak("Connect your wallet first.");
        return;
      }
      const snap = await snapshotVault(program, publicKey);
      const msg = snap.exists
        ? `Vault deposited ${snap.totalDepositedUsdc.toFixed(2)}, spent ${snap.totalSpentUsdc.toFixed(2)} dollars. ${snap.activeTask ? "A task is active." : "No active task."}`
        : "No vault yet. Tap initialise vault first.";
      setTranscript((p) => [...p.slice(-9), `sage: ${msg}`]);
      await speak(msg);
      return;
    }

    if (intent.kind === "yield") {
      if (!vaults.data) {
        await speak("Vault data still loading.");
        return;
      }
      const msg = summariseTopVaults(vaults.data.ranked.slice(0, 3));
      setTranscript((p) => [...p.slice(-9), `sage: ${msg}`]);
      await speak(msg);
      return;
    }

    if (intent.kind === "deposit") {
      if (!program || !publicKey) {
        await speak("Connect your wallet first.");
        return;
      }
      const amt = intent.amount ?? 0.1;
      await speak(
        `Depositing ${amt.toFixed(2)} dollars. Confirm in your wallet.`,
      );
      try {
        const sig = await deposit.mutateAsync(amt);
        const msg = `Deposited ${amt.toFixed(2)} dollars. Transaction ${sig.slice(0, 8)}.`;
        setTranscript((p) => [...p.slice(-9), `sage: ${msg}`]);
        await speak(msg);
      } catch (err) {
        const msg = `Deposit failed: ${(err as Error).message.slice(0, 80)}`;
        setTranscript((p) => [...p.slice(-9), `sage: ${msg}`]);
        await speak("Deposit failed.");
      }
      return;
    }

    if (intent.kind === "briefing") {
      if (!program || !publicKey) {
        await speak("Connect your wallet first.");
        return;
      }
      await speak("That costs twenty cents from your vault. Sending now.");
      try {
        const result = await payBriefing.mutateAsync();
        setTranscript((p) => [...p.slice(-9), `sage: ${result.briefing}`]);
        await speak(result.briefing);
      } catch (err) {
        const msg = `Briefing failed: ${(err as Error).message.slice(0, 80)}`;
        setTranscript((p) => [...p.slice(-9), `sage: ${msg}`]);
        await speak("Briefing failed.");
      }
      return;
    }
  }

  function start() {
    const recognition = recognitionRef.current as
      | {
          start: () => void;
          onresult: ((event: unknown) => void) | null;
          onend: (() => void) | null;
          onerror: ((e: { error: string }) => void) | null;
        }
      | null;
    if (!recognition) return;
    setListening(true);
    recognition.onresult = (event: unknown) => {
      const e = event as {
        results: ArrayLike<ArrayLike<{ transcript: string }>>;
      };
      const text = e.results[0]?.[0]?.transcript ?? "";
      if (text) void handleUtterance(text);
    };
    recognition.onend = () => setListening(false);
    recognition.onerror = (event: { error: string }) => {
      setListening(false);
      setTranscript((p) => [...p.slice(-9), `mic error: ${event.error}`]);
    };
    try {
      recognition.start();
    } catch {
      setListening(false);
    }
  }

  if (!supported) {
    return (
      <div className="rounded-2xl border border-sage-border bg-sage-surface p-6 space-y-2">
        <h3 className="text-lg font-semibold text-sage-text">
          Voice (fallback)
        </h3>
        <p className="text-sm text-sage-text-dim">
          Browser SpeechRecognition isn't supported here. Use Chrome, Edge,
          or Safari.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-sage-border bg-sage-surface p-6 space-y-4">
      <div className="flex items-baseline justify-between">
        <h3 className="text-lg font-semibold text-sage-text">
          Voice (fallback)
        </h3>
        <p className="text-xs text-sage-text-dim">
          {listening ? "listening…" : "tap to talk"}
        </p>
      </div>
      <p className="text-xs text-sage-text-dim">
        Browser STT + TTS. Try: "what's my balance", "find me yield", "deposit
        ten cents", "give me a briefing".
      </p>
      <button
        type="button"
        onClick={start}
        disabled={listening}
        className="rounded-md bg-sage-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
      >
        {listening ? "Listening…" : "Talk"}
      </button>

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
