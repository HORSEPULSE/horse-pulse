import {
  fetchDexPairsByTokenAddress,
  fetchMoralisNativeBalance,
  fetchMoralisWalletBalances,
  fetchMoralisWalletHistory,
  type MoralisWalletTx,
} from "@/lib/api";
import { getOrSetCache } from "@/lib/cache/store";
import { analyzeContractRisk } from "@/lib/services/risk-engine";
import type {
  LpPosition,
  TokenExposure,
  TrustLevel,
  WalletBehaviorEvent,
  WalletProfileSnapshot,
} from "@/lib/types/intelligence";

function shortAddress(value: string): string {
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}

function unitsToNumber(value: string, decimals: number, precision = 6): number {
  try {
    const raw = BigInt(value || "0");
    const base = 10n ** BigInt(Math.max(decimals, 0));
    const whole = raw / base;
    const fraction = raw % base;
    const fractionStr = fraction.toString().padStart(Math.max(decimals, 1), "0").slice(0, precision);
    const parsed = Number(`${whole.toString()}.${fractionStr || "0"}`);
    return Number.isFinite(parsed) ? parsed : 0;
  } catch {
    return 0;
  }
}

function classifyTimelineEvents(txs: MoralisWalletTx[], address: string): WalletBehaviorEvent[] {
  const lower = address.toLowerCase();
  return txs.slice(0, 20).map((tx) => {
    const from = (tx.from_address ?? "").toLowerCase();
    const to = (tx.to_address ?? "").toLowerCase();
    const valuePls = unitsToNumber(tx.value ?? "0", 18);
    let kind: WalletBehaviorEvent["kind"] = "transfer";
    if (valuePls === 0 && to) kind = "contract_interaction";
    if (to.includes("swap") || to.includes("router")) kind = "swap";

    return {
      hash: tx.hash ?? "",
      kind,
      timestamp: tx.block_timestamp ?? new Date().toISOString(),
      valueUsdApprox: valuePls * 0.00001,
      from: from ? shortAddress(from) : "N/A",
      to: to ? shortAddress(to) : "N/A",
    };
  });
}

function estimateLpPositions(tokens: Array<{ symbol: string; usdValue: number }>): LpPosition[] {
  return tokens
    .filter((t) => /lp|pair|pool/i.test(t.symbol))
    .slice(0, 10)
    .map((lp) => ({
      pairLabel: lp.symbol,
      sharePct: Math.min(20, Math.max(0.1, lp.usdValue / 10000)),
      estimatedUsdValue: lp.usdValue,
      impermanentLossEstimatePct: 2 + Math.min(18, lp.usdValue / 20000),
      liquidityDepthUsd: lp.usdValue * 50,
    }));
}

function trustFromRisk(score: number): TrustLevel {
  if (score >= 80) return "High";
  if (score >= 65) return "Moderate";
  if (score >= 45) return "Speculative";
  return "High Risk";
}

async function buildTokenExposure(
  address: string,
  tokens: Array<{
    token_address: string;
    symbol: string;
    balance: string;
    decimals: string;
    usd_value?: number | null;
  }>,
  portfolioUsd: number,
): Promise<TokenExposure[]> {
  const top = tokens
    .map((t) => {
      const balance = unitsToNumber(t.balance || "0", Number(t.decimals || "18"));
      const usdValue = Number(t.usd_value ?? 0);
      return {
        tokenAddress: t.token_address.toLowerCase(),
        symbol: t.symbol || "UNKNOWN",
        balance,
        usdValue: Number.isFinite(usdValue) ? usdValue : 0,
      };
    })
    .sort((a, b) => b.usdValue - a.usdValue)
    .slice(0, 20);

  return Promise.all(
    top.map(async (token) => {
      const [pairs, risk] = await Promise.all([
        getOrSetCache(`price:${token.tokenAddress}`, 30_000, () => fetchDexPairsByTokenAddress(token.tokenAddress)).catch(() => []),
        getOrSetCache(`risk:${token.tokenAddress}`, 5 * 60_000, () => analyzeContractRisk(token.tokenAddress)).catch(() => null),
      ]);
      const pulsePairs = pairs.filter((p) => p.chainId?.toLowerCase() === "pulsechain");
      const liquidityDepthUsd = pulsePairs.reduce((acc, p) => acc + Number(p.liquidity?.usd ?? 0), 0) || null;
      const holderConcentration = !liquidityDepthUsd
        ? "high"
        : liquidityDepthUsd < 100_000
          ? "high"
          : liquidityDepthUsd < 750_000
            ? "medium"
            : "low";

      return {
        tokenAddress: token.tokenAddress,
        symbol: token.symbol,
        balance: token.balance,
        usdValue: token.usdValue,
        portfolioSharePct: portfolioUsd > 0 ? (token.usdValue / portfolioUsd) * 100 : 0,
        liquidityDepthUsd,
        holderConcentration,
        riskRating: risk?.trustLevel ?? trustFromRisk(45),
        burnedPct: null,
        ownerStatus: risk?.ownerStatus.renounced ? "renounced" : risk?.ownerStatus.ownerAddress ? "owner_active" : "unknown",
      };
    }),
  );
}

function estimateFlow(timeline: WalletBehaviorEvent[]): { inUsd: number; outUsd: number } {
  return timeline.reduce(
    (acc, item) => {
      if (item.kind === "swap" || item.kind === "contract_interaction") {
        acc.outUsd += item.valueUsdApprox;
      } else {
        acc.inUsd += item.valueUsdApprox * 0.45;
        acc.outUsd += item.valueUsdApprox * 0.55;
      }
      return acc;
    },
    { inUsd: 0, outUsd: 0 },
  );
}

export async function getWalletProfileSnapshot(address: string): Promise<WalletProfileSnapshot> {
  const cacheKey = `profile:${address.toLowerCase()}`;
  return getOrSetCache(cacheKey, 60_000, async () => {
    const [nativeWei, balances, history] = await Promise.all([
      fetchMoralisNativeBalance(address),
      fetchMoralisWalletBalances(address),
      fetchMoralisWalletHistory(address, 50),
    ]);

    const totalPortfolioUsd = balances.reduce((acc, t) => acc + Number(t.usd_value ?? 0), 0);
    const plsBalance = unitsToNumber(nativeWei.toString(), 18);
    const tokenExposure = await buildTokenExposure(address, balances, totalPortfolioUsd);
    const lpPositions = estimateLpPositions(
      balances.map((b) => ({ symbol: b.symbol || "UNKNOWN", usdValue: Number(b.usd_value ?? 0) })),
    );
    const behaviorTimeline = classifyTimelineEvents(history, address);
    const flows = estimateFlow(behaviorTimeline);

    const weighted24h = tokenExposure.reduce((acc, t) => acc + t.portfolioSharePct * (t.riskRating === "High" ? 0.1 : -0.08), 0);
    const change7dPctApprox = weighted24h * 2.3;
    const change30dPctApprox = weighted24h * 5.4;

    return {
      wallet: address.toLowerCase(),
      overview: {
        totalPortfolioUsd,
        totalPortfolioPls: plsBalance,
        tokenCount: balances.length,
        lpPositionCount: lpPositions.length,
        stakedPositionCount: 0,
        nftCount: 0,
        netInflowUsdApprox: flows.inUsd,
        netOutflowUsdApprox: flows.outUsd,
        change7dPctApprox,
        change30dPctApprox,
      },
      tokens: tokenExposure,
      lpPositions,
      stakedPositions: [],
      nftPositions: [],
      behaviorTimeline,
    };
  });
}

