import { useEffect, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";

import { useAutonomousTask } from "@/hooks/useAutonomousTask";
import { useVaultUsdcBalance } from "@/hooks/useTokenBalances";
import { buildDecidePolicy, type Shape } from "@/lib/autonomous-decide";

const SHAPE_OPTIONS: { value: Shape; label: string; sample: string }[] = [
  {
    value: "briefing",
    label: "Briefing",
    sample: "Brief me on Solana DeFi every minute for 5 minutes",
  },
  {
    value: "monitor",
    label: "Monitor",
    sample: "Watch Kamino USDC every 30 seconds. Alert on tier change.",
  },
  {
    value: "content",
    label: "Content",
    sample: "Draft me a short Solana DeFi report",
  },
  { value: "auto", label: "Auto", sample: "Whatever fits the goal" },
];

function txUrl(sig: string): string {
  return `https://solscan.io/tx/${sig}?cluster=devnet`;
}

function shortSig(sig: string): string {
  return `${sig.slice(0, 6)}…${sig.slice(-4)}`;
}

function formatRemaining(endsAt: number | null): string {
  if (!endsAt) return "—";
  const ms = Math.max(0, endsAt - Date.now());
  const m = Math.floor(ms / 60_000);
  const s = Math.floor((ms % 60_000) / 1_000);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function AutonomousTaskPanel() {
  const { publicKey } = useWallet();
  const task = useAutonomousTask();
  const vaultBalance = useVaultUsdcBalance();

  const [goal, setGoal] = useState(SHAPE_OPTIONS[0]!.sample);
  const [shape, setShape] = useState<Shape>("briefing");
  const [budget, setBudget] = useState("1.00");
  const [intervalSeconds, setIntervalSeconds] = useState("30");
  const [durationMinutes, setDurationMinutes] = useState("5");
  const [, setTick] = useState(0); // forces re-render so the countdown ticks
  const [seededFromVoice, setSeededFromVoice] = useState(false);

  // The voice tool can hand off here via sessionStorage. Pull any pending
  // autonomous params on mount and pre-fill the form.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = sessionStorage.getItem("sage:pending-autonomous");
    if (!raw) return;
    sessionStorage.removeItem("sage:pending-autonomous");
    try {
      const parsed = JSON.parse(raw) as {
        goal?: string;
        budget?: number;
        intervalSeconds?: number;
        durationMinutes?: number;
      };
      if (typeof parsed.goal === "string") setGoal(parsed.goal);
      if (typeof parsed.budget === "number")
        setBudget(parsed.budget.toFixed(2));
      if (typeof parsed.intervalSeconds === "number")
        setIntervalSeconds(String(parsed.intervalSeconds));
      if (typeof parsed.durationMinutes === "number")
        setDurationMinutes(String(parsed.durationMinutes));
      setSeededFromVoice(true);
    } catch {
      /* ignore */
    }
  }, []);

  // Re-render once a second while running so the time-remaining counter moves
  useEffect(() => {
    if (task.status !== "running") return;
    const id = setInterval(() => setTick((t) => t + 1), 1_000);
    return () => clearInterval(id);
  }, [task.status]);

  async function onStart() {
    const decide = buildDecidePolicy({ goal, shape });
    const budgetUsdc = parseFloat(budget);
    const intervalSec = parseFloat(intervalSeconds);
    const durationMin = parseFloat(durationMinutes);

    if (!Number.isFinite(budgetUsdc) || budgetUsdc <= 0) return;
    if (!Number.isFinite(intervalSec) || intervalSec < 1) return;
    if (!Number.isFinite(durationMin) || durationMin < 0.25) return;

    if ((vaultBalance.data ?? 0) < budgetUsdc) {
      alert(
        `Vault holds $${(vaultBalance.data ?? 0).toFixed(
          2,
        )}. Top up before running a $${budgetUsdc.toFixed(2)} task.`,
      );
      return;
    }

    try {
      await task.start({
        goal,
        budget: budgetUsdc,
        intervalSeconds: intervalSec,
        durationMinutes: durationMin,
        decide,
      });
    } catch (err) {
      console.error("[autonomous-panel] start failed:", err);
    }
  }

  const isRunning = task.status === "running" || task.status === "stopping";
  const isApproving = task.status === "approving";

  return (
    <div className="card p-5 md:p-6 space-y-5">
      <div className="flex items-baseline justify-between">
        <h3 className="text-base font-semibold text-sage-text">
          Autonomous task
        </h3>
        <span
          className={`pill ${
            task.status === "running"
              ? "pill-accent"
              : task.status === "error"
                ? "pill-danger"
                : ""
          }`}
        >
          ● {task.status}
        </span>
      </div>

      {seededFromVoice && !isRunning && (
        <div className="rounded-md border border-sage-accent/40 bg-sage-accent-soft px-3 py-2 text-[12px] text-sage-text">
          Voice agent set up this task. Tap Start to sign the cap.
        </div>
      )}

      {/* Setup form */}
      {!isRunning && task.status !== "stopping" && (
        <div className="space-y-3">
          <div>
            <p className="label-mono mb-1.5">Shape</p>
            <div className="flex flex-wrap gap-1.5">
              {SHAPE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    setShape(opt.value);
                    setGoal(opt.sample);
                  }}
                  className={`pill ${shape === opt.value ? "pill-accent" : ""}`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="label-mono mb-1.5">Goal</p>
            <input
              type="text"
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              className="w-full px-3 py-2 rounded-md border border-sage-border bg-white text-[13px] text-sage-text"
              placeholder="What should the agent do?"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <p className="label-mono mb-1.5">Budget USDC</p>
              <input
                type="number"
                step="0.10"
                min="0.10"
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                className="w-full px-3 py-2 rounded-md border border-sage-border bg-white num-mono text-[13px]"
              />
            </div>
            <div>
              <p className="label-mono mb-1.5">Interval s</p>
              <input
                type="number"
                step="1"
                min="1"
                value={intervalSeconds}
                onChange={(e) => setIntervalSeconds(e.target.value)}
                className="w-full px-3 py-2 rounded-md border border-sage-border bg-white num-mono text-[13px]"
              />
            </div>
            <div>
              <p className="label-mono mb-1.5">Duration min</p>
              <input
                type="number"
                step="0.5"
                min="0.5"
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(e.target.value)}
                className="w-full px-3 py-2 rounded-md border border-sage-border bg-white num-mono text-[13px]"
              />
            </div>
          </div>

          <button
            type="button"
            onClick={onStart}
            disabled={!publicKey || isApproving}
            className="btn btn-primary btn-lg w-full"
          >
            {isApproving
              ? "Approving on-chain…"
              : `Start, sign once for $${parseFloat(budget || "0").toFixed(2)} cap`}
          </button>

          {task.error && (
            <p className="text-xs text-sage-danger break-all">
              {task.error}
            </p>
          )}
        </div>
      )}

      {/* Live counters */}
      {isRunning && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="card bg-white p-3">
              <p className="label-mono">Cap left</p>
              <p className="num-mono text-[20px] font-bold text-sage-text mt-1">
                ${task.budgetRemaining.toFixed(2)}
              </p>
              <p className="label-mono mt-0.5">of ${task.budgetTotal.toFixed(2)}</p>
            </div>
            <div className="card bg-white p-3">
              <p className="label-mono">Time left</p>
              <p className="num-mono text-[20px] font-bold text-sage-text mt-1">
                {formatRemaining(task.endsAt)}
              </p>
              <p className="label-mono mt-0.5">m:ss</p>
            </div>
            <div className="card bg-white p-3">
              <p className="label-mono">Iterations</p>
              <p className="num-mono text-[20px] font-bold text-sage-text mt-1">
                {task.iterations.length}
              </p>
              <p className="label-mono mt-0.5">on-chain</p>
            </div>
          </div>

          <button
            type="button"
            onClick={task.stop}
            className="btn w-full"
          >
            Stop and refund leftover
          </button>
        </div>
      )}

      {/* Iteration log */}
      {task.iterations.length > 0 && (
        <div className="space-y-2">
          <p className="label-mono">Activity</p>
          <div className="space-y-1.5">
            {[...task.iterations].reverse().map((it) => {
              // Endpoints that pull live LI.FI Earn data inside the briefing
              // service. Surfacing the badge tells a judge at a glance:
              // "the agent is paying USDC on Solana to read LI.FI data."
              const usesLifi =
                it.endpoint === "/brief" ||
                it.endpoint === "/yield-snapshot" ||
                it.endpoint === "/alert-check";
              return (
                <div
                  key={it.signature}
                  className="card bg-white p-3 space-y-1"
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="font-mono text-[12px] font-semibold text-sage-text">
                      {it.endpoint}
                    </p>
                    <span className="num-mono text-[12px] text-sage-text-dim">
                      -${it.amount.toFixed(2)}
                    </span>
                  </div>
                  <p className="text-[12px] text-sage-text leading-snug line-clamp-2">
                    {it.result}
                  </p>
                  <div className="flex items-center gap-2 flex-wrap">
                    <a
                      href={txUrl(it.signature)}
                      target="_blank"
                      rel="noreferrer"
                      className="font-mono text-[10px] text-sage-text-dim hover:text-sage-accent"
                    >
                      tx {shortSig(it.signature)} ↗
                    </a>
                    {usesLifi && (
                      <span className="font-mono text-[9px] uppercase tracking-wider text-sage-accent border border-sage-accent/40 bg-sage-accent-soft rounded px-1.5 py-px">
                        LI.FI Earn
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {task.status === "stopped" && task.iterations.length === 0 && (
        <p className="text-[12px] text-sage-text-dim">
          Task closed before any iterations. Vault refunded.
        </p>
      )}
    </div>
  );
}
