import { Address, Instruction, AccountRole, getAddressEncoder } from '@solana/kit'
import {
  PROGRAM_ADDRESS, TOKEN_PROGRAM, ASSOC_TOKEN_PROGRAM,
  SYSTEM_PROGRAM, SYSVAR_RENT, USDC_MINT, toBaseUnits,
} from './constants'
import { getVaultPda, getVaultUsdc, getOwnerUsdc, getAta } from './pdas'

const enc = getAddressEncoder()

// Anchor discriminators — sha256("global:<instruction_name>")[0..8]
const DISC_INIT_VAULT    = new Uint8Array([144, 193, 26, 93, 68, 219, 32, 180])
const DISC_DEPOSIT       = new Uint8Array([242, 35, 198, 137, 82, 225, 242, 182])
const DISC_WITHDRAW      = new Uint8Array([183, 18, 70, 156, 148, 109, 161, 34])
const DISC_APPROVE_TASK  = new Uint8Array([81, 171, 95, 228, 10, 231, 167, 225])
const DISC_RELEASE_STEP  = new Uint8Array([7, 90, 221, 0, 170, 52, 211, 53])
const DISC_COMPLETE_TASK = new Uint8Array([109, 167, 192, 41, 129, 108, 220, 196])
const DISC_CANCEL_TASK   = new Uint8Array([69, 228, 134, 187, 134, 105, 238, 48])

function u64LE(value: bigint): Uint8Array {
  const buf = new Uint8Array(8)
  new DataView(buf.buffer).setBigUint64(0, value, true)
  return buf
}

// InitUserVault — caller passes the ephemeral agent pubkey that will
// be allowed to sign release_step + complete_task on this vault. For
// the silent autonomous loop, this is a persistent KeyPairSigner held
// in AsyncStorage (see lib/agent-identity.ts).
export async function buildInitVaultIx(
  owner: Address,
  agentKeypair: Address,
): Promise<Instruction> {
  const [vaultPda] = await getVaultPda(owner)
  const vaultUsdc  = await getVaultUsdc(vaultPda)
  const data = new Uint8Array(40)
  data.set(DISC_INIT_VAULT, 0)
  data.set(enc.encode(agentKeypair), 8)

  return {
    programAddress: PROGRAM_ADDRESS,
    accounts: [
      { address: vaultPda,          role: AccountRole.WRITABLE },
      { address: USDC_MINT,         role: AccountRole.READONLY },
      { address: vaultUsdc,         role: AccountRole.WRITABLE },
      { address: owner,             role: AccountRole.WRITABLE_SIGNER },
      { address: SYSTEM_PROGRAM,    role: AccountRole.READONLY },
      { address: TOKEN_PROGRAM,     role: AccountRole.READONLY },
      { address: ASSOC_TOKEN_PROGRAM, role: AccountRole.READONLY },
      { address: SYSVAR_RENT,       role: AccountRole.READONLY },
    ],
    data,
  }
}

// Creates owner USDC ATA idempotently (no-op if already exists)
export async function buildCreateAtaIx(owner: Address): Promise<Instruction> {
  const ownerUsdc = await getOwnerUsdc(owner)
  return {
    programAddress: ASSOC_TOKEN_PROGRAM,
    accounts: [
      { address: owner,          role: AccountRole.WRITABLE_SIGNER },
      { address: ownerUsdc,      role: AccountRole.WRITABLE },
      { address: owner,          role: AccountRole.READONLY },
      { address: USDC_MINT,      role: AccountRole.READONLY },
      { address: SYSTEM_PROGRAM, role: AccountRole.READONLY },
      { address: TOKEN_PROGRAM,  role: AccountRole.READONLY },
    ],
    data: new Uint8Array([1]),  // CreateIdempotent
  }
}

// Generalized ATA-create — payer creates a USDC ATA owned by `recipient`.
// Used by the autonomous loop so the agent keypair can fund the
// briefing service's wallet before the release_step transfer hits.
export async function buildCreateRecipientUsdcIx(
  payer: Address,
  recipient: Address,
): Promise<Instruction> {
  const ata = await getAta(USDC_MINT, recipient)
  return {
    programAddress: ASSOC_TOKEN_PROGRAM,
    accounts: [
      { address: payer,          role: AccountRole.WRITABLE_SIGNER },
      { address: ata,            role: AccountRole.WRITABLE },
      { address: recipient,      role: AccountRole.READONLY },
      { address: USDC_MINT,      role: AccountRole.READONLY },
      { address: SYSTEM_PROGRAM, role: AccountRole.READONLY },
      { address: TOKEN_PROGRAM,  role: AccountRole.READONLY },
    ],
    data: new Uint8Array([1]),  // CreateIdempotent
  }
}

// System program transfer — used to drip SOL from owner to agent keypair
// so the agent can pay tx fees during the loop. Mirrors web's
// SystemProgram.transfer.
export function buildSystemTransferIx(
  from: Address,
  to: Address,
  lamports: bigint,
): Instruction {
  const data = new Uint8Array(12)
  // SystemProgram::Transfer instruction discriminator = 2
  new DataView(data.buffer).setUint32(0, 2, true)
  new DataView(data.buffer).setBigUint64(4, lamports, true)
  return {
    programAddress: SYSTEM_PROGRAM,
    accounts: [
      { address: from, role: AccountRole.WRITABLE_SIGNER },
      { address: to,   role: AccountRole.WRITABLE },
    ],
    data,
  }
}

// Deposit USDC into vault
export async function buildDepositIx(owner: Address, amountUsdc: number): Promise<Instruction> {
  const [vaultPda] = await getVaultPda(owner)
  const vaultUsdc  = await getVaultUsdc(vaultPda)
  const ownerUsdc  = await getOwnerUsdc(owner)
  const data = new Uint8Array(16)
  data.set(DISC_DEPOSIT, 0)
  data.set(u64LE(toBaseUnits(amountUsdc)), 8)

  return {
    programAddress: PROGRAM_ADDRESS,
    accounts: [
      { address: vaultPda,  role: AccountRole.WRITABLE },
      { address: vaultUsdc, role: AccountRole.WRITABLE },
      { address: ownerUsdc, role: AccountRole.WRITABLE },
      { address: owner,     role: AccountRole.WRITABLE_SIGNER },
      { address: TOKEN_PROGRAM, role: AccountRole.READONLY },
    ],
    data,
  }
}

// Withdraw USDC from vault back to owner wallet
export async function buildWithdrawIx(owner: Address, amountUsdc: number): Promise<Instruction> {
  const [vaultPda] = await getVaultPda(owner)
  const vaultUsdc  = await getVaultUsdc(vaultPda)
  const ownerUsdc  = await getOwnerUsdc(owner)
  const data = new Uint8Array(16)
  data.set(DISC_WITHDRAW, 0)
  data.set(u64LE(toBaseUnits(amountUsdc)), 8)

  return {
    programAddress: PROGRAM_ADDRESS,
    accounts: [
      { address: vaultPda,  role: AccountRole.WRITABLE },
      { address: vaultUsdc, role: AccountRole.WRITABLE },
      { address: ownerUsdc, role: AccountRole.WRITABLE },
      { address: owner,     role: AccountRole.READONLY_SIGNER },
      { address: TOKEN_PROGRAM, role: AccountRole.READONLY },
    ],
    data,
  }
}

// Open an autonomous task — owner authorises a budget cap that the agent
// keypair can later draw against via release_step.
export async function buildApproveTaskIx(args: {
  owner: Address
  taskId: Uint8Array          // 32 bytes
  budgetUsdc: number          // total cap in USDC
  expiresAtSeconds: bigint    // unix seconds
}): Promise<Instruction> {
  const { owner, taskId, budgetUsdc, expiresAtSeconds } = args
  if (taskId.length !== 32) throw new Error('taskId must be 32 bytes')
  const [vaultPda] = await getVaultPda(owner)
  const vaultUsdc  = await getVaultUsdc(vaultPda)
  const data = new Uint8Array(8 + 32 + 8 + 8)
  data.set(DISC_APPROVE_TASK, 0)
  data.set(taskId, 8)
  data.set(u64LE(toBaseUnits(budgetUsdc)), 40)
  // i64 little-endian — same wire format as u64 for positive values
  data.set(u64LE(expiresAtSeconds), 48)

  return {
    programAddress: PROGRAM_ADDRESS,
    accounts: [
      { address: vaultPda,  role: AccountRole.WRITABLE },
      { address: vaultUsdc, role: AccountRole.READONLY },
      { address: owner,     role: AccountRole.WRITABLE_SIGNER },
    ],
    data,
  }
}

// One iteration of the loop — agent_keypair signs, vault releases USDC to
// the recipient ATA, decrements the budget. Caller must include a memo
// instruction with the x402 nonce in the same transaction.
export async function buildReleaseStepIx(args: {
  owner: Address
  signer: Address             // agent keypair pubkey
  recipientUsdc: Address      // recipient's USDC ATA
  taskId: Uint8Array
  amountBaseUnits: bigint     // raw USDC base units (10^6 = 1 USDC)
}): Promise<Instruction> {
  const { owner, signer, recipientUsdc, taskId, amountBaseUnits } = args
  if (taskId.length !== 32) throw new Error('taskId must be 32 bytes')
  const [vaultPda] = await getVaultPda(owner)
  const vaultUsdc  = await getVaultUsdc(vaultPda)
  const data = new Uint8Array(8 + 32 + 8)
  data.set(DISC_RELEASE_STEP, 0)
  data.set(taskId, 8)
  data.set(u64LE(amountBaseUnits), 40)

  return {
    programAddress: PROGRAM_ADDRESS,
    accounts: [
      { address: vaultPda,      role: AccountRole.WRITABLE },
      { address: vaultUsdc,     role: AccountRole.WRITABLE },
      { address: recipientUsdc, role: AccountRole.WRITABLE },
      { address: signer,        role: AccountRole.WRITABLE_SIGNER },
      { address: TOKEN_PROGRAM, role: AccountRole.READONLY },
    ],
    data,
  }
}

// Finalise the task — refunds any leftover budget and closes the active
// slot. Either owner or agent_keypair may sign.
export async function buildCompleteTaskIx(args: {
  owner: Address
  signer: Address
  taskId: Uint8Array
}): Promise<Instruction> {
  const { owner, signer, taskId } = args
  if (taskId.length !== 32) throw new Error('taskId must be 32 bytes')
  const [vaultPda] = await getVaultPda(owner)
  const data = new Uint8Array(8 + 32)
  data.set(DISC_COMPLETE_TASK, 0)
  data.set(taskId, 8)

  // Owner is WRITABLE_SIGNER if signing, otherwise the agent signs.
  const ownerIsSigner = owner === signer
  return {
    programAddress: PROGRAM_ADDRESS,
    accounts: [
      { address: vaultPda, role: AccountRole.WRITABLE },
      {
        address: signer,
        role: ownerIsSigner ? AccountRole.WRITABLE_SIGNER : AccountRole.READONLY_SIGNER,
      },
    ],
    data,
  }
}

// Force-cancel an active task — only callable by the owner. Used to clear
// a stale active slot when the agent failed to call complete_task.
export async function buildCancelTaskIx(owner: Address): Promise<Instruction> {
  const [vaultPda] = await getVaultPda(owner)
  return {
    programAddress: PROGRAM_ADDRESS,
    accounts: [
      { address: vaultPda, role: AccountRole.WRITABLE },
      { address: owner,    role: AccountRole.WRITABLE_SIGNER },
    ],
    data: DISC_CANCEL_TASK,
  }
}
