# Sage — dev3pack submission texts

Paste each block into the matching prize form. Same project, four angles.

---

## Universal one-paragraph (lift verbatim onto every form)

> Sage is autonomous AI tasks on Solana. One voice command, one signature, then walk away. The agent signs its own micropayments to paid services. The Solana program enforces every cent. When the budget hits zero, the program stops the agent. We ship four reference paid endpoints (cross-chain USDC briefing, yield snapshot, alert check, Gemini synthesis) all settling real Solana SPL USDC, all reading live LI.FI Earn data across chains. The agent on Solana pays USDC to read LI.FI's cross-chain yield index. Voice opens the loop, the program enforces every release.

---

## Solana — Best App ($10k)

**Title:** Sage — Programmable agent treasury for Solana

**Pitch (paste this):**

> AI agents are starting to spend money on the internet. None of the existing options are safe: full wallet access, hosted custodial services, or signing every micropayment by hand. Sage is the on-chain primitive that fills the gap. A user opens a budget cap with `approve_task`, signing once. From that point, a separate `agent_keypair` (registered at vault init) signs every `release_step` autonomously. The program rejects any release that would exceed the cap, and force-closes stale tasks after 30 minutes for recovery. We demo the primitive with four reference paid endpoints settling x402 over Solana SPL USDC, voice triggering the schedule, and live LI.FI Earn data flowing into every paid call. Removing the program lets the agent drain the wallet. **The program is the safety primitive.** Open source, deployed devnet `64VYGx9kPeizgiqVRWGMBxbbsLV1n7YZTk8MezvpjqtZ`.

**Why it qualifies:**
- Original Anchor program with novel agent_keypair pattern, load-bearing in the demo (not aspirational).
- Atomic instruction sequences (`approve_task` → `release_step × N` → `complete_task`) all on Solana.
- Real transaction throughput potential: each user runs N transactions per session, multiplied by users.
- Consistent use of the Solana SDK, SPL tokens, Anchor 1.0.2.

**Live links:**
- Repo: https://github.com/ogazboiz/sage
- Program: https://solscan.io/account/64VYGx9kPeizgiqVRWGMBxbbsLV1n7YZTk8MezvpjqtZ?cluster=devnet
- Demo: https://sage.app (your Vercel URL)

---

## Solana — x402 bonus ($500)

**Title:** Sage — Recurring x402 settlement on Solana, capped on-chain

**Pitch (paste this):**

> Sage runs the original x402 thesis on Solana: agents pay per-call to APIs autonomously, settled in real USDC, with budget enforcement on-chain. We ship four x402 paid endpoints (`/brief`, `/yield-snapshot`, `/alert-check`, `/synthesize`) behind a single `paidEndpoint(name, price, handler)` middleware. Each endpoint follows the spec: 402 Payment Required → SPL transfer with memo nonce → on-chain verification via `getParsedTransaction` → 200 OK. Replay protection per endpoint. The agent_keypair signs each settlement transaction without further user interaction, and the Solana program enforces the cap so the agent cannot over-spend even if compromised. **Recurring x402 is the demo moment**: a single voice command kicks off a loop that fires real Solana SPL settlements every 30 seconds until the program rejects the next release at $0.00.

**Why it qualifies:**
- Real Solana SPL USDC payment, verifiable on solscan-devnet.
- Per-endpoint price + per-endpoint nonce binding.
- Agent-driven (not human form), the original x402 use case.
- Drop-in `paidEndpoint(name, price, handler)` pattern — anyone can add a fifth endpoint with three lines.

---

## LI.FI — Cross-Chain UX ($1k)

**Title:** Sage — LI.FI Earn as the paid data layer for an autonomous Solana agent

**Pitch (paste this):**

> Sage's autonomous agent is a paid consumer of LI.FI Earn. Every `/brief`, `/yield-snapshot`, and `/alert-check` call (three of our four paid x402 endpoints) walks `https://earn.li.fi/v1/vaults` pagination at request time, ranks the cross-chain USDC universe by safety, and returns the result. The HexKit ranking engine is lifted into Sage (`app/src/lib/ranker/`, source files note *"Lifted and trimmed from HexKit"*) — same risk filter (reward-heavy / apy-spike / declining-yield / micro-tvl), same symbol aliases (USDC / USDC.E / USDBC), same ranker. **The agent's payment settles on Solana; the data the agent buys is cross-chain by design — that is the integration.** Every iteration in the Activity log carries an `LI.FI Earn` badge. The user can also speak *"what's idle?"* and the voice agent calls a free `find_idle_assets` tool that uses the same LI.FI ranker, suggesting where unused USDC could earn. The more autonomous tasks run, the more LI.FI calls get triggered.

**Why it qualifies:**
- Both LI.FI Earn (load-bearing in three of four paid endpoints) and Composer (top-up quote flow, mainnet-execute path documented).
- Risk filter, symbol aliases, ranker all lifted from HexKit and credited explicitly.
- Cross-chain story: agent on Solana pays to read multi-chain yield data.

---

## ElevenLabs — Best Integration (Scale tier 3mo)

**Title:** Sage — Voice as the only way to start an autonomous on-chain agent

**Pitch (paste this):**

> Sage's voice agent is not TTS-on-top; it is the front door of an autonomous on-chain primitive. The user speaks a goal — *"Run a cross-chain USDC briefing every 30 seconds for 2 minutes, max one dollar"* — and the ElevenLabs Conversational Agent calls `start_autonomous_task({goal, budget, intervalSeconds, durationMinutes})`, parsing the four parameters from the natural-language sentence. The app navigates to the Activity tab with the form pre-filled. The user signs once. From that point, the loop runs without further wallet popups, and the voice agent narrates each iteration's result via `sendContextualUpdate`. Seven bound tools total: `get_vault_status`, `find_yield`, `find_idle_assets`, `propose_deposit`, `propose_yield_deposit`, `pay_briefing`, `start_autonomous_task`. Wallet-touching tools surface a confirm card so the click carries the browser's user-gesture flag (which a websocket callback cannot). **Voice unlocks autonomy on-chain. Without the voice agent, the autonomous task does not start.**

**Why it qualifies:**
- Conversational Agent (not just TTS), seven tools bound.
- Voice opens the autonomous loop, voice narrates results in real time.
- Confirm-card pattern solves the user-gesture / wallet-popup problem cleanly.
- Free read tools (`find_yield`, `find_idle_assets`) and paid action tools coexist.

---

## Optional: showcase.elevenlabs.io

> Sage is a Solana program that gives AI agents per-task spending caps. Voice triggers the task. The agent runs autonomously inside the cap. The program is the only thing keeping it bounded.

---

## What to do with this file

1. Open each prize portal.
2. Find the project description / pitch field.
3. Paste the matching block.
4. Add the universal one-paragraph at the top of any extra "summary" field.
5. Attach the demo video link when ready.
