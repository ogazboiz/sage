import { fromBaseUnits } from "./constants";
import type { SageProgram } from "./program";
import { deriveUserVaultPda } from "./pdas";
import type { PublicKey } from "@solana/web3.js";

export interface VaultSnapshot {
  exists: boolean;
  totalDepositedUsdc: number;
  totalSpentUsdc: number;
  vaultBalanceUsdc?: number;
  activeTask: {
    taskId: string;
    budgetRemainingUsdc: number;
    expiresAt: number;
    stepsExecuted: number;
  } | null;
}

export async function snapshotVault(
  program: SageProgram,
  owner: PublicKey,
): Promise<VaultSnapshot> {
  const [vaultPda] = deriveUserVaultPda(owner);
  const account = await program.account.userVault.fetchNullable(vaultPda);
  if (!account) {
    return {
      exists: false,
      totalDepositedUsdc: 0,
      totalSpentUsdc: 0,
      activeTask: null,
    };
  }
  const task = account.activeTask
    ? {
        taskId: Buffer.from(account.activeTask.taskId).toString("hex"),
        budgetRemainingUsdc: fromBaseUnits(
          BigInt(account.activeTask.budgetRemaining.toString()),
        ),
        expiresAt: Number(account.activeTask.expiresAt.toString()),
        stepsExecuted: account.activeTask.stepsExecuted,
      }
    : null;
  return {
    exists: true,
    totalDepositedUsdc: fromBaseUnits(
      BigInt(account.totalDeposited.toString()),
    ),
    totalSpentUsdc: fromBaseUnits(BigInt(account.totalSpent.toString())),
    activeTask: task,
  };
}
