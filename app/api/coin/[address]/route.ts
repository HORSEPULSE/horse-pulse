import { NextResponse } from "next/server";
import {
  fetchDexPairsByTokenAddress,
  fetchMoralisTokenOwners,
  type DexPair,
  type MoralisTokenOwner,
} from "@/lib/api";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function normalizeAddress(value: string): string {
  return value.trim().toLowerCase();
}

function isAddress(value: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(value);
}

function toNumber(value: unknown): number | null {
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function formatBalance(balance: string): string {
  const n = toNumber(balance);
  if (n === null) return balance;
  return n.toLocaleString(undefined, { maximumFractionDigits: 4 });
}

function pickBestPulsePair(pairs: DexPair[]): DexPair | null {
  const pulsePairs = pairs.filter((pair) => pair.chainId?.toLowerCase() === "pulsechain" && pair.priceUsd);
  if (!pulsePairs.length) return null;

  const preferred = pulsePairs.filter((pair) => {
    const quote = pair.quoteToken?.symbol?.toUpperCase() ?? "";
    return ["WPLS", "PLS", "USDC", "USDC.E", "USDT", "DAI", "USDL"].includes(quote);
  });

  const candidates = preferred.length ? preferred : pulsePairs;
  return candidates.sort((a, b) => Number(b.liquidity?.usd ?? 0) - Number(a.liquidity?.usd ?? 0))[0];
}

function mapTopHolders(owners: MoralisTokenOwner[]) {
  return owners.slice(0, 10).map((owner, index) => ({
    rank: index + 1,
    address: owner.owner_address,
    balance: formatBalance(owner.balance_formatted ?? owner.balance),
    percent: toNumber(owner.percentage_relative_to_total_supply),
    usdValue: toNumber(owner.usd_value),
  }));
}

export async function GET(_: Request, { params }: { params: { address: string } }) {
  try {
    const raw = params.address;
    if (!isAddress(raw)) {
      return NextResponse.json({ error: "Invalid token address." }, { status: 400 });
    }
    const address = normalizeAddress(raw);

    const [pairs, owners] = await Promise.all([
      fetchDexPairsByTokenAddress(address),
      fetchMoralisTokenOwners(address, 50).catch(() => []),
    ]);

    const bestPair = pickBestPulsePair(pairs);
    const topHolders = mapTopHolders(owners);

    return NextResponse.json({
      address,
      token: {
        symbol: bestPair?.baseToken?.symbol ?? "TOKEN",
        name: bestPair?.baseToken?.symbol ?? "PulseChain Token",
        imageUrl: null,
      },
      price: {
        usd: toNumber(bestPair?.priceUsd),
        change24h: toNumber(bestPair?.priceChange?.h24),
        marketCapUsd: toNumber(bestPair?.marketCap),
        fdvUsd: toNumber(bestPair?.fdv),
        liquidityUsd: toNumber(bestPair?.liquidity?.usd),
        volume24hUsd: toNumber(bestPair?.volume?.h24),
        pairAddress: bestPair?.pairAddress ?? null,
        dexId: bestPair?.dexId ?? null,
        quoteSymbol: bestPair?.quoteToken?.symbol ?? null,
      },
      holders: {
        total: owners.length || null,
        top: topHolders,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load coin details.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
