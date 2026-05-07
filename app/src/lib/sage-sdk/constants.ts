import { PublicKey } from "@solana/web3.js";

// Devnet USDC will be set after we provision a mint. For now, reference a
// placeholder mint we control. Override via VITE_SAGE_USDC_MINT in .env.local.
const FALLBACK_DEVNET_MINT = "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU";

export const SAGE_USDC_MINT = new PublicKey(
  import.meta.env.VITE_SAGE_USDC_MINT ?? FALLBACK_DEVNET_MINT,
);

export const USDC_DECIMALS = 6;

export function toBaseUnits(amount: number): bigint {
  return BigInt(Math.round(amount * 10 ** USDC_DECIMALS));
}

export function fromBaseUnits(amount: bigint | number): number {
  const raw = typeof amount === "bigint" ? Number(amount) : amount;
  return raw / 10 ** USDC_DECIMALS;
}
