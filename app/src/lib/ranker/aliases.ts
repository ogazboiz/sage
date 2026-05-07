// Symbol alias groups so "USDC" matches USDC.e and similar wrappers.
// Lifted and trimmed from HexKit. Keep groups frozen so callers can't mutate.
export const SYMBOL_ALIAS_GROUPS: ReadonlyArray<ReadonlySet<string>> = [
  new Set(["USDC", "USDC.E", "USDBC"]),
  new Set(["USDT", "USDT.E"]),
  new Set(["SOL", "WSOL"]),
  new Set(["ETH", "WETH"]),
  new Set(["BTC", "WBTC", "CBBTC", "TBTC"]),
];

const SYMBOL_TO_GROUP = new Map<string, ReadonlySet<string>>();
for (const group of SYMBOL_ALIAS_GROUPS) {
  for (const sym of group) {
    SYMBOL_TO_GROUP.set(sym.toUpperCase(), group);
  }
}

export function symbolMatches(target: string, candidate: string): boolean {
  const t = target.toUpperCase();
  const c = candidate.toUpperCase();
  if (t === c) return true;
  const group = SYMBOL_TO_GROUP.get(t);
  if (!group) return false;
  return group.has(c);
}
