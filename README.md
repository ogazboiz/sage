# Sage

> Voice-first AI agent wallet for Solana. Talk to it. It manages an on-chain budget, finds yield via LI.FI, pays for services per call via x402, and onboards funds from any chain. Every spending guarantee is enforced by the program, not the UI.

**Status:** in development for the dev3pack hackathon.

---

## What it does

You speak. Sage listens, plans, quotes the cost out loud, waits for your "yes," and executes on Solana.

- **Voice in, voice out.** ElevenLabs Conversational Agents with bound tools, not TTS-only.
- **On-chain budget vault.** An Anchor program (`sage_vault`) holds your USDC. Per-task locking, just-in-time release, auto-refund of unspent budget, owner-only withdrawals. No custodial server, no soft caps.
- **Cross-chain onboarding.** LI.FI Composer bridges from any source chain into your vault on Solana in a single signature.
- **Solana yield discovery.** LI.FI Earn API filtered to Solana destinations, ranked by intent (safest, highest, balanced) with a risk filter that flags reward-heavy, APY-spiked, declining, or micro-TVL vaults.
- **Pay-per-call services.** The agent pays an x402 endpoint on Solana SPL USDC for a specialist service (e.g. a DeFi briefing). Settlement is verifiable on-chain.

## Tracks

This project targets the dev3pack hackathon across multiple tracks.

**Primary:**

- **Solana — Best App Overall.** Novel Anchor program with on-chain agent budget guarantees.
- **Solana — x402 bonus.** A real x402 endpoint settled in USDC SPL on Solana.
- **LI.FI — Cross-Chain UX.** Earn API for vault discovery + Composer for funding, both load-bearing.
- **ElevenLabs — Best Integration.** Conversational Agents with tool calling, voice as the trigger for on-chain actions.

**Stretch:**

- **Solana Mobile — Best Mobile App.** Native Expo APK with Mobile Wallet Adapter, designed mobile-first. Same Anchor program, same shared core (`app/src/lib/`), with the voice loop and vault UI rebuilt natively for Android. Submitted to the Solana dApp Store.

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
    ├──► LI.FI Composer ──► cross-chain funding tx
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
    └──► x402 endpoint on Solana (Sage Briefing service)
              pays in USDC SPL, settles via Solana x402 facilitator
```

## Tech stack

| Layer | Choice |
|---|---|
| Solana program | Anchor |
| Frontend (web, primary) | Vite + React 19 + Tailwind |
| Frontend (mobile, stretch) | Expo + React Native |
| Wallet (web) | `@solana/wallet-adapter` (Phantom, Solflare) |
| Wallet (mobile) | `@solana-mobile/mobile-wallet-adapter-protocol` |
| LI.FI | `@lifi/sdk` + Earn API |
| Voice | ElevenLabs Conversational Agents |
| LLM (intent + rationale) | Gemini 2.5 Flash |
| x402 | Custom middleware on Solana SPL USDC |
| Hosting | Vercel (web, x402 service), EAS (mobile build) |
| RPC | Helius devnet |

## Setup

> Note: setup instructions land alongside the first deployable build.

```bash
# Prerequisites
# - Rust + cargo
# - Solana CLI (Anza installer)
# - Anchor (via avm)
# - Node 20+ and pnpm or yarn

# Install
git clone https://github.com/ogazboiz/sage.git
cd sage

# Build the program
anchor build

# Run tests
anchor test

# Run the web app
cd app
pnpm install
pnpm dev
```

## Deployed addresses

| Item | Network | Address |
|---|---|---|
| `sage_vault` program | Devnet | _coming soon_ |
| x402 briefing endpoint | Devnet | _coming soon_ |
| Web demo | — | _coming soon_ |

## Demo video

Coming soon. Keep an eye on this section after the submission deadline.

## License

MIT
