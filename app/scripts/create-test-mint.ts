import {
  Connection,
  Keypair,
  clusterApiUrl,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import {
  createMint,
  getOrCreateAssociatedTokenAccount,
  mintTo,
} from "@solana/spl-token";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const RPC = process.env.RPC ?? clusterApiUrl("devnet");
const DECIMALS = 6;
const MINT_AMOUNT = 10_000;

async function main() {
  const keypairPath = path.join(os.homedir(), ".config/solana/id.json");
  const secret = JSON.parse(fs.readFileSync(keypairPath, "utf8"));
  const payer = Keypair.fromSecretKey(Uint8Array.from(secret));
  console.log("Payer:", payer.publicKey.toBase58());

  const connection = new Connection(RPC, "confirmed");
  const balance = await connection.getBalance(payer.publicKey);
  console.log("Balance:", (balance / LAMPORTS_PER_SOL).toFixed(4), "SOL");

  console.log("Creating mint...");
  const mint = await createMint(
    connection,
    payer,
    payer.publicKey, // mint authority
    payer.publicKey, // freeze authority (we own it; can revoke later)
    DECIMALS,
  );
  console.log("Mint:", mint.toBase58());

  console.log("Creating ATA + minting", MINT_AMOUNT, "tokens to payer...");
  const ata = await getOrCreateAssociatedTokenAccount(
    connection,
    payer,
    mint,
    payer.publicKey,
  );
  const sig = await mintTo(
    connection,
    payer,
    mint,
    ata.address,
    payer,
    BigInt(MINT_AMOUNT) * BigInt(10 ** DECIMALS),
  );
  console.log("ATA:", ata.address.toBase58());
  console.log("Mint tx:", sig);

  console.log("\nDone. Add to app/.env.local:");
  console.log(`VITE_SAGE_USDC_MINT=${mint.toBase58()}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
