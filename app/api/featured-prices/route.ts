import { NextResponse } from "next/server";
import { fetchDexPairByAddress, fetchDexPairsByTokenAddress, type DexPair } from "@/lib/api";

type FeaturedSymbol = "PLS" | "PLSX" | "HEX" | "INC" | "HORSE" | "EHEX" | "WBTC" | "DAI";
type Frame = "5m" | "1h" | "6h" | "24h";

export const dynamic = "force-dynamic";
export const revalidate = 0;

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

function toNumber(value: unknown): number | null {
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

type PairWithChange = DexPair & {
  priceNative?: string | number;
  priceChange?: { m5?: number; h1?: number; h6?: number; h24?: number };
};

function selectChange(
  pair: PairWithChange | null,
  frame: Frame,
): number | null {
  const p = pair?.priceChange;
  if (!p) return null;
  if (frame === "5m") return toNumber(p.m5);
  if (frame === "1h") return toNumber(p.h1);
  if (frame === "6h") return toNumber(p.h6);
  return toNumber(p.h24);
}

function getConfidence(totalLiquidityUsd: number, contributingPools: number): "high" | "medium" | "thin" {
  if (totalLiquidityUsd >= 2_000_000 && contributingPools >= 3) return "high";
  if (totalLiquidityUsd >= 250_000 && contributingPools >= 2) return "medium";
  return "thin";
}

function weightedAverage(values: Array<{ value: number; weight: number }>): number | null {
  if (!values.length) return null;
  const numerator = values.reduce((acc, item) => acc + item.value * item.weight, 0);
  const denominator = values.reduce((acc, item) => acc + item.weight, 0);
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator <= 0) return null;
  return numerator / denominator;
}

function aggregatePairs(pairs: PairWithChange[], frame: Frame) {
  const valid = pairs
    .filter((pair) => pair.chainId?.toLowerCase() === "pulsechain" && toNumber(pair.priceUsd) !== null)
    .map((pair) => ({ pair, liquidity: Math.max(toNumber(pair.liquidity?.usd) ?? 0, 0) }))
    .filter((item) => item.liquidity > 0)
    .sort((a, b) => b.liquidity - a.liquidity)
    .slice(0, 12);

  if (!valid.length) {
    return {
      priceUsd: null,
      priceNative: null,
      changeSelected: null,
      marketCapUsd: null,
      liquidityUsd: 0,
      sourcePairs: [] as string[],
      pairCount: 0,
      topPair: null as PairWithChange | null,
      confidence: "thin" as const,
    };
  }

  // Reject obvious outlier pools (bad/stale pools) using median deviation bounds.
  const prices = valid.map((v) => Number(v.pair.priceUsd)).sort((a, b) => a - b);
  const median = prices[Math.floor(prices.length / 2)];
  const cleaned = valid.filter((v) => {
    const p = Number(v.pair.priceUsd);
    if (!Number.isFinite(p) || p <= 0) return false;
    // Keep within 40%..250% of median to preserve valid spread but remove extreme outliers.
    return p >= median * 0.4 && p <= median * 2.5;
  });
  const basket = cleaned.length >= 2 ? cleaned : valid;

  const weights = basket.map(({ liquidity }) => Math.sqrt(liquidity));
  const weightedValues = basket.map((item, idx) => ({ item, weight: weights[idx] }));

  const priceUsd = weightedAverage(
    weightedValues
      .map(({ item, weight }) => ({ value: Number(item.pair.priceUsd), weight }))
      .filter((v) => Number.isFinite(v.value)),
  );

  const priceNative = weightedAverage(
    weightedValues
      .map(({ item, weight }) => ({ value: Number(item.pair.priceNative ?? Number.NaN), weight }))
      .filter((v) => Number.isFinite(v.value)),
  );

  const changeSelected = weightedAverage(
    weightedValues
      .map(({ item, weight }) => ({ value: Number(selectChange(item.pair, frame) ?? Number.NaN), weight }))
      .filter((v) => Number.isFinite(v.value)),
  );

  const marketCapUsd = weightedAverage(
    weightedValues
      .map(({ item, weight }) => ({ value: Number(item.pair.marketCap ?? item.pair.fdv ?? Number.NaN), weight }))
      .filter((v) => Number.isFinite(v.value)),
  );

  const totalLiquidityUsd = basket.reduce((acc, item) => acc + item.liquidity, 0);
  const topPair = basket[0].pair;

  return {
    priceUsd,
    priceNative,
    changeSelected,
    marketCapUsd,
    liquidityUsd: totalLiquidityUsd,
    sourcePairs: basket.map((item) => item.pair.pairAddress).filter(Boolean),
    pairCount: basket.length,
    topPair,
    confidence: getConfidence(totalLiquidityUsd, basket.length),
  };
}

export async function GET(request: Request) {
  try {
    const frameParam = new URL(request.url).searchParams.get("frame");
    const requestedFrame: Frame =
      frameParam === "5m" || frameParam === "1h" || frameParam === "6h" || frameParam === "24h" ? frameParam : "24h";

    const tokenMap: Record<FeaturedSymbol, string> = {
      PLS: "0xa1077a294dde1b09bb078844df40758a5d0f9a27",
      PLSX: "0x95b303987a60c71504d99aa1b13b4da07b0790ab",
      HEX: "0x2b591e99afe9f32eaa6214f7b7629768c40eeb39",
      INC: "0x2fa878ab3f87cc1c9737fc071108f904c0b0c95d",
      HORSE: "0x8536949300886be15d6033da56473e7c368c8df2",
      EHEX: "0x57fde0a71132198bbec939b98976993d8d89d225",
      WBTC: "0x2260fac5e5542a773aa44fbcfedf7c193bc2c599",
      DAI: "0x6b175474e89094c44da98b954eedeac495271d0f",
    };
    const forcedPairMap: Partial<Record<FeaturedSymbol, string>> = {
      WBTC: "0x46e27ea3a035ffc9e6d6d56702ce3d208ff1e58c",
    };

    const results = await Promise.all(
      (Object.keys(tokenMap) as FeaturedSymbol[]).map(async (symbol) => {
        try {
          const tokenPairs = await fetchDexPairsByTokenAddress(tokenMap[symbol]);
          const forcedPairAddress = forcedPairMap[symbol];
          const forcedPair =
            forcedPairAddress
              ? await fetchDexPairByAddress("pulsechain", forcedPairAddress).catch(() => null)
              : null;
          // If a symbol is pinned to a known pair, use only that pair for deterministic output.
          const pairs = forcedPair ? [forcedPair] : tokenPairs;
          const best = pickBestPulsePair(pairs) as PairWithChange | null;
          const aggregate = aggregatePairs(pairs as PairWithChange[], requestedFrame);

          return {
            symbol,
            priceUsd: toNumber(aggregate.priceUsd),
            priceNative: toNumber(aggregate.priceNative),
            quoteSymbol: best?.quoteToken?.symbol ?? null,
            change24h: toNumber(best?.priceChange?.h24),
            changeSelected: toNumber(aggregate.changeSelected),
            marketCapUsd: toNumber(aggregate.marketCapUsd),
            liquidityUsd: toNumber(aggregate.liquidityUsd),
            pairAddress: best?.pairAddress ?? null,
            pairCount: aggregate.pairCount,
            confidence: aggregate.confidence,
            sourcePairs: aggregate.sourcePairs,
          };
        } catch {
          return {
            symbol,
            priceUsd: null,
            priceNative: null,
            quoteSymbol: null,
            change24h: null,
            changeSelected: null,
            marketCapUsd: null,
            liquidityUsd: null,
            pairAddress: null,
            pairCount: 0,
            confidence: "thin",
            sourcePairs: [],
          };
        }
      }),
    );

    return NextResponse.json({ frame: requestedFrame, updatedAt: new Date().toISOString(), data: results });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch featured prices.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
