# Sage

> The on-chain spending limit your AI agent can't bypass.

Sage is a Solana program that lets a user issue an AI agent a per-task USDC spending cap. The user signs once. The agent runs on a schedule, paying real x402 services with its own keypair. The Anchor program enforces every cent. When the cap hits zero, the program rejects the next release. The agent stops itself.

Built for the **dev3pack hackathon** (Solana / LI.FI / ElevenLabs / x402).

---

## Why this exists

AI agents are starting to spend money on the internet. Today they have three bad options:

| Option | Failure mode |
|---|---|
| Full wallet access | One bug or prompt injection drains everything |
| Hosted custodial service | Trust the operator, defeats self-custody |
| Sign every micropayment by hand | Defeats the point of an autonomous agent |

There is no on-chain primitive that says *"this agent can spend up to $X for this task and nothing else."* Sage fills that gap on Solana.

The program separates two keys. The **owner** signs `approve_task` once to open a budget cap. The **agent_keypair** (browser-side, ephemeral) signs `release_step` and `complete_task` autonomously inside the cap. The owner keeps the gate keys; the agent gets capped till keys. **Removing the program lets the agent drain the wallet — the program is the safety primitive.**

---

## Quick links

| | |
|---|---|
| Network | devnet |
| Program ID | [`64VYGx9kPeizgiqVRWGMBxbbsLV1n7YZTk8MezvpjqtZ`](https://solscan.io/account/64VYGx9kPeizgiqVRWGMBxbbsLV1n7YZTk8MezvpjqtZ?cluster=devnet) |
| Test USDC mint | [`EzAYN6m9yDhwKHRdt9iY9LCgpPDdCXrUtmfoj7PWNYon`](https://solscan.io/account/EzAYN6m9yDhwKHRdt9iY9LCgpPDdCXrUtmfoj7PWNYon?cluster=devnet) |
| Service treasury | [`HKDKTVqJYfwZwSXMZiFKHe75bykunBFQUZW5gv6frYvw`](https://solscan.io/account/HKDKTVqJYfwZwSXMZiFKHe75bykunBFQUZW5gv6frYvw?cluster=devnet) |
| Repo | https://github.com/ogazboiz/sage |

---

## How it works

```
voice command  →  start_autonomous_task tool  →  user signs approve_task once
                                                       │
              browser-side agent_keypair takes over
                                                       │
   ┌──────────────────────────────────────────────────────────────┐
   │  every N seconds:                                            │
   │    decide which paid endpoint to call (briefing? snapshot?)  │
   │    sign release_step + memo with agent_keypair               │
   │    settle x402 with the service treasury                     │
   │    speak result back through voice                            │
   └──────────────────────────────────────────────────────────────┘
                                                       │
                program rejects the next release at $0.00
                                                       │
                  complete_task fires, leftover refunded
```

One signature, walk away. The program is the only thing keeping the agent inside the budget.

---

## The Solana program

`programs/sage_vault/`. Six instructions, one state machine.

| Instruction | Signer | Purpose |
|---|---|---|
| `init_user_vault(agent_keypair)` | owner | Creates a budget account and registers the alternate signer |
| `deposit(amount)` | owner | Funds the vault with USDC |
| `approve_task(task_id, budget, expires_at)` | **owner** | Opens a task with a hard cap and expiry |
| `release_step(task_id, amount, recipient)` | **owner OR agent_keypair** | Releases ≤ remaining budget to a recipient |
| `complete_task(task_id)` | owner OR agent_keypair | Closes the task, refunds unspent budget |
| `withdraw(amount)` | owner | Pulls funds out (only when no task active) |
| `force_complete_stale_task(task_id)` | anyone | Recovery path after expiry + 30 minutes |

**Three invariants enforced on-chain (not in the UI):**

- `release_step` cannot exceed `active_task.budget_remaining`. The program does the math.
- One task at a time. `approve_task` rejects when `active_task != None`.
- `withdraw` is blocked while a task is active.

The `owner` / `agent_keypair` split is what makes autonomy work. The user signs `approve_task` once with their wallet. The browser-side agent keypair signs every subsequent `release_step` without further wallet popups. **A compromised agent keypair cannot ever issue `withdraw` or open a new `approve_task`** — those stay owner-only.

---

## Reference integrations

Five paid services and three off-chain integrations show what the primitive enables.

### x402 paid endpoints

`services/briefing/`. All five settle real Solana SPL USDC against the treasury via the standard 402 → SPL transfer + memo nonce → on-chain verification → 200 OK pattern.

| Endpoint | Price | Returns | Upstream |
|---|---|---|---|
| `POST /brief` | 0.20 USDC | Long-form cross-chain USDC briefing | LI.FI Earn + Gemini 2.5 Flash Lite |
| `POST /yield-snapshot` | 0.05 USDC | Top 3 USDC vaults right now, one-line | LI.FI Earn |
| `POST /alert-check` | 0.05 USDC | Did the named vault tier change since last check? | LI.FI Earn |
| `POST /synthesize` | 0.10 USDC | Take agent context, return Gemini prose | Gemini |
| `POST /market-pulse` | 0.03 USDC | SOL / ETH / BTC / USDC prices + 24h change | CoinGecko |

A discovery endpoint at `GET /services` returns the registered list. New endpoints register with three lines via `paidEndpoint(name, price, handler)`.

### LI.FI

Two paths, both real:

1. **Composer route quotes** for cross-chain onboarding into the Sage vault. Bridge tab quotes a route from Base / Arbitrum / Optimism / Polygon / Ethereum USDC into the user's vault PDA on Solana via `https://li.quest/v1/quote`, returning route name, fees, slippage, and ETA. Voice-driven via `propose_bridge`.
2. **Earn data reads** sourced into every paid service that reports yield. `/brief`, `/yield-snapshot`, and `/alert-check` walk `https://earn.li.fi/v1/vaults` pagination at request time, rank by safety using the HexKit ranker (lifted into `app/src/lib/ranker/`), and return cross-chain USDC yield data.

### ElevenLabs

A Conversational Agent with eight bound tools:

| Tool | Cost | What it does |
|---|---|---|
| `get_vault_status()` | free | Read vault balance + active task |
| `find_yield(intent)` | free | Top 3 vaults from LI.FI Earn, ranked by safety |
| `find_idle_assets()` | free | Idle USDC in user's wallet + suggested deployment |
| `propose_bridge(sourceChain, amountUsdc)` | free | Quote a LI.FI Composer route, navigate to Bridge tab |
| `propose_deposit(amount)` | wallet sig | Surface a confirm card; user clicks Confirm to sign |
| `propose_yield_deposit(slug, amount)` | wallet sig | Same, for a yield slug from the ranker |
| `pay_briefing()` | wallet sig | One-shot paid `/brief` call |
| `start_autonomous_task(goal, budget, intervalSeconds, durationMinutes)` | wallet sig | Open an autonomous task, hand off to Activity tab |

**The confirm-card pattern.** Wallet adapters reject signing requests originating from a websocket message handler because the browser strips the user-gesture flag from that call stack. Sage's wallet-touching tools surface a confirm card in the UI; the user click is the user gesture. After signing, the React side pushes the result back to the agent via `sendContextualUpdate` so it can speak the outcome. While the card is open, a 4-second `sendUserActivity` heartbeat keeps the conversation alive past ElevenLabs' idle timeout.

### Solana / x402 / SPL token

The agent_keypair pattern is enforced by the program at the instruction level. Every paid release is an atomic Solana transaction: ATA-create + `release_step` + memo nonce, signed by the agent keypair. Endpoint side verifies the transfer landed in the treasury ATA and the memo matches the nonce.

---

## The four shapes

The Activity tab opens an autonomous task. The shape picker drives the agent's per-tick decision policy:

| Shape | Sequence | Total cost / iteration |
|---|---|---|
| Briefing | `/brief` on iter 0 + every 5th, `/yield-snapshot` between | ~$0.08 avg |
| Monitor | `/alert-check` every tick, escalates to `/synthesize` when a tier change is detected | ~$0.05 avg |
| Content | `/yield-snapshot` → `/brief` → `/synthesize` × N until budget thins | ~$0.10 avg |
| Market | `/market-pulse` every tick, `/yield-snapshot` every 5th | ~$0.04 avg |
| Auto | `/brief` on iter 0, `/market-pulse` on iter 1, `/yield-snapshot` on iter 2+ | ~$0.07 avg |

The Auto shape is the demo killer. One run mixes LI.FI Earn data with CoinGecko prices, two upstreams in one activity log.

---

## Demo paths

Quick paths for first-time users. Pre-conditions: wallet connected (Phantom / Solflare / Backpack), vault initialised with ≥ $1 USDC, ≥ 0.01 SOL for fees.

**1. Manual autonomous loop.** Activity tab → **Briefing** shape, $0.50 cap, 30 s interval, 2 min duration → Start. Sign twice (SOL drip + `approve_task`). Watch the loop fire `/brief` and `/yield-snapshot` calls; vault counter ticks down on every release; every iteration links to solscan-devnet. Wrap-up card at the end shows total spent, refunded, duration, and a Gemini summary.

**2. Voice-triggered loop.** Talk → *"Run a cross-chain USDC briefing every 30 seconds for 2 minutes, max one dollar."* Voice agent calls `start_autonomous_task`, app navigates to Activity, form pre-fills. Click Start.

**3. Cross-chain bridge quote.** Bridge tab → pick Base → enter 50 USDC → click Get quote on Base. LI.FI Composer returns a real route with fees, slippage, ETA. Or via voice: *"Bridge 50 USDC from Base into my vault."*

**4. One-shot paid voice action.** Talk → *"Pay for a briefing."* Agent confirms cost, you say yes, confirm card appears with $0.20, click Confirm, sign once, voice reads the briefing back.

**5. Idle-asset query.** Talk → *"What's idle?"* Free tool reports wallet USDC, vault USDC, suggested deployment, and the safest yield right now.

---

## Tech stack

| Layer | Choice |
|---|---|
| Solana program | Anchor 1.0.2 |
| Frontend | Vite + React 19 + Tailwind v4 |
| Wallet | `@solana/wallet-adapter` (Phantom / Solflare / Backpack via wallet-standard) |
| Voice | `@elevenlabs/react` Conversational Agents over websocket |
| Yield data | LI.FI Earn (`https://earn.li.fi/v1/vaults`) |
| Cross-chain | LI.FI Composer (`https://li.quest/v1/quote`) |
| Market data | CoinGecko `/v3/simple/price` (free tier, no key) |
| LLM | Gemini 2.5 Flash Lite for prose, deterministic templated fallback |
| x402 | Custom Solana SPL implementation, nonce-pinned per endpoint |
| Hosting | Local node for briefing service, Vercel-ready frontend |
| RPC | devnet (Helius dedicated optional) |

---

## Setup

Requires Node 20+, pnpm, Solana CLI, Anchor 1.0.2.

```bash
# Install workspace
pnpm install

# Terminal A — briefing service
cd services/briefing
pnpm dev   # listens on :3001

# Terminal B — frontend
cd ../../app
pnpm dev   # http://localhost:5173
```

Env file at `app/.env.local`:

```
VITE_ELEVENLABS_AGENT_ID=agent_xxx
ELEVENLABS_API_KEY=sk_xxx
LIFI_API_KEY=xxx
GEMINI_API_KEY=xxx
```

The briefing service auto-loads `app/.env.local` via Node's `--env-file-if-exists` flag.

---

## Repo layout

```
sage/
├── programs/sage_vault/          Anchor program (Rust, six instructions)
├── services/briefing/            Five x402 paid endpoints (Express + Gemini)
├── app/                          Vite + React 19 frontend
│   ├── src/lib/sage-sdk/         Anchor IDL + program client wrapper
│   ├── src/lib/ranker/           HexKit ranker + risk filter (lifted, credited)
│   ├── src/lib/lifi/             LI.FI Earn + Composer clients
│   ├── src/lib/x402/             x402 client (challenge + settle)
│   ├── src/hooks/useAutonomousTask.ts        Agent-keypair loop primitive
│   ├── src/lib/autonomous-decide.ts          Per-tick decision policy
│   └── src/components/AutonomousTaskPanel.tsx  Activity tab
└── tests/                        Anchor TS integration tests
```

---

## Honest limitations

- **Loop runs in the browser.** Closing the tab stops the loop. The active task remains open on-chain and unsticks via `force_complete_stale_task` after expiry + 30 minutes. Production would move the loop to a worker / serverless cron; for hackathon, browser-side proves the program-level enforcement works. The Vault tab has a manual *Cancel task and refund leftover* button for recovery.
- **Devnet uses a custom USDC mint.** LI.FI Composer cross-chain *execute* requires canonical USDC, which forces mainnet. Quote works on devnet. Mainnet swap is a 30-minute config change (mint constant, RPC, redeploy); the program does not change.
- **Real protocol deposits are out of scope.** Marginfi / Kamino / Solend deposits would require either a stable devnet bank with a fresh oracle (their devnets are unreliable) or mainnet with real money. The Sage program already exposes the pattern (`release_step` to any recipient ATA); a v2 deployment would CPI directly.
- **Solana coverage in LI.FI Earn is sparse.** The index is EVM-heavy; querying for Solana USDC vaults returns nothing on most fetches. The agent acknowledges this when the user mentions Solana, and surfaces cross-chain alternatives. For native Solana yield, the agent recommends Marginfi, Kamino, Save, or Drift directly.
- **Gemini 2.5 Flash Lite has slow paths.** When generation exceeds 15 seconds, the briefing service retries once, then falls back to deterministic templated prose. Briefings still carry live LI.FI numbers either way.

---

## Provenance

Sage builds on patterns from prior projects:

- **HexKit** (LI.FI DeFi Mullet hackathon, April 2026) contributed the ranker, risk filter (reward-heavy / apy-spike / declining-yield / micro-tvl), and symbol aliases. Lifted into `app/src/lib/ranker/`; source files credit *"Lifted and trimmed from HexKit."*
- **CleverCon** (Stellar Hacks: Agents 2026) contributed the per-task vault treasury idea (`CleverVault`) and the active-task / release-step / refund pattern. Sage's `sage_vault` is that idea ported to Solana with the agent_keypair separation added.
- **Toll, RenderGate, x402-mcp-stellar-template** all pointed at the same thesis — agents need a non-custodial way to pay for things — but on Stellar. Sage is the Solana chapter.

---

## License

MIT. See LICENSE file.
