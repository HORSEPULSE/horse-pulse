import type { PortfolioActivity, PortfolioToken } from "@/lib/types/portfolio";
import type { ProviderPortfolioPayload } from "@/lib/services/portfolio/providers/shared";

type AlchemyTokenBalance = {
  contractAddress: string;
  tokenBalance: string;
};

type AlchemyTokenBalancesResponse = {
  tokenBalances?: AlchemyTokenBalance[];
};

type AlchemyAssetTransfer = {
  hash: string;
  metadata?: { blockTimestamp?: string };
  value?: number;
  category?: string;
};

type AlchemyTransferResponse = {
  transfers?: AlchemyAssetTransfer[];
};

async function rpc<T>(url: string, method: string, params: unknown[]): Promise<T | null> {
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: Date.now(), method, params }),
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { result?: T };
    return data.result ?? null;
  } catch {
    return null;
  }
}

function unitsToNumber(value: string, decimals = 18): number {
  try {
    const n = BigInt(value || "0");
    const base = 10n ** BigInt(decimals);
    const whole = n / base;
    const frac = n % base;
    return Number(`${whole.toString()}.${frac.toString().padStart(decimals, "0").slice(0, 6)}`);
  } catch {
    return 0;
  }
}

export async function fetchFromAlchemy(address: string): Promise<ProviderPortfolioPayload | null> {
  const apiKey = process.env.ALCHEMY_API_KEY;
  if (!apiKey) return null;
  const base = process.env.ALCHEMY_ETH_URL || `https://eth-mainnet.g.alchemy.com/v2/${apiKey}`;

  const [balances, transfers] = await Promise.all([
    rpc<AlchemyTokenBalancesResponse>(base, "alchemy_getTokenBalances", [address, "DEFAULT_TOKENS"]),
    rpc<AlchemyTransferResponse>(base, "alchemy_getAssetTransfers", [
      {
        fromBlock: "0x0",
        toAddress: address,
        category: ["erc20", "external"],
        maxCount: "0x14",
        withMetadata: true,
      },
    ]),
  ]);

  const tokens: PortfolioToken[] = (balances?.tokenBalances || [])
    .filter((x) => x.tokenBalance && x.tokenBalance !== "0x0")
    .map((item) => ({
      chain: "ethereum",
      tokenAddress: item.contractAddress.toLowerCase(),
      symbol: "TOKEN",
      name: "Token",
      balance: unitsToNumber(item.tokenBalance, 18),
      priceUsd: 0,
      valueUsd: 0,
      change24hPct: null,
      protocol: null,
      isLP: false,
      isStaked: false,
    }));

  const activity: PortfolioActivity[] = (transfers?.transfers || []).map((tx) => ({
    hash: tx.hash,
    chain: "ethereum",
    timestamp: tx.metadata?.blockTimestamp || new Date().toISOString(),
    action: tx.category || "transfer",
    protocol: null,
    gasUsd: null,
    amountUsd: tx.value ?? null,
  }));

  return { tokens, activity };
}

