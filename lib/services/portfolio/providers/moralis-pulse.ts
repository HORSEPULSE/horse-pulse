import {
  fetchMoralisWalletBalances,
  fetchMoralisWalletHistory,
  type MoralisTokenBalance,
  type MoralisWalletTx,
} from "@/lib/api";
import type { PortfolioActivity, PortfolioToken } from "@/lib/types/portfolio";
import type { ProviderPortfolioPayload } from "@/lib/services/portfolio/providers/shared";

function unitsToNumber(value: string, decimals: number, precision = 6): number {
  try {
    const raw = BigInt(value || "0");
    const base = 10n ** BigInt(Math.max(decimals, 0));
    const whole = raw / base;
    const fraction = raw % base;
    const fractionStr = fraction.toString().padStart(Math.max(decimals, 1), "0").slice(0, precision);
    const normalized = Number(`${whole.toString()}.${fractionStr || "0"}`);
    return Number.isFinite(normalized) ? normalized : 0;
  } catch {
    return 0;
  }
}

function mapTokens(tokens: MoralisTokenBalance[]): PortfolioToken[] {
  return tokens.map((token) => {
    const decimals = Number(token.decimals || "18");
    const balance = unitsToNumber(token.balance || "0", decimals);
    const valueUsd = Number(token.usd_value || 0);
    const priceUsd = Number(token.usd_price || 0);
    return {
      chain: "pulsechain",
      tokenAddress: token.token_address.toLowerCase(),
      symbol: token.symbol || "UNKNOWN",
      name: token.name || token.symbol || "Unknown",
      balance,
      priceUsd,
      valueUsd: Number.isFinite(valueUsd) ? valueUsd : 0,
      change24hPct: null,
      protocol: null,
      isLP: false,
      isStaked: false,
    };
  });
}

function mapActivity(items: MoralisWalletTx[]): PortfolioActivity[] {
  return items.map((tx) => ({
    hash: tx.hash || "",
    chain: "pulsechain",
    timestamp: tx.block_timestamp || new Date().toISOString(),
    action: "transfer",
    protocol: null,
    gasUsd: null,
    amountUsd: null,
  }));
}

export async function fetchFromMoralisPulse(address: string): Promise<ProviderPortfolioPayload | null> {
  try {
    const [balances, history] = await Promise.all([
      fetchMoralisWalletBalances(address),
      fetchMoralisWalletHistory(address, 20),
    ]);
    return {
      tokens: mapTokens(balances).filter((x) => x.valueUsd > 0),
      activity: mapActivity(history),
    };
  } catch {
    return null;
  }
}

