import type { PortfolioActivity, PortfolioToken, SupportedChain } from "@/lib/types/portfolio";

export type ProviderPortfolioPayload = {
  tokens: PortfolioToken[];
  activity: PortfolioActivity[];
};

export function toChainIdHex(chain: SupportedChain): string {
  switch (chain) {
    case "ethereum":
      return "0x1";
    case "bsc":
      return "0x38";
    case "polygon":
      return "0x89";
    case "arbitrum":
      return "0xa4b1";
    case "optimism":
      return "0xa";
    case "pulsechain":
      return "0x171";
    default:
      return "0x1";
  }
}

export function dedupeTokens(tokens: PortfolioToken[]): PortfolioToken[] {
  const merged = new Map<string, PortfolioToken>();
  for (const token of tokens) {
    const key = `${token.chain}:${token.tokenAddress.toLowerCase()}`;
    const current = merged.get(key);
    if (!current) {
      merged.set(key, token);
      continue;
    }
    merged.set(key, {
      ...current,
      balance: current.balance + token.balance,
      valueUsd: current.valueUsd + token.valueUsd,
      priceUsd: token.priceUsd || current.priceUsd,
      change24hPct: token.change24hPct ?? current.change24hPct,
      protocol: current.protocol || token.protocol,
      isLP: current.isLP || token.isLP,
      isStaked: current.isStaked || token.isStaked,
    });
  }
  return [...merged.values()].sort((a, b) => b.valueUsd - a.valueUsd);
}

export function dedupeActivity(items: PortfolioActivity[]): PortfolioActivity[] {
  const seen = new Set<string>();
  const out: PortfolioActivity[] = [];
  for (const item of items) {
    if (seen.has(item.hash)) continue;
    seen.add(item.hash);
    out.push(item);
  }
  return out.sort((a, b) => +new Date(b.timestamp) - +new Date(a.timestamp)).slice(0, 50);
}

