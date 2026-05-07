import { PublicKey } from "@solana/web3.js";
import { PROGRAM_ID_STRING } from "./idl";

export const PROGRAM_ID = new PublicKey(PROGRAM_ID_STRING);

const USER_VAULT_SEED = Buffer.from("user_vault");

export function deriveUserVaultPda(owner: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [USER_VAULT_SEED, owner.toBuffer()],
    PROGRAM_ID,
  );
}
