export interface X402Challenge {
  scheme: string;
  network: string;
  amount: string;
  asset: string;
  mint: string;
  recipient: string;
  nonce: string;
  expiresIn: number;
  instructions: string;
}

export interface X402ChallengeResponse {
  payment: X402Challenge;
}

export async function fetchChallenge(
  serviceUrl: string,
  body?: unknown,
): Promise<X402Challenge> {
  const res = await fetch(serviceUrl, {
    method: "POST",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (res.status !== 402) {
    throw new Error(
      `Expected 402 from ${serviceUrl}, got ${res.status}: ${await res.text()}`,
    );
  }
  const parsed = (await res.json()) as X402ChallengeResponse;
  return parsed.payment;
}

export interface X402Result<T = unknown> {
  briefing?: string;
  paid?: { signature: string; amount: number; asset: string; endpoint?: string };
  data?: T;
  [key: string]: unknown;
}

export async function settleAndFetch<T = unknown>(
  serviceUrl: string,
  signature: string,
  nonce: string,
  body?: unknown,
): Promise<X402Result<T>> {
  const res = await fetch(serviceUrl, {
    method: "POST",
    headers: {
      "X-Payment": signature,
      "X-Payment-Nonce": nonce,
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`x402 settle failed (${res.status}): ${text}`);
  }
  return res.json();
}
