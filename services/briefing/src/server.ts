import express, { type Request, type Response } from "express";
import {
  Connection,
  PublicKey,
  clusterApiUrl,
  type ParsedTransactionWithMeta,
} from "@solana/web3.js";
import { getAssociatedTokenAddressSync } from "@solana/spl-token";
import crypto from "node:crypto";

const PORT = parseInt(process.env.PORT ?? "3001", 10);
const RPC = process.env.RPC ?? clusterApiUrl("devnet");

const TREASURY = new PublicKey(
  process.env.TREASURY ?? "HKDKTVqJYfwZwSXMZiFKHe75bykunBFQUZW5gv6frYvw",
);
const MINT = new PublicKey(
  process.env.MINT ?? "EzAYN6m9yDhwKHRdt9iY9LCgpPDdCXrUtmfoj7PWNYon",
);

const DECIMALS = 6;
const NONCE_TTL_MS = 5 * 60 * 1000;

interface NonceRecord {
  amount: bigint;
  endpoint: string;
  expiresAt: number;
  consumed: boolean;
}

const nonces = new Map<string, NonceRecord>();

function pruneNonces() {
  const now = Date.now();
  for (const [key, value] of nonces) {
    if (value.expiresAt < now) nonces.delete(key);
  }
}

function makeNonce(): string {
  return crypto.randomBytes(16).toString("hex");
}

function priceBaseUnits(priceUsdc: number): bigint {
  return BigInt(Math.round(priceUsdc * 10 ** DECIMALS));
}

function paymentChallenge(nonce: string, priceUsdc: number) {
  return {
    scheme: "x402-solana",
    network: "solana-devnet",
    amount: priceUsdc.toString(),
    asset: "USDC",
    mint: MINT.toBase58(),
    recipient: TREASURY.toBase58(),
    nonce,
    expiresIn: NONCE_TTL_MS / 1000,
    instructions:
      "Send the listed amount in this SPL mint to the recipient ATA, then retry with X-Payment: <tx-signature>. Include the nonce in a memo on the same transaction.",
  };
}

const treasuryAta = getAssociatedTokenAddressSync(MINT, TREASURY);

async function verifyPayment(
  connection: Connection,
  signature: string,
  nonce: string,
  expectedAmount: bigint,
): Promise<{ ok: true } | { ok: false; reason: string }> {
  let tx: ParsedTransactionWithMeta | null;
  try {
    tx = await connection.getParsedTransaction(signature, {
      commitment: "confirmed",
      maxSupportedTransactionVersion: 0,
    });
  } catch (err) {
    return { ok: false, reason: `RPC error: ${(err as Error).message}` };
  }
  if (!tx) return { ok: false, reason: "Transaction not found" };
  if (tx.meta?.err) return { ok: false, reason: "Transaction reverted" };

  const innerIxs =
    tx.meta?.innerInstructions?.flatMap((g) => g.instructions) ?? [];
  const allIxs = [...tx.transaction.message.instructions, ...innerIxs];

  for (const ix of allIxs) {
    if (
      "parsed" in ix &&
      ix.program === "spl-token" &&
      (ix.parsed.type === "transfer" || ix.parsed.type === "transferChecked")
    ) {
      const info = ix.parsed.info as Record<string, unknown>;
      const dest = info.destination as string;
      if (dest !== treasuryAta.toBase58()) continue;
      const amountStr =
        (info.tokenAmount as { amount?: string })?.amount ??
        (info.amount as string | undefined);
      if (!amountStr) continue;
      const amount = BigInt(amountStr);
      if (amount < expectedAmount) {
        return {
          ok: false,
          reason: `Insufficient amount: ${amount} < ${expectedAmount}`,
        };
      }

      const memoIx = allIxs.find(
        (m) =>
          "parsed" in m &&
          m.program === "spl-memo" &&
          typeof m.parsed === "string",
      );
      const memo =
        memoIx && "parsed" in memoIx ? String(memoIx.parsed) : undefined;
      if (memo !== nonce) {
        return {
          ok: false,
          reason: `Nonce mismatch in memo (got ${memo ?? "none"})`,
        };
      }
      return { ok: true };
    }
  }
  return { ok: false, reason: "No matching SPL transfer to treasury found" };
}

// LI.FI Earn — live cross-chain stablecoin yield index.
// Earn Data API lives on earn.li.fi (li.quest is the Composer host).
const LIFI_EARN_BASE = "https://earn.li.fi";
const LIFI_API_KEY = process.env.LIFI_API_KEY ?? process.env.VITE_LIFI_API_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

interface EarnVaultLite {
  slug: string;
  name: string;
  chainId: number;
  network: string;
  protocol: { name: string };
  underlyingTokens: { symbol: string }[];
  analytics: {
    apy: { base: number | null; reward: number | null; total: number | null };
    tvl: { usd: string };
  };
}

interface RankedVaultLite {
  slug: string;
  protocol: string;
  network: string;
  apy: number;
  base: number;
  reward: number;
  tvl: number;
  rewardHeavy: boolean;
}

let cachedVaults: { ts: number; data: EarnVaultLite[] } | null = null;

// Symbols we accept as USDC-equivalent (matches the frontend ranker's
// alias group). LI.FI's Solana coverage is sparse, so we surface
// cross-chain USDC yield. The agent's payment is on Solana; the data the
// agent buys is cross-chain by design.
const USDC_SYMBOLS = new Set(["USDC", "USDC.E", "USDBC"]);

async function fetchTopUsdcVaults(): Promise<EarnVaultLite[]> {
  if (!LIFI_API_KEY) {
    console.warn("[briefing] LIFI_API_KEY not set — returning empty");
    return [];
  }
  if (cachedVaults && Date.now() - cachedVaults.ts < 60_000) {
    return cachedVaults.data;
  }
  // Walk pagination, collect any vault with a USDC-equivalent underlying
  // token. We stop at first hit count we can rank from (24 vaults is plenty
  // for top-3 reporting).
  const vaults: EarnVaultLite[] = [];
  let totalSeen = 0;
  let cursor: string | undefined;
  for (let page = 0; page < 20; page++) {
    const url = new URL(`${LIFI_EARN_BASE}/v1/vaults`);
    url.searchParams.set("minTvlUsd", "50000");
    if (cursor) url.searchParams.set("cursor", cursor);
    console.log(
      `[briefing] fetching LI.FI Earn page ${page}: ${url.toString()}`,
    );
    const res = await fetch(url.toString(), {
      headers: { "x-lifi-api-key": LIFI_API_KEY },
      signal: AbortSignal.timeout(8_000),
    });
    if (!res.ok) {
      const text = await res.text();
      console.error("[briefing] LI.FI Earn error:", res.status, text);
      throw new Error(`LI.FI Earn ${res.status}: ${text}`);
    }
    const body = (await res.json()) as {
      data: EarnVaultLite[];
      nextCursor?: string;
    };
    const pageData = body.data ?? [];
    totalSeen += pageData.length;
    for (const v of pageData) {
      const hasUsdc = v.underlyingTokens?.some((t) =>
        USDC_SYMBOLS.has(t.symbol?.toUpperCase()),
      );
      if (hasUsdc) vaults.push(v);
    }
    if (!body.nextCursor || pageData.length === 0) break;
    cursor = body.nextCursor;
    if (vaults.length >= 48) break; // collect a healthy candidate pool; the
    // risk filter discards a chunk so we want headroom
  }
  console.log(
    "[briefing] LI.FI walked",
    totalSeen,
    "vaults across pages,",
    vaults.length,
    "USDC vaults across chains",
  );
  cachedVaults = { ts: Date.now(), data: vaults };
  return vaults;
}

// Backwards alias for older callers in this file.
const fetchTopSolanaUsdcVaults = fetchTopUsdcVaults;

// Mirrors app/src/lib/ranker/risk-filter.ts. APY above 250% with TVL under
// $2M is almost always a honeypot or a freshly-emitting reward pool. The
// briefing should never headline these numbers.
const HIGH_RISK_APY = 250;
const HIGH_RISK_TVL = 2_000_000;
// Hard ceiling: anything claiming >1000% APY is a data error or an
// extreme outlier; surface it nowhere.
const ABSURD_APY = 1_000;
// One vault per protocol in the ranked output. A "top 3" should show three
// different protocols, not three pools from the same one.
const PROTOCOL_DIVERSITY_CAP = 1;

function rankVaults(vaults: EarnVaultLite[]): RankedVaultLite[] {
  const ranked = vaults
    .map((v) => {
      const apy = v.analytics.apy.total ?? 0;
      const reward = v.analytics.apy.reward ?? 0;
      const tvl = parseFloat(v.analytics.tvl.usd) || 0;
      return {
        slug: v.slug,
        protocol: v.protocol.name,
        network: v.network,
        apy,
        base: v.analytics.apy.base ?? 0,
        reward,
        tvl,
        rewardHeavy: apy > 0 && reward / apy > 0.6 && apy > 8,
        highRisk: apy > HIGH_RISK_APY && tvl < HIGH_RISK_TVL,
      };
    })
    .filter((v) => v.apy > 0)
    .filter((v) => v.apy < ABSURD_APY)
    .filter((v) => !v.highRisk)
    .sort((a, b) => b.apy - a.apy);

  // Protocol diversity: don't let one protocol monopolise the top set.
  const perProtocol = new Map<string, number>();
  const diverse: RankedVaultLite[] = [];
  for (const v of ranked) {
    const seen = perProtocol.get(v.protocol) ?? 0;
    if (seen >= PROTOCOL_DIVERSITY_CAP) continue;
    perProtocol.set(v.protocol, seen + 1);
    diverse.push(v);
  }
  return diverse;
}

function compactUsd(n: number): string {
  if (!Number.isFinite(n)) return "—";
  if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(2)}B`;
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
}

// Gemini wrapper for prose generation. Falls back to templated text if the
// key is missing or the API errors. Keeps the demo deterministic on flakes.
async function geminiSummarise(prompt: string): Promise<string | null> {
  if (!GEMINI_API_KEY) {
    console.warn("[gemini] GEMINI_API_KEY not set");
    return null;
  }
  try {
    console.log("[gemini] calling 2.5-flash-lite, prompt length:", prompt.length);
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.4, maxOutputTokens: 240 },
        }),
        signal: AbortSignal.timeout(8_000),
      },
    );
    if (!res.ok) {
      const text = await res.text();
      console.error("[gemini] API error:", res.status, text.slice(0, 240));
      return null;
    }
    const body = (await res.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
    };
    const text = body.candidates?.[0]?.content?.parts?.[0]?.text;
    if (typeof text === "string" && text.trim()) {
      console.log("[gemini] ok, response length:", text.trim().length);
      return text.trim();
    }
    console.warn("[gemini] empty/missing text in response:", JSON.stringify(body).slice(0, 240));
    return null;
  } catch (err) {
    console.error("[gemini] threw:", (err as Error).message);
    return null;
  }
}

// ─── Endpoint generators ─────────────────────────────────────────────────

async function generateBriefing(): Promise<string> {
  const ts = new Date().toISOString().replace("T", " ").slice(0, 16) + " UTC";
  let vaults: EarnVaultLite[] = [];
  try {
    vaults = await fetchTopSolanaUsdcVaults();
  } catch (err) {
    console.warn("[briefing] LI.FI fetch failed:", (err as Error).message);
  }

  const ranked = rankVaults(vaults);
  if (ranked.length === 0) {
    return `Cross-chain USDC briefing, ${ts}. LI.FI Earn feed returned no qualifying vaults on this fetch. Stablecoin yields generally cluster 4 to 6 percent across major lending markets. Risk note: pools with reward APY above 60 percent of the headline number stay flagged.`;
  }

  const top = ranked.slice(0, 3);
  const totalTvl = ranked.slice(0, 10).reduce((sum, v) => sum + v.tvl, 0);
  const rewardHeavy = ranked.find((v) => v.rewardHeavy);

  const dataSummary = top
    .map(
      (v) =>
        `${v.protocol} on ${v.network}: ${v.apy.toFixed(
          2,
        )}% APY, ${compactUsd(v.tvl)} TVL, ${v.reward.toFixed(
          2,
        )}% from rewards`,
    )
    .join(" / ");

  const geminiProse = await geminiSummarise(
    `Write a tight 4-sentence cross-chain USDC yield briefing dated ${ts} sourced from LI.FI Earn. Use these top USDC vaults right now: ${dataSummary}. Combined top-10 USDC TVL across chains: ${compactUsd(
      totalTvl,
    )}. ${
      rewardHeavy
        ? `Flag ${rewardHeavy.protocol} (${rewardHeavy.apy.toFixed(
            2,
          )}% APY, ${((rewardHeavy.reward / rewardHeavy.apy) * 100).toFixed(
            0,
          )}% from rewards) as caution.`
        : "No reward-heavy outliers in the top set."
    } Mention the chain each top vault sits on. Active voice. No em dashes. Concrete numbers, no platitudes.`,
  );
  if (geminiProse) return geminiProse;

  // Fallback: templated prose if Gemini is unavailable.
  const topLine = top
    .map((v) => `${v.protocol} on ${v.network} at ${v.apy.toFixed(2)} percent`)
    .join(", ");
  return `Cross-chain USDC briefing, ${ts}. Top vaults right now: ${topLine}. Combined TVL across the top ten qualifying USDC vaults sits at ${compactUsd(
    totalTvl,
  )}. ${
    rewardHeavy
      ? `Outlier flagged: ${
          rewardHeavy.protocol
        } at ${rewardHeavy.apy.toFixed(2)} percent, ${(
          (rewardHeavy.reward / rewardHeavy.apy) *
          100
        ).toFixed(0)} percent from rewards. Treat as caution.`
      : "No reward-heavy outliers in the top set."
  } Risk note: pools with reward APY above 60 percent of the headline number stay flagged.`;
}

async function generateYieldSnapshot(): Promise<{
  ts: string;
  top: { protocol: string; network: string; apy: number; tvl: number }[];
  oneLine: string;
}> {
  const ts = new Date().toISOString();
  const vaults = await fetchTopUsdcVaults().catch(() => []);
  const ranked = rankVaults(vaults).slice(0, 3);
  const oneLine =
    ranked.length === 0
      ? "LI.FI Earn returned no qualifying USDC vaults this fetch."
      : ranked
          .map((v) => `${v.protocol} on ${v.network} ${v.apy.toFixed(2)}%`)
          .join(" · ");
  return {
    ts,
    top: ranked.map((v) => ({
      protocol: v.protocol,
      network: v.network,
      apy: parseFloat(v.apy.toFixed(2)),
      tvl: v.tvl,
    })),
    oneLine,
  };
}

// In-memory tier history per slug. The /alert-check endpoint compares the
// current tier (top-3 / outside-top-3 / unranked) to the last seen tier and
// reports a change if any.
const lastSeenTier = new Map<string, "top3" | "ranked" | "unranked">();

async function generateAlertCheck(slug: string): Promise<{
  ts: string;
  slug: string;
  changed: boolean;
  current: "top3" | "ranked" | "unranked";
  previous: "top3" | "ranked" | "unranked" | null;
  apy: number | null;
  reason: string;
}> {
  const ts = new Date().toISOString();
  const vaults = await fetchTopSolanaUsdcVaults().catch(() => []);
  const ranked = rankVaults(vaults);
  const idx = ranked.findIndex((v) => v.slug === slug);
  let current: "top3" | "ranked" | "unranked";
  let apy: number | null = null;
  if (idx === -1) {
    current = "unranked";
  } else {
    apy = parseFloat(ranked[idx]!.apy.toFixed(2));
    current = idx < 3 ? "top3" : "ranked";
  }
  const previous = lastSeenTier.get(slug) ?? null;
  const changed = previous !== null && previous !== current;
  lastSeenTier.set(slug, current);
  const reason = changed
    ? `Tier moved from ${previous} to ${current}.`
    : previous === null
      ? "First check; no prior baseline."
      : "No tier change.";
  return { ts, slug, changed, current, previous, apy, reason };
}

async function generateSynthesis(input: string): Promise<string> {
  const ts = new Date().toISOString().replace("T", " ").slice(0, 16) + " UTC";
  if (!input || typeof input !== "string") {
    return `Synthesis at ${ts}: input was empty.`;
  }
  const prose = await geminiSummarise(
    `You are summarising agent-collected data for a user.\nData: ${input.slice(
      0,
      4000,
    )}\nWrite a single tight paragraph (3 sentences max) explaining what changed and what it implies. Active voice. No em dashes. No filler.`,
  );
  return (
    prose ??
    `Synthesis at ${ts}: ${input.slice(0, 240)}${
      input.length > 240 ? "…" : ""
    }`
  );
}

// ─── x402 middleware ─────────────────────────────────────────────────────

type PaidHandler<TBody = unknown> = (req: Request, res: Response) => Promise<{
  body: TBody;
  status?: number;
}>;

function paidEndpoint<TBody>(
  endpointName: string,
  priceUsdc: number,
  handler: PaidHandler<TBody>,
) {
  const expectedBaseUnits = priceBaseUnits(priceUsdc);

  return async (req: Request, res: Response) => {
    pruneNonces();

    const signature = req.header("X-Payment");
    const nonceHeader = req.header("X-Payment-Nonce");

    if (!signature || !nonceHeader) {
      const nonce = makeNonce();
      nonces.set(nonce, {
        amount: expectedBaseUnits,
        endpoint: endpointName,
        expiresAt: Date.now() + NONCE_TTL_MS,
        consumed: false,
      });
      return res
        .status(402)
        .setHeader("WWW-Authenticate", "x402-solana")
        .json({ payment: paymentChallenge(nonce, priceUsdc) });
    }

    const record = nonces.get(nonceHeader);
    if (!record) {
      return res.status(400).json({ error: "Unknown or expired nonce" });
    }
    if (record.endpoint !== endpointName) {
      return res
        .status(400)
        .json({ error: `Nonce was issued for ${record.endpoint}` });
    }
    if (record.consumed) {
      return res.status(409).json({ error: "Nonce already consumed (replay)" });
    }
    if (record.expiresAt < Date.now()) {
      return res.status(410).json({ error: "Payment challenge expired" });
    }

    const verification = await verifyPayment(
      connection,
      signature,
      nonceHeader,
      record.amount,
    );
    if (!verification.ok) {
      return res.status(402).json({ error: verification.reason });
    }
    record.consumed = true;

    try {
      const result = await handler(req, res);
      const body = {
        ...(typeof result.body === "object" && result.body
          ? (result.body as Record<string, unknown>)
          : { result: result.body }),
        paid: { signature, amount: priceUsdc, asset: "USDC", endpoint: endpointName },
      };
      return res.status(result.status ?? 200).json(body);
    } catch (err) {
      console.error(`[${endpointName}] handler error:`, err);
      return res
        .status(500)
        .json({ error: (err as Error).message ?? "internal error" });
    }
  };
}

// ─── App ────────────────────────────────────────────────────────────────

const app = express();
app.use(express.json({ limit: "256kb" }));
app.use((_, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, X-Payment, X-Payment-Nonce",
  );
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  next();
});

const PAID_ROUTES = ["/brief", "/yield-snapshot", "/alert-check", "/synthesize"];
for (const route of PAID_ROUTES) {
  app.options(route, (_, res) => res.status(204).end());
}

const connection = new Connection(RPC, "confirmed");

app.post(
  "/brief",
  paidEndpoint("brief", 0.2, async () => {
    const briefing = await generateBriefing();
    return { body: { briefing } };
  }),
);

app.post(
  "/yield-snapshot",
  paidEndpoint("yield-snapshot", 0.05, async () => {
    const snapshot = await generateYieldSnapshot();
    return { body: snapshot };
  }),
);

app.post(
  "/alert-check",
  paidEndpoint<Record<string, unknown>>("alert-check", 0.05, async (req) => {
    const slug = String(req.body?.slug ?? "").trim();
    if (!slug) {
      return {
        body: { error: "Missing slug in request body" },
        status: 400,
      };
    }
    const result = await generateAlertCheck(slug);
    return { body: result };
  }),
);

app.post(
  "/synthesize",
  paidEndpoint("synthesize", 0.1, async (req) => {
    const input = typeof req.body?.input === "string" ? req.body.input : "";
    const synthesis = await generateSynthesis(input);
    return { body: { synthesis } };
  }),
);

// Free wrap-up endpoint, no x402. Called by the autonomous loop after
// complete_task settles, to ask Gemini for a one-paragraph summary of what
// the agent paid to learn during the run. Free because the agent already
// paid for every iteration; the wrap-up is just stitching them together.
app.post("/wrap-up", async (req, res) => {
  const goal = typeof req.body?.goal === "string" ? req.body.goal : "(no goal)";
  const iterations = Array.isArray(req.body?.iterations)
    ? (req.body.iterations as Array<{
        endpoint?: string;
        amount?: number;
        result?: string;
      }>)
    : [];
  if (iterations.length === 0) {
    return res.json({
      summary:
        "The agent stopped before completing any paid iterations. Nothing to summarise.",
    });
  }
  const totalSpent = iterations.reduce(
    (sum, it) => sum + (typeof it.amount === "number" ? it.amount : 0),
    0,
  );
  const breakdown = iterations
    .slice(-12)
    .map(
      (it, i) =>
        `[${i + 1}] ${it.endpoint ?? "?"} ($${(it.amount ?? 0).toFixed(
          2,
        )}): ${(it.result ?? "").slice(0, 220)}`,
    )
    .join("\n");

  const goalMentionsSolana = /solana/i.test(goal);
  const dataNote = goalMentionsSolana
    ? `\nNote: the user's goal mentions Solana, but LI.FI Earn's USDC index is currently EVM-heavy; the agent surfaced the strongest cross-chain alternatives instead. Mention this honestly in the wrap-up if relevant.`
    : "";

  const prose = await geminiSummarise(
    `An autonomous AI agent on Solana ran a recurring task over a USDC budget. The user's goal was: "${goal}".\nThe agent paid for ${iterations.length} services totalling ${totalSpent.toFixed(2)} USDC. Most recent results:\n${breakdown}${dataNote}\n\nWrite a tight 3-sentence wrap-up summarising what the agent learned and any signal worth flagging. Active voice. No em dashes. Concrete numbers from the results, no platitudes.`,
  );

  return res.json({
    summary:
      prose ??
      `Agent paid for ${iterations.length} services totalling $${totalSpent.toFixed(
        2,
      )} USDC. Most recent observation: ${
        iterations[iterations.length - 1]?.result?.slice(0, 240) ?? "—"
      }`,
    totalSpent,
    iterationCount: iterations.length,
  });
});

app.get("/services", (_, res) => {
  res.json({
    services: [
      { endpoint: "/brief", price: 0.2, description: "Long-form cross-chain USDC briefing from LI.FI Earn + Gemini" },
      { endpoint: "/yield-snapshot", price: 0.05, description: "Top 3 USDC vaults across chains right now" },
      { endpoint: "/alert-check", price: 0.05, description: "Did this vault's tier change?" },
      { endpoint: "/synthesize", price: 0.1, description: "Synthesize accumulated context into prose" },
    ],
    treasury: TREASURY.toBase58(),
    mint: MINT.toBase58(),
  });
});

app.get("/health", (_, res) => {
  res.json({
    ok: true,
    treasury: TREASURY.toBase58(),
    services: PAID_ROUTES,
  });
});

app.listen(PORT, () => {
  console.log(`Sage paid-services on :${PORT}`);
  console.log(`  treasury: ${TREASURY.toBase58()}`);
  console.log(`  treasury ATA: ${treasuryAta.toBase58()}`);
  console.log(`  mint: ${MINT.toBase58()}`);
  console.log(`  services: ${PAID_ROUTES.join(", ")}`);
  console.log(`  gemini: ${GEMINI_API_KEY ? "enabled" : "disabled (fallback prose)"}`);
});
