import type { PortfolioActivity, PortfolioToken, SupportedChain } from "@/lib/types/portfolio";
import type { ProviderPortfolioPayload } from "@/lib/services/portfolio/providers/shared";

type CovalentBalanceItem = {
  contract_address: string;
  contract_name: string;
  contract_ticker_symbol: string;
  logo_url?: string;
  balance: string;
  quote: number | null;
  quote_rate: number | null;
  contract_decimals: number;
};

type CovalentBalanceResponse = {
  data?: { items?: CovalentBalanceItem[] };
};

type CovalentTxItem = {
  tx_hash: string;
  block_signed_at: string;
  value_quote?: number | null;
  fees_paid_quote?: number | null;
  successful?: boolean;
};

type CovalentTxResponse = {
  data?: { items?: CovalentTxItem[] };
};

function chainCode(chain: SupportedChain): string {
  switch (chain) {
    case "ethereum":
      return "eth-mainnet";
    case "bsc":
      return "bsc-mainnet";
    case "polygon":
      return "matic-mainnet";
    case "arbitrum":
      return "arbitrum-mainnet";
    case "optimism":
      return "optimism-mainnet";
    case "pulsechain":
      return "eth-mainnet";
    default:
      return "eth-mainnet";
  }
}

const CHAINS: SupportedChain[] = ["ethereum", "bsc", "polygon", "arbitrum", "optimism"];

async function getJson<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

function unitsToNumber(value: string, decimals: number): number {
  try {
    const raw = BigInt(value || "0");
    const base = 10n ** BigInt(Math.max(0, decimals));
    const whole = raw / base;
    const frac = raw % base;
    return Number(`${whole.toString()}.${frac.toString().padStart(decimals, "0").slice(0, 6)}`);
  } catch {
    return 0;
  }
}

export async function fetchFromCovalent(address: string): Promise<ProviderPortfolioPayload | null> {
  const key = process.env.COVALENT_API_KEY;
  if (!key) return null;

  const tokenPromises = CHAINS.map(async (chain) => {
    const code = chainCode(chain);
    const url = `https://api.covalenthq.com/v1/${code}/address/${address}/balances_v2/?key=${key}&nft=false&no-spam=true`;
    const data = await getJson<CovalentBalanceResponse>(url);
    return (data?.data?.items || []).map((item) => ({
      chain,
      tokenAddress: item.contract_address.toLowerCase(),
      symbol: item.contract_ticker_symbol || "UNKNOWN",
      name: item.contract_name || "Unknown",
      balance: unitsToNumber(item.balance, Number(item.contract_decimals || 18)),
      priceUsd: Number(item.quote_rate || 0),
      valueUsd: Number(item.quote || 0),
      change24hPct: null,
      protocol: null,
      isLP: false,
      isStaked: false,
    })) as PortfolioToken[];
  });

  const txPromises = CHAINS.slice(0, 3).map(async (chain) => {
    const code = chainCode(chain);
    const url = `https://api.covalenthq.com/v1/${code}/address/${address}/transactions_v3/page/0/?key=${key}&page-size=10`;
    const data = await getJson<CovalentTxResponse>(url);
    return (data?.data?.items || []).map((item) => ({
      hash: item.tx_hash,
      chain,
      timestamp: item.block_signed_at,
      action: item.successful === false ? "failed_tx" : "transfer",
      protocol: null,
      gasUsd: item.fees_paid_quote ?? null,
      amountUsd: item.value_quote ?? null,
    })) as PortfolioActivity[];
  });

  const [tokenGroups, txGroups] = await Promise.all([Promise.all(tokenPromises), Promise.all(txPromises)]);
  return {
    tokens: tokenGroups.flat().filter((x) => x.valueUsd > 0),
    activity: txGroups.flat(),
  };
}

