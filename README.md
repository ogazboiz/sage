# Sage

> Set an AI agent loose on a recurring paid task. Walk away. The Solana program is the only thing keeping it inside its budget.

Sage gives an AI agent a per-task spending cap on Solana. The user signs once. The agent runs on a schedule, paying x402 services with its own keypair, with every cent enforced by an Anchor program. When the cap hits zero, the program rejects the next release. The agent stops itself.

**Built for the dev3pack hackathon.** Solana program shipped, voice + LI.FI + x402 + autonomous-loop all wired.

---

## The pitch in one paragraph

AI agents are starting to spend money on the internet. Today they get full wallet access (unsafe), use a hosted custodial service (trust required), or sign every micropayment by hand (defeats the agent). There is no on-chain primitive that says *"this agent can spend up to $X for this task and nothing else."* Sage is that primitive on Solana, with four reference paid services to prove the loop carries: live LI.FI Earn briefings, yield snapshots, alert checks, and Gemini synthesis. Voice opens the task; the program enforces every release; the agent walks itself to zero.

## How it works

```
voice command  →  start_autonomous_task tool  →  user signs approve_task once
                                                       ↓
              browser-side agent_keypair takes over
                                                       ↓
   ┌──────────────────────────────────────────────────────────────┐
   │  every N seconds:                                            │
   │    decide which paid endpoint to call (briefing? snapshot?)  │
   │    sign release_step + memo with agent_keypair               │
   │    settle x402 with the service treasury                     │
   │    speak result back through voice                            │
   └──────────────────────────────────────────────────────────────┘
                                                       ↓
                program rejects the next release at $0.00
                                                       ↓
                  complete_task fires, leftover budget refunded
```

One signature, then walk away. Nothing else is required from the user.

## The Solana program

`sage_vault` (deployed devnet `64VYGx9kPeizgiqVRWGMBxbbsLV1n7YZTk8MezvpjqtZ`)

| Instruction | Signer | Purpose |
|---|---|---|
| `init_user_vault(agent_keypair)` | owner | Create a budget account, register an alternate signer |
| `deposit(amount)` | owner | Fund the vault with USDC |
| `approve_task(task_id, budget, expires_at)` | **owner** | Open a task with a hard cap and expiry |
| `release_step(task_id, amount, recipient)` | **owner OR agent_keypair** | Release ≤ remaining budget |
| `complete_task(task_id)` | owner OR agent_keypair | Close the task, refund unspent |
| `withdraw(amount)` | owner | Pull funds out (only when no task active) |
| `force_complete_stale_task(task_id)` | anyone | Recovery path after expiry + 30 min |

Three invariants, enforced on-chain:

- A `release_step` cannot exceed remaining budget.
- One task open at a time.
- Withdrawal is blocked while a task is active.

The owner / agent_keypair split is what makes autonomy work. The user signs `approve_task` once with their wallet. The browser-side agent keypair signs every subsequent `release_step` without further wallet popups. The program's authority check enforces both keys are valid signers. **Removing the program lets the agent drain the wallet. The program is the safety primitive.**

## The four paid endpoints

`services/briefing/src/server.ts`. All x402-spec, all settle real Solana SPL USDC against the treasury, all gated by per-endpoint nonces.

| Endpoint | Price | Returns |
|---|---|---|
| `POST /brief` | 0.20 USDC | Long-form Solana DeFi briefing, LI.FI Earn data + Gemini synthesis |
| `POST /yield-snapshot` | 0.05 USDC | Top 3 USDC vaults right now, one-line summary |
| `POST /alert-check` | 0.05 USDC | Did the named vault tier change since last check? |
| `POST /synthesize` | 0.10 USDC | Take agent context, return a paragraph |

The agent picks among these per tick based on the goal. *"Watch Marginfi every 30 seconds, alert me on tier change"* fires `/alert-check` repeatedly and only escalates to `/synthesize` when something actually moves. *"Brief me on Solana DeFi every minute"* alternates `/brief` and `/yield-snapshot`.

A discovery endpoint at `GET /services` returns the list. **The pattern generalises: any developer can add a fifth endpoint with three lines of `paidEndpoint(name, price, handler)`.**

## The HexKit lineage

The intelligence under `/brief` and `/yield-snapshot` is HexKit's ranking engine, lifted into `app/src/lib/ranker/`. The source files literally say *"Lifted and trimmed from HexKit."*

| HexKit feature | In Sage | Where |
|---|---|---|
| Risk filter (reward-heavy, apy-spike, declining-yield, micro-tvl) | yes | `app/src/lib/ranker/risk-filter.ts` |
| Symbol aliases (USDC ↔ USDC.e ↔ USDBC) | yes | `app/src/lib/ranker/aliases.ts` |
| Vault ranker (safest / highest / balanced + 3-protocol diversity cap) | yes | `app/src/lib/ranker/rank.ts` |
| LI.FI Earn data ingestion + risk classification | yes | `app/src/lib/lifi/earn.ts`, briefing service |
| Gemini rationale | yes | `services/briefing/src/server.ts:geminiSummarise` |

What's not here, deliberately:
- LI.FI Composer execute for cross-chain top-up requires canonical USDC (mainnet); on devnet the route is quote-only. README documents the mainnet swap path.
- Composer execute for protocol vault deposit (Marginfi / Kamino / Solend) requires a stable devnet bank with a fresh oracle. Their devnet sandboxes are unreliable. The Sage program already exposes the pattern (`release_step` to any recipient ATA); a v2 deployment on mainnet would CPI directly.

**Sage is HexKit's ranker plus CleverCon's vault primitive plus a scheduler, on Solana.** That synthesis is what's new.

## The voice agent

ElevenLabs Conversational Agent with seven bound tools:

| Tool | Cost | Purpose |
|---|---|---|
| `get_vault_status()` | free | Read vault balance + active task |
| `find_yield(intent)` | free | Top 3 vaults from LI.FI Earn, ranked + filtered |
| `find_idle_assets()` | free | Idle USDC in user's wallet + suggested deployment |
| `propose_deposit(amount)` | wallet sig | Surface a confirm card; user clicks Confirm to sign |
| `propose_yield_deposit(slug, amount)` | wallet sig | Same, for a yield slug from the ranker |
| `pay_briefing()` | wallet sig | One-shot paid `/brief` call |
| `start_autonomous_task(goal, budget, intervalSeconds, durationMinutes)` | wallet sig | Open an autonomous task, hand off to Activity tab |

All wallet-touching tools surface a confirm card in the UI. The user click is the user gesture wallets need; the click triggers the actual signature. After each signed transaction, the result is pushed back to the agent via `sendContextualUpdate` so it can speak the outcome.

## Tech stack

| Layer | Choice |
|---|---|
| Solana program | Anchor 1.0.2 |
| Frontend | Vite + React 19 + Tailwind v4 |
| Wallet | `@solana/wallet-adapter` (Phantom / Solflare / Backpack via wallet-standard) |
| Voice | `@elevenlabs/react` Conversational Agents over websocket |
| Yield data | LI.FI Earn (`/v1/vaults`) |
| Cross-chain | LI.FI Composer (`/v1/quote`) — quote on devnet, real execute on mainnet |
| LLM | Gemini 2.5 Flash Lite for prose, deterministic fallback when key missing |
| x402 | Custom Solana SPL implementation, nonce-pinned per endpoint |
| Hosting | Vercel for app, local node for briefing service |
| RPC | devnet (Helius dedicated optional) |

## Setup

Requires Node 20+, pnpm, Solana CLI, Anchor 1.0.2.

```bash
# Install workspace
pnpm install

# 1. Briefing service
cd services/briefing
pnpm dev   # listens on :3001

# 2. App
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

The briefing service auto-loads `app/.env.local` via Node's `--env-file-if-exists`.

## Live addresses

| | |
|---|---|
| Sage program (devnet) | `64VYGx9kPeizgiqVRWGMBxbbsLV1n7YZTk8MezvpjqtZ` |
| USDC test mint (devnet) | `EzAYN6m9yDhwKHRdt9iY9LCgpPDdCXrUtmfoj7PWNYon` |
| Treasury (devnet) | `HKDKTVqJYfwZwSXMZiFKHe75bykunBFQUZW5gv6frYvw` |

## Demo paths to try

**1. Manual autonomous loop.** Vault tab → init + deposit ≥ $1 → Activity tab → Briefing shape, $0.50 cap, 30s interval, 2min duration → Start. Sign twice (SOL drip, then approve_task). Watch the loop fire `/brief` and `/yield-snapshot` calls, vault counter ticking down, every iteration linkable on solscan-devnet.

**2. Voice-triggered loop.** Talk → *"Run a Solana DeFi briefing every 30 seconds for 2 minutes, max one dollar."* Voice agent calls `start_autonomous_task`, app navigates to Activity, form pre-fills. Click Start.

**3. Idle-asset query.** Talk → *"What's idle?"* Voice agent calls `find_idle_assets`, reports USDC sitting outside the vault and suggests where it could earn.

## Track alignment

- **Solana Best App.** Novel `agent_keypair` pattern actually load-bearing. Atomic instruction sequences. Demo moment: program rejects the agent at $0.00.
- **Solana x402 bonus.** Every loop iteration is a real Solana SPL settlement against a paid endpoint. Four endpoints, all spec-compliant.
- **LI.FI prize.** LI.FI Earn is the data layer the agent pays USDC to read, on every `/brief`, `/yield-snapshot`, `/alert-check` call. Every paid call surfaces an `LI.FI Earn` badge in the Activity log.
- **ElevenLabs prize.** Voice is the only way to start a scheduled task. Conversational Agent with seven bound tools, including `find_idle_assets` (LI.FI free read) and `start_autonomous_task` (full session opener).

## Honest limitations

- Loop runs in the browser. Closing the tab stops the loop. The active task remains open on-chain and unsticks via `force_complete_stale_task` after expiry + 30 minutes. Production: move the loop to a worker / serverless cron.
- Devnet mint is custom, so LI.FI Composer cross-chain execute and real protocol deposits require mainnet. Quote works on devnet. Mainnet swap is a 30-minute config change (mint constant, RPC, redeploy) — the program does not change.
- Gemini failures fall back to templated prose. Briefings still carry live LI.FI numbers either way.

## Repo

```
sage/
├── programs/sage_vault/          Anchor program
├── services/briefing/            Four x402 paid endpoints, Express + Gemini
├── app/                          Vite + React frontend
│   ├── src/lib/sage-sdk/         Anchor IDL + program client
│   ├── src/lib/ranker/           HexKit ranker + risk filter (lifted)
│   ├── src/lib/lifi/             LI.FI Earn + Composer clients
│   ├── src/lib/x402/             x402 client (challenge + settle)
│   ├── src/hooks/useAutonomousTask.ts   Agent-keypair loop primitive
│   ├── src/lib/autonomous-decide.ts     Per-tick decision policy
│   └── src/components/AutonomousTaskPanel.tsx   Activity tab
└── PRD.md                        Product spec, locked v3
```

Built on the shoulders of Toll, RenderGate, x402-mcp-stellar-template, CleverCon, HexKit, and Cards402 — every prior project pointed at the same thesis. Sage is the Solana chapter.
