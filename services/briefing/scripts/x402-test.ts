import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  TransactionInstruction,
  clusterApiUrl,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import {
  createAssociatedTokenAccountIdempotentInstruction,
  createTransferCheckedInstruction,
  getAssociatedTokenAddressSync,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const SERVICE = process.env.SERVICE ?? "http://localhost:3001";
const RPC = process.env.RPC ?? clusterApiUrl("devnet");

const MEMO_PROGRAM = new PublicKey(
  "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr",
);

function loadKey(): Keypair {
  const p = path.join(os.homedir(), ".config/solana/id.json");
  return Keypair.fromSecretKey(
    Uint8Array.from(JSON.parse(fs.readFileSync(p, "utf8"))),
  );
}

interface Challenge {
  payment: {
    amount: string;
    mint: string;
    recipient: string;
    nonce: string;
  };
}

async function main() {
  console.log("[1] GET /brief without payment");
  let res = await fetch(`${SERVICE}/brief`, { method: "POST" });
  if (res.status !== 402) {
    throw new Error(`Expected 402, got ${res.status}`);
  }
  const challenge = (await res.json()) as Challenge;
  console.log("    ✓ 402 received, nonce:", challenge.payment.nonce);

  const payer = loadKey();
  const connection = new Connection(RPC, "confirmed");
  const mint = new PublicKey(challenge.payment.mint);
  const recipient = new PublicKey(challenge.payment.recipient);

  const senderAta = getAssociatedTokenAddressSync(mint, payer.publicKey);
  const recipientAta = getAssociatedTokenAddressSync(mint, recipient);

  const amount = BigInt(Math.round(parseFloat(challenge.payment.amount) * 10 ** 6));
  console.log(`[2] Building SPL transfer of ${amount.toString()} units`);

  const tx = new Transaction();
  tx.add(
    createAssociatedTokenAccountIdempotentInstruction(
      payer.publicKey,
      recipientAta,
      recipient,
      mint,
    ),
  );
  tx.add(
    createTransferCheckedInstruction(
      senderAta,
      mint,
      recipientAta,
      payer.publicKey,
      amount,
      6,
      [],
      TOKEN_PROGRAM_ID,
    ),
  );
  tx.add(
    new TransactionInstruction({
      keys: [],
      programId: MEMO_PROGRAM,
      data: Buffer.from(challenge.payment.nonce, "utf8"),
    }),
  );

  const signature = await sendAndConfirmTransaction(connection, tx, [payer], {
    commitment: "confirmed",
  });
  console.log(`    ✓ tx ${signature}`);
  console.log(`    https://solscan.io/tx/${signature}?cluster=devnet`);

  console.log("[3] POST /brief with X-Payment");
  res = await fetch(`${SERVICE}/brief`, {
    method: "POST",
    headers: {
      "X-Payment": signature,
      "X-Payment-Nonce": challenge.payment.nonce,
    },
  });
  const body = await res.json();
  console.log(`    status: ${res.status}`);
  console.log("    body:", JSON.stringify(body, null, 2));

  if (res.status !== 200) {
    throw new Error("Expected 200 after payment");
  }
  console.log("\nx402 payment flow works end-to-end.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
