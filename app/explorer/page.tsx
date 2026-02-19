"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import Chart from "@/components/Chart";
import { fetchExplorerSnapshotClient, type ExplorerApiResponse } from "@/lib/api";

function shortHash(hash: string): string {
  if (hash.length < 12) return hash;
  return `${hash.slice(0, 10)}...${hash.slice(-6)}`;
}

function ExplorerContent() {
  const params = useSearchParams();
  const initial = params.get("q") ?? "";
  const [query, setQuery] = useState(initial);
  const [submitted, setSubmitted] = useState(initial);
  const [snapshot, setSnapshot] = useState<ExplorerApiResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mode = useMemo(() => {
    if (!submitted) return "Contract address";
    if (/^0x[a-fA-F0-9]{64}$/.test(submitted)) return "Transaction hash";
    if (/^0x[a-fA-F0-9]{40}$/.test(submitted)) return "Wallet or contract address";
    return "Token symbol / keyword";
  }, [submitted]);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const normalized = query.trim();
    setSubmitted(normalized);
    setError(null);
    setSnapshot(null);
    if (!normalized) return;

    try {
      setLoading(true);
      const data = await fetchExplorerSnapshotClient(normalized);
      setSnapshot(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Explorer request failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="section-title">Explorer</h1>

      <form className="glass flex flex-col gap-3 p-4 md:flex-row" onSubmit={onSubmit}>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search contract address, wallet address, or transaction hash"
          className="h-11 flex-1 rounded-md border border-white/15 bg-black/35 px-3 text-sm outline-none"
        />
        <button className="fire-button h-11" type="submit">
          {loading ? "Loading..." : "Analyze"}
        </button>
      </form>

      <p className="text-sm text-fire-text/65">Query mode: {mode}</p>
      {error ? <p className="text-sm text-rose-400">{error}</p> : null}

      <section className="grid gap-4 md:grid-cols-3">
        {snapshot?.details?.length ? (
          snapshot.details.map((item) => (
            <article key={item.label} className="glass p-4">
              <p className="text-xs text-fire-text/60">{item.label}</p>
              <p className="mt-2 text-lg font-semibold">{item.value}</p>
            </article>
          ))
        ) : (
          <>
            <article className="glass p-4">
              <p className="text-xs text-fire-text/60">Token</p>
              <p className="mt-2 text-lg font-semibold">No data yet</p>
            </article>
            <article className="glass p-4">
              <p className="text-xs text-fire-text/60">Volume 24H</p>
              <p className="mt-2 text-lg font-semibold">No data yet</p>
            </article>
            <article className="glass p-4">
              <p className="text-xs text-fire-text/60">Liquidity</p>
              <p className="mt-2 text-lg font-semibold">No data yet</p>
            </article>
          </>
        )}
      </section>

      <Chart />

      <section className="grid gap-4 md:grid-cols-2">
        <article className="glass p-4">
          <h2 className="mb-3 text-base font-semibold">Transactions</h2>
          <div className="space-y-2 text-sm">
            {snapshot?.transactions?.length ? (
              snapshot.transactions.slice(0, 12).map((tx) => (
                <div key={tx.hash} className="rounded-md border border-fire-border/40 bg-black/25 p-3">
                  <p>{shortHash(tx.hash)}</p>
                  <p className="text-fire-text/70">{tx.from}</p>
                  <p className="text-fire-accent">{tx.amount}</p>
                </div>
              ))
            ) : (
              <p className="text-fire-text/60">No transactions loaded yet.</p>
            )}
          </div>
        </article>

        <article className="glass p-4">
          <h2 className="mb-3 text-base font-semibold">Holders</h2>
          <div className="space-y-2 text-sm">
            {snapshot?.holders?.length ? (
              snapshot.holders.slice(0, 12).map((holder) => (
                <div key={`${holder.wallet}-${holder.balance}`} className="rounded-md border border-fire-border/40 bg-black/25 p-3">
                  <p>{holder.wallet}</p>
                  <p className="text-fire-accent">{holder.balance}</p>
                </div>
              ))
            ) : (
              <p className="text-fire-text/60">No holders loaded yet.</p>
            )}
          </div>
        </article>
      </section>
    </div>
  );
}

export default function ExplorerPage() {
  return (
    <Suspense fallback={<div className="glass p-4 text-sm text-fire-text/70">Loading explorer...</div>}>
      <ExplorerContent />
    </Suspense>
  );
}
