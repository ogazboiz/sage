// Thin client for the LI.FI Composer (li.quest) API. We hit it through the
// Vite proxy so the LIFI_API_KEY stays server-side.

const COMPOSER_PROXY = "/api/lifi-composer";

export interface QuoteRequest {
  fromChain: number;
  toChain: number;
  fromToken: string;
  toToken: string;
  fromAmount: string;
  fromAddress?: string;
  toAddress?: string;
  signal?: AbortSignal;
}

export interface QuoteResponse {
  id?: string;
  estimate?: {
    fromAmount: string;
    toAmount: string;
    toAmountMin?: string;
    executionDuration?: number;
    feeCosts?: Array<{ amount: string; token: { symbol: string } }>;
  };
  tool?: string;
  toolDetails?: { name?: string; logoURI?: string };
  action?: {
    fromToken?: { symbol?: string };
    toToken?: { symbol?: string };
    fromChainId?: number;
    toChainId?: number;
  };
}

export async function fetchQuote(req: QuoteRequest): Promise<QuoteResponse> {
  const url = new URL(`${COMPOSER_PROXY}/v1/quote`, window.location.origin);
  url.searchParams.set("fromChain", String(req.fromChain));
  url.searchParams.set("toChain", String(req.toChain));
  url.searchParams.set("fromToken", req.fromToken);
  url.searchParams.set("toToken", req.toToken);
  url.searchParams.set("fromAmount", req.fromAmount);
  if (req.fromAddress) url.searchParams.set("fromAddress", req.fromAddress);
  if (req.toAddress) url.searchParams.set("toAddress", req.toAddress);

  const res = await fetch(url.toString(), {
    signal: req.signal ?? AbortSignal.timeout(15_000),
  });
  if (!res.ok) {
    throw new Error(`LI.FI Composer ${res.status}: ${await res.text()}`);
  }
  return res.json();
}
