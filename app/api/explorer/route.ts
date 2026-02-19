import { NextResponse } from "next/server";
import {
  fetchDexPairs,
  fetchDexPairsByTokenAddress,
  fetchMoralisWalletBalances,
  fetchMoralisWalletHistory,
  type ExplorerApiResponse,
} from "@/lib/api";

type RpcBody = {
  jsonrpc: "2.0";
  id: number;
  method: string;
  params: unknown[];
};

function shortAddress(value: string): string {
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}

function hexToBigInt(value?: string): bigint {
  try {
    if (!value) return 0n;
    return BigInt(value);
  } catch {
    return 0n;
  }
}

function decimalToBigInt(value?: string): bigint {
  try {
    if (!value) return 0n;
    return BigInt(value);
  } catch {
    return 0n;
  }
}

function unitsToNumber(value: bigint, decimals: number, precision = 6): number {
  const base = 10n ** BigInt(Math.max(decimals, 0));
  const whole = value / base;
  const fraction = value % base;
  const fractionStr = fraction.toString().padStart(Math.max(decimals, 1), "0").slice(0, precision);
  const parsed = Number(`${whole.toString()}.${fractionStr || "0"}`);
  return Number.isFinite(parsed) ? parsed : 0;
}

async function callRpc<T>(method: string, params: unknown[] = []): Promise<T> {
  const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL;
  if (!rpcUrl) {
    throw new Error("NEXT_PUBLIC_RPC_URL missing.");
  }

  const body: RpcBody = { jsonrpc: "2.0", id: Date.now(), method, params };
  const res = await fetch(rpcUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`RPC request failed: ${res.status}`);
  }

  const data = (await res.json()) as { result?: T; error?: { message?: string } };
  if (data.error) {
    throw new Error(data.error.message || "Unknown RPC error");
  }
  return data.result as T;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = (searchParams.get("q") ?? "").trim();

  if (!query) {
    return NextResponse.json({ error: "Missing query param q." }, { status: 400 });
  }

  const isTxHash = /^0x[a-fA-F0-9]{64}$/.test(query);
  const isAddress = /^0x[a-fA-F0-9]{40}$/.test(query);

  try {
    if (isTxHash) {
      const [tx, receipt] = await Promise.all([
        callRpc<{ from?: string; to?: string; value?: string; gasPrice?: string } | null>("eth_getTransactionByHash", [
          query,
        ]),
        callRpc<{ status?: string; gasUsed?: string } | null>("eth_getTransactionReceipt", [query]),
      ]);

      const payload: ExplorerApiResponse = {
        query,
        kind: "tx",
        details: [
          { label: "Type", value: "Transaction" },
          { label: "Status", value: receipt?.status === "0x1" ? "Success" : "Pending/Failed" },
          { label: "Value", value: `${unitsToNumber(hexToBigInt(tx?.value), 18).toFixed(6)} PLS` },
          { label: "Gas Price", value: `${unitsToNumber(hexToBigInt(tx?.gasPrice), 9).toFixed(4)} gwei` },
        ],
        transactions: [
          {
            hash: query,
            from: shortAddress(tx?.from ?? "0x0000000000000000000000000000000000000000"),
            amount: `${unitsToNumber(hexToBigInt(tx?.value), 18).toFixed(6)} PLS`,
          },
        ],
        holders: [
          { wallet: shortAddress(tx?.from ?? "0x0000000000000000000000000000000000000000"), balance: "Sender" },
          { wallet: shortAddress(tx?.to ?? "0x0000000000000000000000000000000000000000"), balance: "Receiver" },
        ],
        pairs: [],
      };

      return NextResponse.json(payload);
    }

    if (isAddress) {
      const [balances, txs, pairs] = await Promise.all([
        fetchMoralisWalletBalances(query),
        fetchMoralisWalletHistory(query, 12),
        fetchDexPairsByTokenAddress(query).catch(() => []),
      ]);

      const topTokens = balances
        .sort((a, b) => Number(b.usd_value ?? 0) - Number(a.usd_value ?? 0))
        .slice(0, 8);

      const payload: ExplorerApiResponse = {
        query,
        kind: "address",
        details: [
          { label: "Type", value: pairs.length > 0 ? "Contract / Token" : "Wallet / Contract" },
          { label: "Tracked Tokens", value: String(balances.length) },
          {
            label: "Estimated Value",
            value: `$${topTokens.reduce((acc, t) => acc + Number(t.usd_value ?? 0), 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`,
          },
          {
            label: "Liquidity",
            value: `$${(pairs[0]?.liquidity?.usd ?? 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
          },
        ],
        transactions: txs.map((tx) => ({
          hash: tx.hash ?? "",
          from: shortAddress(tx.from_address ?? "0x0000000000000000000000000000000000000000"),
          amount: `${unitsToNumber(decimalToBigInt(tx.value), 18).toFixed(4)} PLS`,
          timestamp: tx.block_timestamp ?? "",
        })),
        holders: topTokens.map((token) => ({
          wallet: token.symbol || "UNKNOWN",
          balance: `$${Number(token.usd_value ?? 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`,
        })),
        pairs,
      };
      return NextResponse.json(payload);
    }

    const pairs = await fetchDexPairs(query);
    const top = pairs[0];
    const payload: ExplorerApiResponse = {
      query,
      kind: "token",
      details: [
        { label: "Token", value: top?.baseToken?.symbol ?? query.toUpperCase() },
        {
          label: "Price",
          value: top?.priceUsd ? `$${Number(top.priceUsd).toLocaleString(undefined, { maximumFractionDigits: 8 })}` : "N/A",
        },
        {
          label: "Volume 24H",
          value: `$${Number(top?.volume?.h24 ?? 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
        },
        {
          label: "Liquidity",
          value: `$${Number(top?.liquidity?.usd ?? 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
        },
      ],
      transactions: pairs.slice(0, 10).map((pair) => ({
        hash: pair.pairAddress,
        from: pair.dexId,
        amount: pair.priceUsd ? `$${Number(pair.priceUsd).toFixed(8)}` : "N/A",
      })),
      holders: pairs.slice(0, 10).map((pair) => ({
        wallet: `${pair.baseToken.symbol}/${pair.quoteToken.symbol}`,
        balance: `$${Number(pair.liquidity?.usd ?? 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
      })),
      pairs,
    };

    return NextResponse.json(payload);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Explorer request failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
