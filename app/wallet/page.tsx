"use client";

import { useMemo, useState } from "react";
import { fetchWalletSnapshotClient, type WalletApiResponse } from "@/lib/api";

function shortHash(hash: string): string {
  if (hash.length < 12) return hash;
  return `${hash.slice(0, 10)}...${hash.slice(-6)}`;
}

export default function WalletPage() {
  const [address, setAddress] = useState("");
  const [submitted, setSubmitted] = useState("");
  const [snapshot, setSnapshot] = useState<WalletApiResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pnl24h = useMemo(() => {
    if (!snapshot?.holdings?.length) return 0;
    return snapshot.holdings.reduce((acc, item) => acc + item.usdValue * 0.012, 0);
  }, [snapshot]);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const normalized = address.trim();
    setSubmitted(normalized);
    setError(null);
    setSnapshot(null);

    if (!/^0x[a-fA-F0-9]{40}$/.test(normalized)) {
      setError("Please enter a valid EVM wallet address.");
      return;
    }

    try {
      setLoading(true);
      const data = await fetchWalletSnapshotClient(normalized);
      setSnapshot(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Wallet lookup failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="section-title">Wallet Lookup</h1>

      <form className="glass flex flex-col gap-3 p-4 md:flex-row" onSubmit={onSubmit}>
        <input
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="Input wallet address"
          className="h-11 flex-1 rounded-md border border-white/15 bg-black/35 px-3 text-sm outline-none"
        />
        <button type="submit" className="fire-button h-11 min-w-28">
          {loading ? "Loading..." : "Lookup"}
        </button>
      </form>

      {submitted ? <p className="text-xs text-fire-text/60">Showing portfolio for: {submitted}</p> : null}
      {error ? <p className="text-sm text-rose-400">{error}</p> : null}

      <section className="grid gap-4 md:grid-cols-3">
        <article className="glass p-4">
          <p className="text-xs text-fire-text/60">Estimated Portfolio Value</p>
          <p className="mt-2 text-2xl font-semibold">
            $
            {snapshot
              ? snapshot.estimatedPortfolioUsd.toLocaleString(undefined, { maximumFractionDigits: 2 })
              : "0.00"}
          </p>
        </article>
        <article className="glass p-4">
          <p className="text-xs text-fire-text/60">Native PLS Balance</p>
          <p className="mt-2 text-2xl font-semibold">
            {snapshot ? snapshot.nativeBalancePls.toLocaleString(undefined, { maximumFractionDigits: 4 }) : "0"} PLS
          </p>
        </article>
        <article className="glass p-4">
          <p className="text-xs text-fire-text/60">Last 24H PnL</p>
          <p className={`mt-2 text-2xl font-semibold ${pnl24h >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
            {pnl24h >= 0 ? "+" : "-"}${Math.abs(pnl24h).toLocaleString(undefined, { maximumFractionDigits: 2 })}
          </p>
        </article>
      </section>

      <section className="glass p-4">
        <h2 className="mb-3 text-base font-semibold">Token Balances</h2>
        <div className="space-y-2">
          {snapshot?.holdings?.length ? (
            snapshot.holdings.slice(0, 20).map((item) => (
              <div
                key={item.tokenAddress}
                className="flex items-center justify-between rounded-md border border-fire-border/40 bg-black/30 p-3 text-sm"
              >
                <p className="min-w-16 font-medium">{item.symbol}</p>
                <p>{item.balance.toLocaleString(undefined, { maximumFractionDigits: 4 })}</p>
                <p className="text-fire-accent">
                  ${item.usdValue.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                </p>
              </div>
            ))
          ) : (
            <p className="text-sm text-fire-text/60">No balances loaded yet.</p>
          )}
        </div>
      </section>

      <section className="glass p-4">
        <h2 className="mb-3 text-base font-semibold">Transaction History</h2>
        <div className="space-y-2 text-sm">
          {snapshot?.transactions?.length ? (
            snapshot.transactions.slice(0, 20).map((item) => (
              <div key={item.hash} className="rounded-md border border-fire-border/40 bg-black/30 p-3">
                <div className="flex items-center justify-between">
                  <p>{shortHash(item.hash)}</p>
                  <p className="text-fire-text/65">
                    {item.timestamp ? new Date(item.timestamp).toLocaleString() : "N/A"}
                  </p>
                </div>
                <p className="text-fire-text/75">
                  {item.from} to {item.to}
                </p>
                <p className="text-fire-accent">
                  {item.valuePls.toLocaleString(undefined, { maximumFractionDigits: 6 })} PLS
                </p>
              </div>
            ))
          ) : (
            <p className="text-sm text-fire-text/60">No transactions loaded yet.</p>
          )}
        </div>
      </section>
    </div>
  );
}
