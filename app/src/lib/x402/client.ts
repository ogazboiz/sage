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
): Promise<X402Challenge> {
  const res = await fetch(serviceUrl, { method: "POST" });
  if (res.status !== 402) {
    throw new Error(
      `Expected 402 from ${serviceUrl}, got ${res.status}: ${await res.text()}`,
    );
  }
  const body = (await res.json()) as X402ChallengeResponse;
  return body.payment;
}

export interface X402Result<T = unknown> {
  briefing?: string;
  paid?: { signature: string; amount: number; asset: string };
  data?: T;
}

export async function settleAndFetch<T = unknown>(
  serviceUrl: string,
  signature: string,
  nonce: string,
): Promise<X402Result<T>> {
  const res = await fetch(serviceUrl, {
    method: "POST",
    headers: {
      "X-Payment": signature,
      "X-Payment-Nonce": nonce,
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`x402 settle failed (${res.status}): ${text}`);
  }
  return res.json();
}
