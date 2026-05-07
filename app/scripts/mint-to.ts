import {
  Connection,
  Keypair,
  PublicKey,
  clusterApiUrl,
} from "@solana/web3.js";
import {
  createAssociatedTokenAccountIdempotent,
  getAssociatedTokenAddressSync,
  mintTo,
} from "@solana/spl-token";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const RPC = process.env.RPC ?? clusterApiUrl("devnet");
const MINT = new PublicKey(
  process.env.MINT ?? "EzAYN6m9yDhwKHRdt9iY9LCgpPDdCXrUtmfoj7PWNYon",
);
const DECIMALS = 6;

async function main() {
  const recipient = process.argv[2];
  const amount = parseFloat(process.argv[3] ?? "100");
  if (!recipient) {
    console.error(
      "Usage: tsx scripts/mint-to.ts <recipient-pubkey> [amount=100]",
    );
    process.exit(1);
  }

  const recipientKey = new PublicKey(recipient);
  const payer = Keypair.fromSecretKey(
    Uint8Array.from(
      JSON.parse(
        fs.readFileSync(
          path.join(os.homedir(), ".config/solana/id.json"),
          "utf8",
        ),
      ),
    ),
  );
  const connection = new Connection(RPC, "confirmed");

  console.log(`Minting ${amount} SAGE-USDC to ${recipient}`);
  const ata = await createAssociatedTokenAccountIdempotent(
    connection,
    payer,
    MINT,
    recipientKey,
  );
  const sig = await mintTo(
    connection,
    payer,
    MINT,
    ata,
    payer,
    BigInt(Math.round(amount * 10 ** DECIMALS)),
  );
  console.log(`ATA: ${ata.toBase58()}`);
  console.log(`Tx: ${sig}`);
  console.log(`https://solscan.io/tx/${sig}?cluster=devnet`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
