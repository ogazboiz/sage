import AsyncStorage from '@react-native-async-storage/async-storage'
import { fromUint8Array, toUint8Array } from 'js-base64'
import {
  type KeyPairSigner,
  createKeyPairSignerFromPrivateKeyBytes,
} from '@solana/kit'

const STORAGE_KEY = 'sage:agent-keypair-v1'

// Per-device persistent agent identity. The owner wallet authorises the
// vault at init_user_vault time; the agent_keypair is set in the vault
// state and is the only signer the program accepts for release_step and
// complete_task. Storing the agent here lets the autonomous loop sign
// every iteration locally — no MWA prompt, no app switching, no
// Phantom session breakage.
//
// This mirrors the web app's localStorage-backed agent keypair pattern.
// 32-byte private key seed is generated with crypto.getRandomValues,
// fed to @solana/kit with extractable=true so we can round-trip
// through AsyncStorage, base64-encoded for storage.

async function generateRandomSeed(): Promise<Uint8Array> {
  const seed = new Uint8Array(32)
  globalThis.crypto.getRandomValues(seed)
  return seed
}

export async function loadOrCreateAgentSigner(): Promise<KeyPairSigner> {
  const existing = await AsyncStorage.getItem(STORAGE_KEY)
  if (existing) {
    try {
      const bytes = toUint8Array(existing)
      if (bytes.length === 32) {
        return await createKeyPairSignerFromPrivateKeyBytes(bytes, true)
      }
    } catch (err) {
      console.warn('[agent-identity] failed to reload, regenerating:', err)
    }
  }
  const seed = await generateRandomSeed()
  const signer = await createKeyPairSignerFromPrivateKeyBytes(seed, true)
  await AsyncStorage.setItem(STORAGE_KEY, fromUint8Array(seed))
  return signer
}

export async function clearAgentSigner(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_KEY)
}
