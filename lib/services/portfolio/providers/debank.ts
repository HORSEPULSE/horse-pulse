import type { PortfolioActivity, PortfolioToken, SupportedChain } from "@/lib/types/portfolio";
import type { ProviderPortfolioPayload } from "@/lib/services/portfolio/providers/shared";

type DebankChainItem = {
  chain?: string;
  id?: string;
  symbol?: string;
  name?: string;
  amount?: number;
  price?: number;
  usd_value?: number;
};

type DebankHistoryItem = {
  id?: string;
  chain?: string;
  cate_id?: string;
  project_id?: string | null;
  time_at?: number;
  tx?: { name?: string; eth_gas_fee_usd?: number } | null;
  receives?: Array<{ amount?: number; token?: { price?: number } }>;
};

function mapChain(chain?: string): SupportedChain {
  switch ((chain || "").toLowerCase()) {
    case "eth":
      return "ethereum";
    case "bsc":
      return "bsc";
    case "matic":
      return "polygon";
    case "arb":
      return "arbitrum";
    case "op":
      return "optimism";
    case "pls":
    case "pulsechain":
      return "pulsechain";
    default:
      return "ethereum";
  }
}

async function getJson<T>(url: string, apiKey: string): Promise<T | null> {
  try {
    const res = await fetch(url, {
      headers: { Accept: "application/json", AccessKey: apiKey },
      cache: "no-store",
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export async function fetchFromDebank(address: string): Promise<ProviderPortfolioPayload | null> {
  const key = process.env.DEBANK_ACCESS_KEY;
  if (!key) return null;

  const [balances, history] = await Promise.all([
    getJson<DebankChainItem[]>(
      `https://pro-openapi.debank.com/v1/user/all_token_list?id=${address}&is_all=true`,
      key,
    ),
    getJson<DebankHistoryItem[]>(
      `https://pro-openapi.debank.com/v1/user/history_list?id=${address}&chain=eth&page_count=20`,
      key,
    ),
  ]);

  const tokens: PortfolioToken[] = (balances || [])
    .filter((item) => Number(item.usd_value || 0) > 0)
    .map((item) => ({
      chain: mapChain(item.chain),
      tokenAddress: (item.id || "").toLowerCase(),
      symbol: item.symbol || "UNKNOWN",
      name: item.name || item.symbol || "Unknown",
      balance: Number(item.amount || 0),
      priceUsd: Number(item.price || 0),
      valueUsd: Number(item.usd_value || 0),
      change24hPct: null,
      protocol: null,
      isLP: false,
      isStaked: false,
    }));

  const activity: PortfolioActivity[] = (history || []).map((item) => {
    const amountUsd = (item.receives || []).reduce((acc, v) => {
      return acc + Number(v.amount || 0) * Number(v.token?.price || 0);
    }, 0);
    return {
      hash: item.id || "",
      chain: mapChain(item.chain),
      timestamp: item.time_at ? new Date(item.time_at * 1000).toISOString() : new Date().toISOString(),
      action: item.cate_id || item.tx?.name || "interaction",
      protocol: item.project_id || null,
      gasUsd: item.tx?.eth_gas_fee_usd ?? null,
      amountUsd: Number.isFinite(amountUsd) ? amountUsd : null,
    };
  });

  return { tokens, activity };
}

