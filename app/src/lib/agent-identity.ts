import { Keypair } from "@solana/web3.js";
import bs58 from "bs58";

const STORAGE_KEY = "sage:agent-keypair";

// Per-browser ephemeral agent identity. The user's wallet authorises every
// state-change on the vault; the agent keypair is a Pubkey passed as an
// argument at init and used as the alternate signer for release_step.
//
// In production, derive this from a session-key flow with stricter scoping.
// For the hackathon, localStorage is fine and demonstrates the concept.
export function loadOrCreateAgentKeypair(): Keypair {
  if (typeof window === "undefined") {
    return Keypair.generate();
  }
  const existing = window.localStorage.getItem(STORAGE_KEY);
  if (existing) {
    try {
      return Keypair.fromSecretKey(bs58.decode(existing));
    } catch {
      // fall through and regenerate
    }
  }
  const fresh = Keypair.generate();
  window.localStorage.setItem(STORAGE_KEY, bs58.encode(fresh.secretKey));
  return fresh;
}

export function clearAgentKeypair(): void {
  if (typeof window !== "undefined") {
    window.localStorage.removeItem(STORAGE_KEY);
  }
}
