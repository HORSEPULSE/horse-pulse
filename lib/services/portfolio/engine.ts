import { getOrSetCache } from "@/lib/cache/store";
import type { NftHolding, PortfolioSnapshot, PortfolioToken } from "@/lib/types/portfolio";
import { fetchFromDebank } from "@/lib/services/portfolio/providers/debank";
import { fetchFromCovalent } from "@/lib/services/portfolio/providers/covalent";
import { fetchFromAlchemy } from "@/lib/services/portfolio/providers/alchemy";
import { fetchFromMoralisPulse } from "@/lib/services/portfolio/providers/moralis-pulse";
import { dedupeActivity, dedupeTokens } from "@/lib/services/portfolio/providers/shared";

function toBreakdown(tokens: PortfolioToken[]): PortfolioSnapshot["chainBreakdown"] {
  const total = tokens.reduce((acc, t) => acc + t.valueUsd, 0);
  const map = new Map<string, number>();
  for (const token of tokens) {
    map.set(token.chain, (map.get(token.chain) || 0) + token.valueUsd);
  }
  return [...map.entries()]
    .map(([chain, valueUsd]) => ({
      chain: chain as PortfolioSnapshot["chainBreakdown"][number]["chain"],
      valueUsd,
      sharePct: total > 0 ? (valueUsd / total) * 100 : 0,
    }))
    .sort((a, b) => b.valueUsd - a.valueUsd);
}

function deriveNftsFromTokens(tokens: PortfolioToken[]): NftHolding[] {
  return tokens
    .filter((t) => t.symbol.includes("NFT"))
    .slice(0, 20)
    .map((t, idx) => ({
      chain: t.chain,
      contract: t.tokenAddress,
      tokenId: String(idx + 1),
      name: t.name,
      imageUrl: null,
      estimatedValueUsd: t.valueUsd || null,
    }));
}

export async function getPortfolioSnapshot(address: string): Promise<PortfolioSnapshot> {
  const key = `portfolio:v1:${address.toLowerCase()}`;
  return getOrSetCache(key, 60_000, async () => {
    const [pulse, debank, covalent, alchemy] = await Promise.all([
      fetchFromMoralisPulse(address),
      fetchFromDebank(address),
      fetchFromCovalent(address),
      fetchFromAlchemy(address),
    ]);

    const tokenList = dedupeTokens([
      ...(pulse?.tokens || []),
      ...(debank?.tokens || []),
      ...(covalent?.tokens || []),
      ...(alchemy?.tokens || []),
    ]);
    const activity = dedupeActivity([
      ...(pulse?.activity || []),
      ...(debank?.activity || []),
      ...(covalent?.activity || []),
      ...(alchemy?.activity || []),
    ]).slice(0, 20);

    const totalValueUsd = tokenList.reduce((acc, t) => acc + t.valueUsd, 0);
    const lpPositions = tokenList.filter((t) => t.isLP);
    const stakedPositions = tokenList.filter((t) => t.isStaked);
    const nftPositions = deriveNftsFromTokens(tokenList);

    return {
      address: address.toLowerCase(),
      fetchedAt: new Date().toISOString(),
      totalValueUsd,
      totalValueNative: null,
      chainBreakdown: toBreakdown(tokenList),
      tokenBreakdown: tokenList.slice(0, 200),
      lpPositions,
      stakedPositions,
      nftPositions,
      recentActivity: activity,
    };
  });
}

