import { toUint8Array } from 'js-base64'
import { fromBaseUnits } from './constants'

export interface VaultState {
  exists: boolean
  totalDeposited: number
  totalSpent: number
  activeTask: {
    budgetRemaining: number
    expiresAt: number
    stepsExecuted: number
  } | null
}

// Decode borsh-serialised UserVault account produced by the Anchor program.
// Layout (all little-endian):
//  [0..8]   discriminator
//  [8..40]  owner: Pubkey
//  [40..72] agent_keypair: Pubkey
//  [72..104] usdc_mint: Pubkey
//  [104]    Option flag (0=None, 1=Some<TaskState>)
//  if Some:
//    [105..137] task_id: [u8;32]
//    [137..145] budget_remaining: u64
//    [145..153] expires_at: i64
//    [153]      steps_executed: u8  → offset becomes 154
//  [next]   total_deposited: u64
//  [next+8] total_spent: u64
//  [next+16] bump: u8
export function decodeVaultAccount(base64Data: string): VaultState {
  let bytes: Uint8Array
  try {
    bytes = toUint8Array(base64Data)
  } catch {
    return { exists: false, totalDeposited: 0, totalSpent: 0, activeTask: null }
  }

  if (!bytes || bytes.length < 120) {
    return { exists: false, totalDeposited: 0, totalSpent: 0, activeTask: null }
  }

  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  let offset = 104  // skip disc + owner + agent + mint

  const hasTask = bytes[offset] === 1
  offset += 1

  let activeTask = null
  if (hasTask) {
    offset += 32  // task_id
    const budgetRemaining = view.getBigUint64(offset, true); offset += 8
    const expiresAt       = view.getBigInt64(offset, true);  offset += 8
    const stepsExecuted   = bytes[offset];                   offset += 1
    activeTask = {
      budgetRemaining: fromBaseUnits(budgetRemaining),
      expiresAt: Number(expiresAt),
      stepsExecuted,
    }
  }

  const totalDeposited = view.getBigUint64(offset, true); offset += 8
  const totalSpent     = view.getBigUint64(offset, true)

  return {
    exists: true,
    totalDeposited: fromBaseUnits(totalDeposited),
    totalSpent: fromBaseUnits(totalSpent),
    activeTask,
  }
}
