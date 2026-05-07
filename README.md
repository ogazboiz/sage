# Sage

> Voice-first AI agent wallet for Solana. Talk to it. It manages an on-chain budget, finds yield via LI.FI, pays for services per call via x402, and onboards funds from any chain. Every spending guarantee is enforced by the program, not the UI.

**Status:** built for the dev3pack hackathon.

---

## What it does

You speak. Sage listens, plans, quotes the cost out loud, waits for your "yes," and executes on Solana.

- **Voice in, voice out.** ElevenLabs Conversational Agents with bound tools, not TTS-only.
- **On-chain budget vault.** An Anchor program (`sage_vault`) holds your USDC. Per-task locking, just-in-time release, auto-refund of unspent budget, owner-only withdrawals. No custodial server, no soft caps.
- **Cross-chain onboarding.** LI.FI Composer routes USDC from any source chain into Solana, landing in the user's vault.
- **Solana yield discovery.** LI.FI Earn API filtered to Solana destinations, ranked by intent (safest, highest, balanced) with a risk filter that flags reward-heavy, APY-spiked, declining, or micro-TVL vaults.
- **Pay-per-call services.** The agent pays an x402 endpoint on Solana SPL USDC for a specialist service (e.g. a DeFi briefing). Settlement is verifiable on-chain.

## Tracks

**Primary:**

- **Solana — Best App Overall.** Novel Anchor program with on-chain agent budget guarantees.
- **Solana — x402 bonus.** A real x402 endpoint settled in USDC SPL on Solana.
- **LI.FI — Cross-Chain UX.** Earn API for vault discovery + Composer for cross-chain quotes.
- **ElevenLabs — Best Integration.** Conversational Agents with four bound tools, voice as the trigger for on-chain actions.

**Stretch:** Solana Mobile — Expo + Mobile Wallet Adapter port. Reuses the framework-agnostic `app/src/lib/` core. Submitted only after the web build is fully filed.

## Architecture

```
Voice in (mic)
    │
    ▼
ElevenLabs Conversational Agent (tool calls)
    │
    ▼
Web app (Vite + React)
    │
    ├──► Solana wallet adapter (Phantom + Solflare)
    │
    ├──► LI.FI Earn API ──► Solana vault list (ranked, risk-filtered)
    ├──► LI.FI Composer ──► cross-chain quote / route
    │
    ├──► Anchor program: sage_vault
    │     ├─ init_user_vault
    │     ├─ deposit
    │     ├─ approve_task
    │     ├─ release_step
    │     ├─ complete_task
    │     ├─ withdraw
    │     └─ force_complete_stale_task
    │
    └──► x402 endpoint (services/briefing)
              SPL USDC on Solana, on-chain verification, replay protection
```

## Anchor program — `sage_vault`

Program ID (devnet): [`64VYGx9kPeizgiqVRWGMBxbbsLV1n7YZTk8MezvpjqtZ`](https://solscan.io/account/64VYGx9kPeizgiqVRWGMBxbbsLV1n7YZTk8MezvpjqtZ?cluster=devnet)

### Instructions

| Instruction | Signer | Purpose |
|---|---|---|
| `init_user_vault(agent_keypair)` | owner | Creates the vault PDA + USDC ATA owned by the PDA |
| `deposit(amount)` | owner | Transfers USDC from owner ATA into vault ATA |
| `approve_task(task_id, budget, expires_at)` | owner | Locks budget against an active task. Rejects if a task is already active. Bound by `MAX_TASK_DURATION_SECONDS`. |
| `release_step(task_id, amount)` | owner OR agent | Vault → recipient ATA via PDA-signed CPI. Capped by remaining budget on-chain. |
| `complete_task(task_id)` | owner OR agent | Clears the active task. Unspent budget stays in vault. |
| `withdraw(amount)` | owner | Vault → owner. Rejected while a task is active. |
| `force_complete_stale_task(task_id)` | anyone | Recovery. Allowed only after `expires_at + STALE_TASK_GRACE_SECONDS`. |

### State machine invariants (all enforced on-chain)

1. Cannot withdraw while a task is active.
2. Cannot start a second task while one is active.
3. `release_step` cannot exceed remaining budget.
4. Force-complete only after the grace period.
5. Owner authorisation required for all state changes except force-complete.

A full sequence (init → deposit → approve_task → release_step → complete_task → withdraw) is exercised in [`app/scripts/smoke-test.ts`](app/scripts/smoke-test.ts) and passes on devnet.

## x402 paid endpoint

Service: [`services/briefing`](services/briefing) (Express, runs at `:3001`)

Flow:

1. `POST /brief` without payment → `402` with `{ amount, mint, recipient, nonce, expiresIn }`
2. Client sends an SPL USDC transfer to the treasury ATA, with the nonce written into a `spl-memo` instruction in the same transaction
3. Client retries with `X-Payment: <signature>` and `X-Payment-Nonce: <nonce>`
4. Server verifies on-chain via `getParsedTransaction`, matches recipient ATA, amount, and memo nonce
5. Returns the briefing text

Replay protection: each nonce is single-use, tracked in memory with TTL.

End-to-end test in [`services/briefing/scripts/x402-test.ts`](services/briefing/scripts/x402-test.ts) settles 0.20 USDC on devnet and returns the briefing.

**Verification tx (devnet):** [`25x87eRE5ni2hVi1rfUbobmiJFtPnwhAFfeGe92RpjA3kxgRfwuh9WtWLU2xSGKgraos66sZn55FeJVqiCupktx2`](https://solscan.io/tx/25x87eRE5ni2hVi1rfUbobmiJFtPnwhAFfeGe92RpjA3kxgRfwuh9WtWLU2xSGKgraos66sZn55FeJVqiCupktx2?cluster=devnet)

## LI.FI integration

**Earn API** (`/v1/earn/vaults`): paginated walk over Solana destination vaults. Filtered, then ranked by intent (safest = TVL, highest = APY, balanced = 55/45 weighted). Risk classifier flags reward-heavy, APY-spiked, declining-yield, and micro-TVL vaults. Lifted from HexKit, framework-agnostic in [`app/src/lib/ranker`](app/src/lib/ranker).

**Composer API** (`/v1/quote`): real cross-chain routes from EVM source chains into Solana USDC. Verified working: 10 USDC on Base → 9.79 USDC on Solana via Across in ~2s.

Both APIs are proxied server-side through Vite so the LI.FI API key never enters the bundle.

## ElevenLabs Conversational Agent

Four client tools registered with the agent:

- `get_vault_status()` — reads `UserVault` and returns balance + active task as JSON
- `find_yield(intent: string)` — runs the LI.FI ranker pipeline, returns top 3 candidates with rationale
- `propose_deposit(amount: number)` — triggers wallet popup deposit, returns tx signature
- `pay_briefing()` — atomic 5-instruction tx: ATA-create + approve_task + release_step + memo + complete_task, then settles with the x402 endpoint and returns the briefing for the agent to read aloud

The voice agent acts as the orchestrator, with on-chain actions enforced by the program.

## Tech stack

| Layer | Choice |
|---|---|
| Solana program | Anchor 1.0 |
| Frontend | Vite + React 19 + Tailwind v4 |
| Wallet | `@solana/wallet-adapter` (Phantom, Solflare) |
| LI.FI | REST proxy (`/v1/earn`, `/v1/quote`) |
| Voice | `@elevenlabs/react` Conversational Agent |
| x402 service | Express + `@solana/spl-token` parsed-tx verification |
| RPC | Solana devnet (override via `VITE_SOLANA_RPC`) |

## Deployed addresses

| Item | Network | Address |
|---|---|---|
| `sage_vault` program | Devnet | [`64VYGx9kPeizgiqVRWGMBxbbsLV1n7YZTk8MezvpjqtZ`](https://solscan.io/account/64VYGx9kPeizgiqVRWGMBxbbsLV1n7YZTk8MezvpjqtZ?cluster=devnet) |
| Sage test USDC mint | Devnet | [`EzAYN6m9yDhwKHRdt9iY9LCgpPDdCXrUtmfoj7PWNYon`](https://solscan.io/account/EzAYN6m9yDhwKHRdt9iY9LCgpPDdCXrUtmfoj7PWNYon?cluster=devnet) |
| x402 settlement (proof) | Devnet | [`25x87eRE5n…JVqiCupktx2`](https://solscan.io/tx/25x87eRE5ni2hVi1rfUbobmiJFtPnwhAFfeGe92RpjA3kxgRfwuh9WtWLU2xSGKgraos66sZn55FeJVqiCupktx2?cluster=devnet) |

## Local setup

Prerequisites: Rust + cargo, Solana CLI (Anza installer), Anchor (via avm), Node 20+, pnpm.

```bash
git clone https://github.com/ogazboiz/sage.git
cd sage

# 1. Build + verify the program
anchor build
./app/node_modules/.bin/tsx app/scripts/smoke-test.ts   # exercises all 7 ixs on devnet

# 2. Mint test USDC to whichever wallet you'll connect
./app/node_modules/.bin/tsx app/scripts/mint-to.ts <YOUR_WALLET_PUBKEY> 100

# 3. Run the x402 briefing service
cd services/briefing && pnpm install && pnpm dev      # :3001

# 4. Run the web app (separate terminal)
cd app && pnpm install && pnpm dev                    # :5173
```

Environment (`app/.env.local`):

```
VITE_SAGE_USDC_MINT=EzAYN6m9yDhwKHRdt9iY9LCgpPDdCXrUtmfoj7PWNYon
VITE_SOLANA_RPC=https://api.devnet.solana.com
VITE_ELEVENLABS_AGENT_ID=         # create at elevenlabs.io/app/conversational-ai
LIFI_API_KEY=                     # optional; LI.FI Earn works without
GEMINI_API_KEY=
```

## Demo video

Coming with the submission. The 3-min walkthrough covers: voice deposit, voice yield discovery, voice-triggered x402 paid briefing with on-chain settlement.

## License

MIT
