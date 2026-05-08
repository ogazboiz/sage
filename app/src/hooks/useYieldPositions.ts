import { useCallback, useEffect, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";

export interface YieldPosition {
  slug: string;
  protocol: string;
  network: string;
  amount: number;
  apy: number;
  signature: string;
  timestamp: number;
}

function storageKey(owner: string): string {
  return `sage:yield:${owner}`;
}

function read(owner: string): YieldPosition[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(storageKey(owner));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as YieldPosition[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function write(owner: string, positions: YieldPosition[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(storageKey(owner), JSON.stringify(positions));
}

// Yield commitments live in localStorage keyed by wallet pubkey. The on-chain
// release_step is real (USDC actually leaves the Sage vault), but the
// "deployed into Kamino/Marginfi/etc." association is tracked locally because
// the protocols use the canonical USDC mint and our devnet uses a custom
// mint, so a real CPI deposit is out of scope for the hackathon build.
export function useYieldPositions() {
  const { publicKey } = useWallet();
  const owner = publicKey?.toBase58() ?? "";
  const [positions, setPositions] = useState<YieldPosition[]>(() =>
    owner ? read(owner) : [],
  );

  useEffect(() => {
    setPositions(owner ? read(owner) : []);
  }, [owner]);

  const add = useCallback(
    (position: YieldPosition) => {
      if (!owner) return;
      const next = [position, ...read(owner)];
      write(owner, next);
      setPositions(next);
    },
    [owner],
  );

  const remove = useCallback(
    (signature: string) => {
      if (!owner) return;
      const next = read(owner).filter((p) => p.signature !== signature);
      write(owner, next);
      setPositions(next);
    },
    [owner],
  );

  const totalDeployed = positions.reduce((sum, p) => sum + p.amount, 0);

  return { positions, add, remove, totalDeployed };
}
