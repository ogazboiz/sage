import { Address, Instruction, AccountRole, getAddressEncoder } from '@solana/kit'
import {
  PROGRAM_ADDRESS, TOKEN_PROGRAM, ASSOC_TOKEN_PROGRAM,
  SYSTEM_PROGRAM, SYSVAR_RENT, USDC_MINT, toBaseUnits,
} from './constants'
import { getVaultPda, getVaultUsdc, getOwnerUsdc } from './pdas'

const enc = getAddressEncoder()

// Anchor discriminators — sha256("global:<instruction_name>")[0..8]
const DISC_INIT_VAULT = new Uint8Array([144, 193, 26, 93, 68, 219, 32, 180])
const DISC_DEPOSIT    = new Uint8Array([242, 35, 198, 137, 82, 225, 242, 182])
const DISC_WITHDRAW   = new Uint8Array([183, 18, 70, 156, 148, 109, 161, 34])

function u64LE(value: bigint): Uint8Array {
  const buf = new Uint8Array(8)
  new DataView(buf.buffer).setBigUint64(0, value, true)
  return buf
}

// InitUserVault — uses owner as agent pubkey for demo purposes
export async function buildInitVaultIx(owner: Address): Promise<Instruction> {
  const [vaultPda] = await getVaultPda(owner)
  const vaultUsdc  = await getVaultUsdc(vaultPda)
  const data = new Uint8Array(40)
  data.set(DISC_INIT_VAULT, 0)
  data.set(enc.encode(owner), 8)   // agentKeypair = owner

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
