// LI.FI Composer client — fetch a cross-chain quote into the user's
// Solana vault. Hits the public li.quest API directly (no key required
// for read-only /v1/quote). Mirrors the web client without the proxy
// indirection.

export const LIFI_SOLANA_CHAIN_ID = 1151111081099710 // Solana on LI.FI's int32 chainId scheme

export interface QuoteRequest {
  fromChain: number
  toChain: number
  fromToken: string
  toToken: string
  fromAmount: string
  fromAddress?: string
  toAddress?: string
  signal?: AbortSignal
}

export interface QuoteResponse {
  id?: string
  estimate?: {
    fromAmount: string
    toAmount: string
    toAmountMin?: string
    executionDuration?: number
    feeCosts?: Array<{ amount: string; token: { symbol: string } }>
  }
  tool?: string
  toolDetails?: { name?: string; logoURI?: string }
  action?: {
    fromToken?: { symbol?: string }
    toToken?: { symbol?: string }
    fromChainId?: number
    toChainId?: number
  }
}

export async function fetchQuote(req: QuoteRequest): Promise<QuoteResponse> {
  const params = new URLSearchParams({
    fromChain: String(req.fromChain),
    toChain: String(req.toChain),
    fromToken: req.fromToken,
    toToken: req.toToken,
    fromAmount: req.fromAmount,
  })
  if (req.fromAddress) params.set('fromAddress', req.fromAddress)
  if (req.toAddress) params.set('toAddress', req.toAddress)

  const res = await fetch(`https://li.quest/v1/quote?${params.toString()}`, {
    signal: req.signal,
  })
  if (!res.ok) {
    throw new Error(`LI.FI Composer ${res.status}: ${await res.text()}`)
  }
  return res.json()
}
