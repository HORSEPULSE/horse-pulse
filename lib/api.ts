export type DexPair = {
  chainId: string;
  dexId: string;
  pairAddress: string;
  baseToken: { symbol: string; address: string };
  quoteToken: { symbol: string; address: string };
  priceUsd?: string;
  priceChange?: { h24?: number };
  fdv?: number;
  marketCap?: number;
  volume?: { h24?: number };
  liquidity?: { usd?: number };
};

const DEXSCREENER_BASE = "https://api.dexscreener.com/latest/dex";
const MORALIS_BASE = "https://deep-index.moralis.io/api/v2.2";

export async function fetchDexPairs(query: string): Promise<DexPair[]> {
  if (!query.trim()) return [];

  const res = await fetch(`${DEXSCREENER_BASE}/search?q=${encodeURIComponent(query)}`, {
    next: { revalidate: 30 },
  });

  if (!res.ok) {
    throw new Error(`Dexscreener request failed: ${res.status}`);
  }

  const data = (await res.json()) as { pairs?: DexPair[] };
  return data.pairs ?? [];
}

export async function fetchDexPairsByTokenAddress(address: string): Promise<DexPair[]> {
  if (!address.trim()) return [];

  const res = await fetch(`${DEXSCREENER_BASE}/tokens/${address}`, {
    next: { revalidate: 30 },
  });

  if (!res.ok) {
    throw new Error(`Dexscreener token request failed: ${res.status}`);
  }

  const data = (await res.json()) as { pairs?: DexPair[] };
  return data.pairs ?? [];
}

type RpcRequest = {
  jsonrpc: "2.0";
  id: number;
  method: string;
  params: unknown[];
};

async function callPulseRpc<T>(method: string, params: unknown[] = []): Promise<T> {
  const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL;
  if (!rpcUrl) {
    throw new Error("NEXT_PUBLIC_RPC_URL is not defined. Add it in .env.local.");
  }

  const body: RpcRequest = { jsonrpc: "2.0", id: Date.now(), method, params };
  const res = await fetch(rpcUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Pulse RPC failed: ${res.status}`);
  }

  const data = (await res.json()) as { result?: T; error?: { message?: string } };
  if (data.error) {
    throw new Error(data.error.message || "Unknown Pulse RPC error");
  }

  return data.result as T;
}

export async function getLatestBlockNumber(): Promise<number> {
  const result = await callPulseRpc<string>("eth_blockNumber");
  return parseInt(result, 16);
}

export async function getGasPriceWei(): Promise<bigint> {
  const result = await callPulseRpc<string>("eth_gasPrice");
  return BigInt(result);
}

export type MoralisTokenBalance = {
  token_address: string;
  symbol: string;
  name: string;
  balance: string;
  decimals: string;
  logo?: string | null;
  thumbnail?: string | null;
  usd_price?: number | null;
  usd_value?: number | null;
};

export async function fetchMoralisWalletBalances(address: string): Promise<MoralisTokenBalance[]> {
  const key = process.env.MORALIS_API_KEY || process.env.NEXT_PUBLIC_MORALIS_KEY;

  // Moralis API key is required here. Prefer MORALIS_API_KEY (server-only), fallback NEXT_PUBLIC_MORALIS_KEY.
  if (!key) {
    throw new Error("MORALIS_API_KEY or NEXT_PUBLIC_MORALIS_KEY is missing.");
  }

  const url = `${MORALIS_BASE}/wallets/${address}/tokens?chain=0x171&token_prices=true`;
  const res = await fetch(url, {
    headers: {
      Accept: "application/json",
      "X-API-Key": key,
    },
    next: { revalidate: 30 },
  });

  if (!res.ok) {
    throw new Error(`Moralis request failed: ${res.status}`);
  }

  const data = (await res.json()) as { result?: MoralisTokenBalance[] };
  return data.result ?? [];
}

export type MoralisWalletTx = {
  hash?: string;
  from_address?: string;
  to_address?: string;
  value?: string;
  gas_price?: string;
  block_timestamp?: string;
  receipt_status?: string;
};

export async function fetchMoralisWalletHistory(address: string, limit = 20): Promise<MoralisWalletTx[]> {
  const key = process.env.MORALIS_API_KEY || process.env.NEXT_PUBLIC_MORALIS_KEY;
  if (!key) {
    throw new Error("MORALIS_API_KEY or NEXT_PUBLIC_MORALIS_KEY is missing.");
  }

  const url = `${MORALIS_BASE}/wallets/${address}/history?chain=0x171&order=DESC&limit=${limit}`;
  const res = await fetch(url, {
    headers: {
      Accept: "application/json",
      "X-API-Key": key,
    },
    next: { revalidate: 20 },
  });

  if (!res.ok) {
    throw new Error(`Moralis history request failed: ${res.status}`);
  }

  const data = (await res.json()) as { result?: MoralisWalletTx[] };
  return data.result ?? [];
}

export async function fetchMoralisNativeBalance(address: string): Promise<bigint> {
  const key = process.env.MORALIS_API_KEY || process.env.NEXT_PUBLIC_MORALIS_KEY;
  if (!key) {
    throw new Error("MORALIS_API_KEY or NEXT_PUBLIC_MORALIS_KEY is missing.");
  }

  const url = `${MORALIS_BASE}/wallets/${address}/balance?chain=0x171`;
  const res = await fetch(url, {
    headers: {
      Accept: "application/json",
      "X-API-Key": key,
    },
    next: { revalidate: 20 },
  });

  if (!res.ok) {
    throw new Error(`Moralis native balance request failed: ${res.status}`);
  }

  const data = (await res.json()) as { balance?: string };
  return BigInt(data.balance ?? "0");
}

export type OverviewSnapshot = {
  plsPriceUsd: number | null;
  marketCapUsd: number | null;
  supplyText: string;
  gasPriceGwei: number | null;
  change24h: number | null;
  latestBlock: number | null;
};

export async function fetchOverviewSnapshot(): Promise<OverviewSnapshot> {
  const [pairs, gasWei, latestBlock] = await Promise.all([
    fetchDexPairs("PLS"),
    getGasPriceWei(),
    getLatestBlockNumber(),
  ]);

  const bestPair = pairs.find((p) => p.priceUsd) ?? null;
  return {
    plsPriceUsd: bestPair?.priceUsd ? Number(bestPair.priceUsd) : null,
    marketCapUsd: bestPair?.marketCap ?? bestPair?.fdv ?? null,
    // Circulating supply is not directly available from lightweight public endpoints.
    supplyText: "N/A",
    gasPriceGwei: Number(gasWei) / 1e9,
    change24h: bestPair?.priceChange?.h24 ?? null,
    latestBlock: Number.isFinite(latestBlock) ? latestBlock : null,
  };
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Request failed: ${res.status}`);
  }
  return (await res.json()) as T;
}

export type WalletApiResponse = {
  address: string;
  nativeBalancePls: number;
  estimatedPortfolioUsd: number;
  holdings: Array<{
    tokenAddress: string;
    symbol: string;
    name: string;
    balance: number;
    usdValue: number;
    priceUsd: number | null;
  }>;
  transactions: Array<{
    hash: string;
    from: string;
    to: string;
    timestamp: string;
    valuePls: number;
    status: string;
  }>;
};

export type ExplorerApiResponse = {
  query: string;
  kind: "tx" | "address" | "token";
  details: Array<{ label: string; value: string }>;
  transactions: Array<{ hash: string; from: string; amount: string; timestamp?: string }>;
  holders: Array<{ wallet: string; balance: string }>;
  pairs: DexPair[];
};

export async function fetchWalletSnapshotClient(address: string): Promise<WalletApiResponse> {
  return fetchJson<WalletApiResponse>(`/api/wallet/${address}`);
}

export async function fetchExplorerSnapshotClient(query: string): Promise<ExplorerApiResponse> {
  return fetchJson<ExplorerApiResponse>(`/api/explorer?q=${encodeURIComponent(query)}`);
}

export async function fetchOverviewSnapshotClient(): Promise<OverviewSnapshot> {
  return fetchJson<OverviewSnapshot>("/api/overview");
}
