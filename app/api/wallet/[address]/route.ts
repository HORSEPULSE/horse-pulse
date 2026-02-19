import { NextResponse } from "next/server";
import {
  fetchMoralisNativeBalance,
  fetchMoralisWalletBalances,
  fetchMoralisWalletHistory,
  type WalletApiResponse,
} from "@/lib/api";

function isAddress(value: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(value);
}

function shortAddress(value: string): string {
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}

export async function GET(_: Request, { params }: { params: { address: string } }) {
  const address = params.address?.trim();
  if (!address || !isAddress(address)) {
    return NextResponse.json({ error: "Invalid wallet address." }, { status: 400 });
  }

  try {
    const [nativeBalanceWei, balances, txs] = await Promise.all([
      fetchMoralisNativeBalance(address),
      fetchMoralisWalletBalances(address),
      fetchMoralisWalletHistory(address, 20),
    ]);

    const holdings = balances
      .map((token) => {
        const decimals = Number(token.decimals || "18");
        const raw = Number(token.balance || "0");
        const balance = Number.isFinite(raw) ? raw / 10 ** decimals : 0;
        const usdValue = Number(token.usd_value ?? 0);
        return {
          tokenAddress: token.token_address,
          symbol: token.symbol || "UNKNOWN",
          name: token.name || "Unknown Token",
          balance,
          usdValue: Number.isFinite(usdValue) ? usdValue : 0,
          priceUsd: token.usd_price ?? null,
        };
      })
      .sort((a, b) => b.usdValue - a.usdValue)
      .slice(0, 50);

    const estimatedPortfolioUsd = holdings.reduce((acc, item) => acc + item.usdValue, 0);
    const nativeBalancePls = Number(nativeBalanceWei) / 1e18;

    const transactions = txs.map((tx) => {
      const wei = Number(tx.value ?? "0");
      return {
        hash: tx.hash ?? "",
        from: shortAddress(tx.from_address ?? "0x0000000000000000000000000000000000000000"),
        to: shortAddress(tx.to_address ?? "0x0000000000000000000000000000000000000000"),
        timestamp: tx.block_timestamp ?? "",
        valuePls: Number.isFinite(wei) ? wei / 1e18 : 0,
        status: tx.receipt_status ?? "unknown",
      };
    });

    const payload: WalletApiResponse = {
      address,
      nativeBalancePls,
      estimatedPortfolioUsd,
      holdings,
      transactions,
    };

    return NextResponse.json(payload);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Wallet endpoint failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
