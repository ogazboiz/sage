// Heuristic that turns a free-text goal into a per-tick decision policy.
// Cheap keyword matching — no LLM needed because the agent only has five
// endpoints to choose from. The policy reads the goal once, picks a
// "shape", and on every tick decides which endpoint to call given the
// running history.
//
// Ported from the web app. Pure TS, no platform deps — the same module
// that runs in the browser drives the mobile loop.

export type Shape = 'briefing' | 'monitor' | 'content' | 'market' | 'auto'

export type Endpoint =
  | '/brief'
  | '/yield-snapshot'
  | '/alert-check'
  | '/synthesize'
  | '/market-pulse'

export interface DecisionResult {
  endpoint: Endpoint
  body?: Record<string, unknown>
}

export interface TaskIteration {
  index: number
  endpoint: Endpoint
  amount: number
  signature: string
  result: string
  ts: number
}

export interface DecisionContext {
  iteration: number
  budgetRemaining: number
  history: TaskIteration[]
  goal: string
}

export type DecidePolicy = (
  ctx: DecisionContext,
) => Promise<DecisionResult | null | undefined> | DecisionResult | null | undefined

interface PolicyInput {
  goal: string
  shape?: Shape
  monitorSlug?: string
}

const MONITOR_KEYWORDS = ['watch', 'monitor', 'alert', 'track', 'if', 'when']
const CONTENT_KEYWORDS = ['write', 'draft', 'tweet', 'summarise', 'summarize', 'report', 'post']
const BRIEFING_KEYWORDS = ['brief', 'briefing', 'update', 'rundown']
const MARKET_KEYWORDS = ['market', 'price', 'prices', 'pulse', 'sol', 'eth', 'btc', 'ticker']

function detectShape(goal: string): Shape {
  const g = goal.toLowerCase()
  const market = MARKET_KEYWORDS.some(k => new RegExp(`\\b${k}\\b`).test(g))
  const monitor = MONITOR_KEYWORDS.some(k => g.includes(k))
  const content = CONTENT_KEYWORDS.some(k => g.includes(k))
  const briefing = BRIEFING_KEYWORDS.some(k => g.includes(k))
  if (market) return 'market'
  if (monitor) return 'monitor'
  if (content) return 'content'
  if (briefing) return 'briefing'
  return 'auto'
}

export function buildDecidePolicy(input: PolicyInput): DecidePolicy {
  const shape = input.shape ?? detectShape(input.goal)
  const monitorSlug = input.monitorSlug ?? null

  return async (ctx: DecisionContext): Promise<DecisionResult | null | undefined> => {
    const { iteration, budgetRemaining, history } = ctx

    if (budgetRemaining < 0.05) return undefined

    if (shape === 'briefing') {
      if (iteration === 0 || iteration % 5 === 0) {
        if (budgetRemaining >= 0.2) return { endpoint: '/brief', body: { goal: ctx.goal } }
        return { endpoint: '/yield-snapshot', body: { goal: ctx.goal } }
      }
      return { endpoint: '/yield-snapshot', body: { goal: ctx.goal } }
    }

    if (shape === 'content') {
      if (iteration === 0) return { endpoint: '/yield-snapshot' }
      if (iteration === 1 && budgetRemaining >= 0.2) return { endpoint: '/brief' }
      const context = history.map(h => `[${h.endpoint}] ${h.result}`).slice(-4).join('\n')
      if (budgetRemaining >= 0.1) {
        return { endpoint: '/synthesize', body: { input: context } }
      }
      return undefined
    }

    if (shape === 'monitor') {
      const last = history[history.length - 1]
      const lastChanged =
        last && last.endpoint === '/alert-check' && /tier moved/i.test(last.result)
      if (lastChanged && budgetRemaining >= 0.1) {
        const recent = history.slice(-3).map(h => `[${h.endpoint}] ${h.result}`).join('\n')
        return {
          endpoint: '/synthesize',
          body: { input: `Goal: ${ctx.goal}\nRecent agent observations:\n${recent}` },
        }
      }
      return { endpoint: '/alert-check', body: { slug: monitorSlug ?? 'kamino-usdc' } }
    }

    if (shape === 'market') {
      if (iteration % 5 === 0 && budgetRemaining >= 0.05) {
        return { endpoint: '/yield-snapshot', body: { goal: ctx.goal } }
      }
      return { endpoint: '/market-pulse' }
    }

    // auto: front-load with /brief, then mix
    if (iteration === 0 && budgetRemaining >= 0.2) {
      return { endpoint: '/brief', body: { goal: ctx.goal } }
    }
    if (iteration === 1 && budgetRemaining >= 0.03) {
      return { endpoint: '/market-pulse' }
    }
    return { endpoint: '/yield-snapshot', body: { goal: ctx.goal } }
  }
}
