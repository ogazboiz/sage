import type {
  AutonomousTaskParams,
  DecisionContext,
  DecisionResult,
} from "@/hooks/useAutonomousTask";

// Heuristic that turns a free-text goal into a decision policy.
// Cheap-to-run keyword matching; no LLM required for this layer because the
// agent only has four tools to choose from.
//
// The policy reads the goal text once, picks a "shape" (briefing / monitor /
// content), and then on every tick decides which endpoint to call given
// context. Results from earlier ticks influence later choices (e.g. if a
// /yield-snapshot shows a tier change, the next tick escalates to
// /synthesize).
export type Shape = "briefing" | "monitor" | "content" | "market" | "auto";

interface PolicyInput {
  goal: string;
  shape?: Shape;
  // Optional vault slug for monitor mode. If not supplied, the policy
  // monitors whichever vault is currently top-ranked.
  monitorSlug?: string;
}

const MONITOR_KEYWORDS = ["watch", "monitor", "alert", "track", "if", "when"];
const CONTENT_KEYWORDS = [
  "write",
  "draft",
  "tweet",
  "summarise",
  "summarize",
  "report",
  "post",
];
const BRIEFING_KEYWORDS = ["brief", "briefing", "update", "rundown"];
const MARKET_KEYWORDS = [
  "market",
  "price",
  "prices",
  "pulse",
  "sol",
  "eth",
  "btc",
  "ticker",
];

function detectShape(goal: string): Shape {
  const g = goal.toLowerCase();
  const market = MARKET_KEYWORDS.some((k) =>
    new RegExp(`\\b${k}\\b`).test(g),
  );
  const monitor = MONITOR_KEYWORDS.some((k) => g.includes(k));
  const content = CONTENT_KEYWORDS.some((k) => g.includes(k));
  const briefing = BRIEFING_KEYWORDS.some((k) => g.includes(k));
  if (market) return "market";
  if (monitor) return "monitor";
  if (content) return "content";
  if (briefing) return "briefing";
  return "auto";
}

export function buildDecidePolicy(
  input: PolicyInput,
): AutonomousTaskParams["decide"] {
  const shape = input.shape ?? detectShape(input.goal);
  const monitorSlug = input.monitorSlug ?? null;

  return async (ctx: DecisionContext): Promise<DecisionResult | null | undefined> => {
    const { iteration, budgetRemaining, history } = ctx;

    // Hard stop guard: if the cheapest endpoint costs more than what's left,
    // tell the loop to stop.
    if (budgetRemaining < 0.05) return undefined;

    if (shape === "briefing") {
      // Periodic brief. /brief = $0.20 each.
      // Send a fresh brief on iteration 0, then every fifth tick. Otherwise
      // use the cheaper /yield-snapshot for status checks. Pass the goal so
      // the briefing prose can acknowledge the user's specific intent.
      if (iteration === 0 || iteration % 5 === 0) {
        if (budgetRemaining >= 0.2)
          return { endpoint: "/brief", body: { goal: ctx.goal } };
        return { endpoint: "/yield-snapshot", body: { goal: ctx.goal } };
      }
      return { endpoint: "/yield-snapshot", body: { goal: ctx.goal } };
    }

    if (shape === "content") {
      // Build a small report. First tick gathers, second briefs, then synth
      // until budget runs low.
      if (iteration === 0) return { endpoint: "/yield-snapshot" };
      if (iteration === 1 && budgetRemaining >= 0.2)
        return { endpoint: "/brief" };
      // Use accumulated history as input for synthesis
      const context = history
        .map((h) => `[${h.endpoint}] ${h.result}`)
        .slice(-4)
        .join("\n");
      if (budgetRemaining >= 0.1) {
        return { endpoint: "/synthesize", body: { input: context } };
      }
      return undefined;
    }

    if (shape === "monitor") {
      // /alert-check on every tick. If a change is detected, escalate to
      // /synthesize on the next tick using the alert reason as input.
      const last = history[history.length - 1];
      const lastChanged =
        last &&
        last.endpoint === "/alert-check" &&
        /tier moved/i.test(last.result);

      if (lastChanged && budgetRemaining >= 0.1) {
        const recent = history
          .slice(-3)
          .map((h) => `[${h.endpoint}] ${h.result}`)
          .join("\n");
        return {
          endpoint: "/synthesize",
          body: {
            input: `Goal: ${ctx.goal}\nRecent agent observations:\n${recent}`,
          },
        };
      }

      const slug = monitorSlug ?? "kamino-usdc";
      return { endpoint: "/alert-check", body: { slug } };
    }

    if (shape === "market") {
      // Market pulse loop: cheap CoinGecko price snapshots every tick. Every
      // fifth tick (or first), if the budget allows, fold in a yield read so
      // the agent has cross-chain DeFi context alongside the market quote.
      if (iteration % 5 === 0 && budgetRemaining >= 0.05) {
        return { endpoint: "/yield-snapshot", body: { goal: ctx.goal } };
      }
      return { endpoint: "/market-pulse" };
    }

    // auto: cheap status calls with one full brief at the start. Fold in a
    // market pulse on the second tick so the activity log shows multiple
    // data sources, not just LI.FI.
    if (iteration === 0 && budgetRemaining >= 0.2) {
      return { endpoint: "/brief", body: { goal: ctx.goal } };
    }
    if (iteration === 1 && budgetRemaining >= 0.03) {
      return { endpoint: "/market-pulse" };
    }
    return { endpoint: "/yield-snapshot", body: { goal: ctx.goal } };
  };
}
