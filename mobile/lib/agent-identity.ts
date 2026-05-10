import {
  type KeyPairSigner,
  generateKeyPairSigner,
} from '@solana/kit'

// Per-task ephemeral agent identity. The owner wallet authorises every
// state change on the vault at approve_task time; the agent keypair is a
// fresh ephemeral pubkey that the program then accepts as the alternate
// signer for release_step + complete_task on that task.
//
// We generate a fresh signer per task (instead of persisting one across
// sessions) for two reasons:
//   1. @solana/kit's CryptoKeyPair is non-extractable by default, so we
//      can't easily round-trip through AsyncStorage.
//   2. The dApp Store demo flow doesn't need cross-session continuity —
//      one approve → loop → complete cycle lives entirely in memory.
//
// If the user closes the app mid-task, the on-chain active slot is stuck
// until the owner calls cancel_task (no funds at risk; the budget is
// frozen, not spent).
export async function createAgentSigner(): Promise<KeyPairSigner> {
  return generateKeyPairSigner()
}
