import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  clusterApiUrl,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
} from "@solana/web3.js";
import { AnchorProvider, Program, Wallet } from "@coral-xyz/anchor";
import BN from "bn.js";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  getAssociatedTokenAddressSync,
  getAccount,
  createAssociatedTokenAccountIdempotent,
  mintTo,
} from "@solana/spl-token";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import idl from "../src/lib/sage-sdk/idl.json";
import type { SageVault } from "../src/lib/sage-sdk/types";

const RPC = process.env.RPC ?? clusterApiUrl("devnet");
const MINT_STR =
  process.env.MINT ?? "EzAYN6m9yDhwKHRdt9iY9LCgpPDdCXrUtmfoj7PWNYon";

function loadKey(): Keypair {
  const p = path.join(os.homedir(), ".config/solana/id.json");
  return Keypair.fromSecretKey(
    Uint8Array.from(JSON.parse(fs.readFileSync(p, "utf8"))),
  );
}

function deriveVault(owner: PublicKey, programId: PublicKey) {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("user_vault"), owner.toBuffer()],
    programId,
  );
}

async function main() {
  const payer = loadKey();
  const connection = new Connection(RPC, "confirmed");
  const provider = new AnchorProvider(connection, new Wallet(payer), {
    commitment: "confirmed",
  });
  const program = new Program<SageVault>(idl as unknown as SageVault, provider);
  const programId = program.programId;
  const mint = new PublicKey(MINT_STR);
  const owner = payer.publicKey;

  console.log("Program:", programId.toBase58());
  console.log("Owner:", owner.toBase58());
  console.log("Mint:", mint.toBase58());

  const [vaultPda] = deriveVault(owner, programId);
  const vaultUsdc = getAssociatedTokenAddressSync(mint, vaultPda, true);
  const ownerUsdc = getAssociatedTokenAddressSync(mint, owner);

  // Create owner ATA if needed
  await createAssociatedTokenAccountIdempotent(connection, payer, mint, owner);

  // Top up owner with mint authority (it's us)
  await mintTo(connection, payer, mint, ownerUsdc, payer, 1_000_000n); // 1 SAGE-USDC
  console.log("Topped up owner ATA");

  // 1) init_user_vault (skip if already exists)
  const existing = await program.account.userVault.fetchNullable(vaultPda);
  if (!existing) {
    const agent = Keypair.generate();
    console.log("Init vault, agent:", agent.publicKey.toBase58());
    await program.methods
      .initUserVault(agent.publicKey)
      .accounts({
        userVault: vaultPda,
        usdcMint: mint,
        vaultUsdc,
        owner,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        rent: SYSVAR_RENT_PUBKEY,
      } as never)
      .rpc();
  } else {
    console.log("Vault already exists, agent:", existing.agentKeypair.toBase58());
  }

  // 2) deposit
  const depositAmount = 500_000n; // 0.5 SAGE-USDC
  console.log("Deposit", depositAmount.toString());
  await program.methods
    .deposit(new BN(depositAmount.toString()))
    .accounts({
      userVault: vaultPda,
      vaultUsdc,
      ownerUsdc,
      owner,
      tokenProgram: TOKEN_PROGRAM_ID,
    } as never)
    .rpc();

  let vaultUsdcAccount = await getAccount(connection, vaultUsdc);
  console.log("Vault balance:", vaultUsdcAccount.amount.toString());

  // 3) approve_task
  const taskId = new Uint8Array(32);
  crypto.getRandomValues(taskId);
  const budget = 100_000n; // 0.1 SAGE-USDC
  const expiresAt = Math.floor(Date.now() / 1000) + 600; // 10 min
  console.log("Approve task budget", budget.toString());
  await program.methods
    .approveTask(
      Array.from(taskId) as unknown as number[],
      new BN(budget.toString()),
      new BN(expiresAt),
    )
    .accounts({ userVault: vaultPda, vaultUsdc, owner } as never)
    .rpc();

  // 4) release_step (transfer to owner ATA for the demo)
  console.log("Release step 50_000 to owner ATA");
  await program.methods
    .releaseStep(
      Array.from(taskId) as unknown as number[],
      new BN(50_000),
    )
    .accounts({
      userVault: vaultPda,
      vaultUsdc,
      recipientUsdc: ownerUsdc,
      signer: owner,
      tokenProgram: TOKEN_PROGRAM_ID,
    } as never)
    .rpc();

  // 5) complete_task
  console.log("Complete task");
  await program.methods
    .completeTask(Array.from(taskId) as unknown as number[])
    .accounts({ userVault: vaultPda, signer: owner } as never)
    .rpc();

  const v = await program.account.userVault.fetch(vaultPda);
  console.log("\nFinal vault state:");
  console.log("  total_deposited:", v.totalDeposited.toString());
  console.log("  total_spent:", v.totalSpent.toString());
  console.log("  active_task:", v.activeTask ? "yes" : "none");

  vaultUsdcAccount = await getAccount(connection, vaultUsdc);
  console.log("  vault USDC balance:", vaultUsdcAccount.amount.toString());

  // 6) withdraw remaining
  console.log("\nWithdraw all");
  await program.methods
    .withdraw(new BN(vaultUsdcAccount.amount.toString()))
    .accounts({
      userVault: vaultPda,
      vaultUsdc,
      ownerUsdc,
      owner,
      tokenProgram: TOKEN_PROGRAM_ID,
    } as never)
    .rpc();

  const finalVault = await getAccount(connection, vaultUsdc);
  console.log("  vault USDC after withdraw:", finalVault.amount.toString());

  console.log("\nSmoke test passed.");
  void Transaction;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
