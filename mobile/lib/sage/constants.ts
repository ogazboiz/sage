import { address } from '@solana/kit'

export const PROGRAM_ADDRESS    = address('64VYGx9kPeizgiqVRWGMBxbbsLV1n7YZTk8MezvpjqtZ')
export const USDC_MINT          = address('EzAYN6m9yDhwKHRdt9iY9LCgpPDdCXrUtmfoj7PWNYon')
export const TOKEN_PROGRAM      = address('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA')
export const ASSOC_TOKEN_PROGRAM = address('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL')
export const SYSTEM_PROGRAM     = address('11111111111111111111111111111111')
export const SYSVAR_RENT        = address('SysvarRent111111111111111111111111111111111')

export const USDC_DECIMALS = 6

export function fromBaseUnits(amount: bigint | number): number {
  return Number(amount) / 10 ** USDC_DECIMALS
}

export function toBaseUnits(amount: number): bigint {
  return BigInt(Math.round(amount * 10 ** USDC_DECIMALS))
}
