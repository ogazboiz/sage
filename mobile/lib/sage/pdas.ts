import { Address, getProgramDerivedAddress, getAddressEncoder } from '@solana/kit'
import { PROGRAM_ADDRESS, TOKEN_PROGRAM, ASSOC_TOKEN_PROGRAM, USDC_MINT } from './constants'

const enc  = getAddressEncoder()
const SEED = new TextEncoder().encode('user_vault')

export async function getVaultPda(owner: Address): Promise<readonly [Address, number]> {
  return getProgramDerivedAddress({
    programAddress: PROGRAM_ADDRESS,
    seeds: [SEED, enc.encode(owner)],
  })
}

export async function getAta(mint: Address, owner: Address): Promise<Address> {
  const [ata] = await getProgramDerivedAddress({
    programAddress: ASSOC_TOKEN_PROGRAM,
    seeds: [enc.encode(owner), enc.encode(TOKEN_PROGRAM), enc.encode(mint)],
  })
  return ata
}

export const getOwnerUsdc = (owner: Address) => getAta(USDC_MINT, owner)
export const getVaultUsdc = async (vaultPda: Address) => getAta(USDC_MINT, vaultPda)
