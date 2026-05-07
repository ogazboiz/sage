import { AnchorProvider, Program, BN } from "@coral-xyz/anchor";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";
import {
  Connection,
  PublicKey,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
  type ConfirmOptions,
  type Transaction,
  type VersionedTransaction,
} from "@solana/web3.js";

import { IDL, type SageVault } from "./idl";
import { deriveUserVaultPda } from "./pdas";

const DEFAULT_CONFIRM: ConfirmOptions = { commitment: "confirmed" };

export type SageProgram = Program<SageVault>;

// Minimal wallet shape that matches both NodeWallet and the browser
// wallet-adapter's AnchorWallet, without leaking framework imports.
export interface SageSigner {
  publicKey: PublicKey;
  signTransaction<T extends Transaction | VersionedTransaction>(tx: T): Promise<T>;
  signAllTransactions<T extends Transaction | VersionedTransaction>(txs: T[]): Promise<T[]>;
}

export interface CreateProgramArgs {
  connection: Connection;
  wallet: SageSigner;
  confirmOptions?: ConfirmOptions;
}

export function createSageProgram({
  connection,
  wallet,
  confirmOptions = DEFAULT_CONFIRM,
}: CreateProgramArgs): SageProgram {
  // AnchorProvider's Wallet type expects a `payer` but never uses it at
  // runtime in browser flows. Cast to satisfy the type-checker only.
  const provider = new AnchorProvider(
    connection,
    wallet as unknown as AnchorProvider["wallet"],
    confirmOptions,
  );
  return new Program<SageVault>(IDL, provider);
}

export interface VaultAddresses {
  vaultPda: PublicKey;
  vaultBump: number;
  vaultUsdc: PublicKey;
  ownerUsdc: PublicKey;
}

export function deriveVaultAddresses(
  owner: PublicKey,
  usdcMint: PublicKey,
): VaultAddresses {
  const [vaultPda, vaultBump] = deriveUserVaultPda(owner);
  const vaultUsdc = getAssociatedTokenAddressSync(usdcMint, vaultPda, true);
  const ownerUsdc = getAssociatedTokenAddressSync(usdcMint, owner, false);
  return { vaultPda, vaultBump, vaultUsdc, ownerUsdc };
}

export async function fetchUserVault(
  program: SageProgram,
  owner: PublicKey,
) {
  const [vaultPda] = deriveUserVaultPda(owner);
  try {
    return await program.account.userVault.fetch(vaultPda);
  } catch {
    return null;
  }
}

export interface InitVaultArgs {
  program: SageProgram;
  owner: PublicKey;
  agentKeypair: PublicKey;
  usdcMint: PublicKey;
}

export async function buildInitVaultIx({
  program,
  owner,
  agentKeypair,
  usdcMint,
}: InitVaultArgs) {
  const { vaultPda, vaultUsdc } = deriveVaultAddresses(owner, usdcMint);
  return program.methods
    .initUserVault(agentKeypair)
    .accounts({
      userVault: vaultPda,
      usdcMint,
      vaultUsdc,
      owner,
      systemProgram: SystemProgram.programId,
      tokenProgram: TOKEN_PROGRAM_ID,
      associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      rent: SYSVAR_RENT_PUBKEY,
    } as never)
    .instruction();
}

export interface DepositArgs {
  program: SageProgram;
  owner: PublicKey;
  usdcMint: PublicKey;
  amount: bigint;
}

export async function buildDepositIx({
  program,
  owner,
  usdcMint,
  amount,
}: DepositArgs) {
  const { vaultPda, vaultUsdc, ownerUsdc } = deriveVaultAddresses(
    owner,
    usdcMint,
  );
  return program.methods
    .deposit(new BN(amount.toString()))
    .accounts({
      userVault: vaultPda,
      vaultUsdc,
      ownerUsdc,
      owner,
      tokenProgram: TOKEN_PROGRAM_ID,
    } as never)
    .instruction();
}

export interface ApproveTaskArgs {
  program: SageProgram;
  owner: PublicKey;
  usdcMint: PublicKey;
  taskId: Uint8Array;
  budget: bigint;
  expiresAt: bigint;
}

export async function buildApproveTaskIx({
  program,
  owner,
  usdcMint,
  taskId,
  budget,
  expiresAt,
}: ApproveTaskArgs) {
  if (taskId.length !== 32) {
    throw new Error("taskId must be 32 bytes");
  }
  const { vaultPda, vaultUsdc } = deriveVaultAddresses(owner, usdcMint);
  return program.methods
    .approveTask(
      Array.from(taskId) as unknown as number[],
      new BN(budget.toString()),
      new BN(expiresAt.toString()),
    )
    .accounts({
      userVault: vaultPda,
      vaultUsdc,
      owner,
    } as never)
    .instruction();
}

export interface ReleaseStepArgs {
  program: SageProgram;
  owner: PublicKey;
  usdcMint: PublicKey;
  signer: PublicKey;
  recipientUsdc: PublicKey;
  taskId: Uint8Array;
  amount: bigint;
}

export async function buildReleaseStepIx({
  program,
  owner,
  usdcMint,
  signer,
  recipientUsdc,
  taskId,
  amount,
}: ReleaseStepArgs) {
  const { vaultPda, vaultUsdc } = deriveVaultAddresses(owner, usdcMint);
  return program.methods
    .releaseStep(
      Array.from(taskId) as unknown as number[],
      new BN(amount.toString()),
    )
    .accounts({
      userVault: vaultPda,
      vaultUsdc,
      recipientUsdc,
      signer,
      tokenProgram: TOKEN_PROGRAM_ID,
    } as never)
    .instruction();
}

export interface CompleteTaskArgs {
  program: SageProgram;
  owner: PublicKey;
  signer: PublicKey;
  taskId: Uint8Array;
}

export async function buildCompleteTaskIx({
  program,
  owner,
  signer,
  taskId,
}: CompleteTaskArgs) {
  const [vaultPda] = deriveUserVaultPda(owner);
  return program.methods
    .completeTask(Array.from(taskId) as unknown as number[])
    .accounts({
      userVault: vaultPda,
      signer,
    } as never)
    .instruction();
}

export interface WithdrawArgs {
  program: SageProgram;
  owner: PublicKey;
  usdcMint: PublicKey;
  amount: bigint;
}

export async function buildWithdrawIx({
  program,
  owner,
  usdcMint,
  amount,
}: WithdrawArgs) {
  const { vaultPda, vaultUsdc, ownerUsdc } = deriveVaultAddresses(
    owner,
    usdcMint,
  );
  return program.methods
    .withdraw(new BN(amount.toString()))
    .accounts({
      userVault: vaultPda,
      vaultUsdc,
      ownerUsdc,
      owner,
      tokenProgram: TOKEN_PROGRAM_ID,
    } as never)
    .instruction();
}
