import express from "express";
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

const PRICE_USDC = 0.2;
const DECIMALS = 6;
const PRICE_BASE_UNITS = BigInt(Math.round(PRICE_USDC * 10 ** DECIMALS));
const NONCE_TTL_MS = 5 * 60 * 1000;

interface NonceRecord {
  amount: bigint;
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

function paymentChallenge(nonce: string) {
  return {
    scheme: "x402-solana",
    network: "solana-devnet",
    amount: PRICE_USDC.toString(),
    asset: "USDC",
    mint: MINT.toBase58(),
    recipient: TREASURY.toBase58(),
    nonce,
    expiresIn: NONCE_TTL_MS / 1000,
    instructions:
      "Send the listed amount in this SPL mint to the recipient ATA, then retry with X-Payment: <tx-signature>. Include the nonce in a memo or as the first 32 bytes of the transaction message reference.",
  };
}

const treasuryAta = getAssociatedTokenAddressSync(MINT, TREASURY);

async function verifyPayment(
  connection: Connection,
  signature: string,
  nonce: string,
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

  const innerIxs = tx.meta?.innerInstructions?.flatMap((g) => g.instructions) ?? [];
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
      if (amount < PRICE_BASE_UNITS) {
        return {
          ok: false,
          reason: `Insufficient amount: ${amount} < ${PRICE_BASE_UNITS}`,
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

async function generateBriefing(): Promise<string> {
  // Stubbed for the demo; swap for a Claude/Gemini call when keys are available.
  return [
    "Solana DeFi briefing, demo edition.",
    "Stablecoin yields stayed in the 4–5 percent range across Kamino and Marginfi this week.",
    "MEV-aware liquidity continues to favour Drift and Phoenix. Watch the ETH/SOL pair on Orca for unusual depth.",
    "Risk note: avoid pools with reward APY over 60% of the headline number.",
  ].join(" ");
}

const app = express();
app.use(express.json());
app.use((_, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, X-Payment, X-Payment-Nonce",
  );
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  next();
});

app.options("/brief", (_, res) => {
  res.status(204).end();
});

const connection = new Connection(RPC, "confirmed");

app.post("/brief", async (req, res) => {
  pruneNonces();

  const signature = req.header("X-Payment");
  const nonceHeader = req.header("X-Payment-Nonce");

  if (!signature || !nonceHeader) {
    const nonce = makeNonce();
    nonces.set(nonce, {
      amount: PRICE_BASE_UNITS,
      expiresAt: Date.now() + NONCE_TTL_MS,
      consumed: false,
    });
    return res
      .status(402)
      .setHeader("WWW-Authenticate", "x402-solana")
      .json({ payment: paymentChallenge(nonce) });
  }

  const record = nonces.get(nonceHeader);
  if (!record) {
    return res.status(400).json({ error: "Unknown or expired nonce" });
  }
  if (record.consumed) {
    return res.status(409).json({ error: "Nonce already consumed (replay)" });
  }
  if (record.expiresAt < Date.now()) {
    return res.status(410).json({ error: "Payment challenge expired" });
  }

  const verification = await verifyPayment(connection, signature, nonceHeader);
  if (!verification.ok) {
    return res.status(402).json({ error: verification.reason });
  }
  record.consumed = true;

  const briefing = await generateBriefing();
  return res.status(200).json({
    briefing,
    paid: { signature, amount: PRICE_USDC, asset: "USDC" },
  });
});

app.get("/health", (_, res) => {
  res.json({ ok: true, treasury: TREASURY.toBase58(), price: PRICE_USDC });
});

app.listen(PORT, () => {
  console.log(`Sage briefing service on :${PORT}`);
  console.log(`  treasury: ${TREASURY.toBase58()}`);
  console.log(`  treasury ATA: ${treasuryAta.toBase58()}`);
  console.log(`  mint: ${MINT.toBase58()}`);
});
