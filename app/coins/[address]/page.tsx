"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { fetchCoinDetailsClient, type CoinDetailsApiResponse } from "@/lib/api";

const knownIcons: Record<string, string> = {
  "0x8536949300886be15d6033da56473e7c368c8df2": "/coins/svg/horse.svg",
  "0x95b303987a60c71504d99aa1b13b4da07b0790ab": "/coins/svg/plsx.svg",
  "0x2fa878ab3f87cc1c9737fc071108f904c0b0c95d": "/coins/svg/inc.svg",
  "0x2b591e99afe9f32eaa6214f7b7629768c40eeb39": "/coins/svg/hex.svg",
  "0xa1077a294dde1b09bb078844df40758a5d0f9a27": "/coins/svg/pls.svg",
  "0x2260fac5e5542a773aa44fbcfedf7c193bc2c599": "/coins/svg/pwbtc.svg",
  "0x6b175474e89094c44da98b954eedeac495271d0f": "/coins/svg/pdai.svg",
};

function formatMoney(value: number | null | undefined): string {
  if (!value || !Number.isFinite(value)) return "N/A";
  if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(2)}B`;
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(2)}K`;
  return `$${value.toFixed(4)}`;
}

function formatPrice(value: number | null | undefined): string {
  if (!value || !Number.isFinite(value)) return "N/A";
  if (value >= 1) return value.toFixed(4);
  if (value >= 0.01) return value.toFixed(6);
  return value.toFixed(8);
}

function shortAddress(value: string): string {
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}

function normalizeNum(value: number | null | undefined): number {
  return Number.isFinite(value) ? Number(value) : 0;
}

function toPct(value: number, total: number): number {
  if (!Number.isFinite(value) || !Number.isFinite(total) || total <= 0) return 0;
  return (value / total) * 100;
}

export default function CoinDetailPage({ params }: { params: { address: string } }) {
  const address = params.address.toLowerCase();
  const [data, setData] = useState<CoinDetailsApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const run = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetchCoinDetailsClient(address);
        if (!active) return;
        setData(res);
      } catch (e) {
        if (!active) return;
        setError(e instanceof Error ? e.message : "Failed to load token page");
      } finally {
        if (active) setLoading(false);
      }
    };
    void run();
    return () => {
      active = false;
    };
  }, [address]);

  const icon = knownIcons[address] ?? null;
  const chartUrl = useMemo(() => {
    const pair = data?.price.pairAddress;
    if (!pair) return null;
    return `https://dexscreener.com/pulsechain/${pair}?embed=1&theme=dark`;
  }, [data?.price.pairAddress]);

  const holderBuckets = useMemo(() => {
    const rows = data?.holders.top ?? [];
    const poseidon = rows.filter((h) => normalizeNum(h.usdValue) >= 10_000).length;
    const whale = rows.filter((h) => normalizeNum(h.usdValue) >= 1_000 && normalizeNum(h.usdValue) < 10_000).length;
    const shark = rows.filter((h) => normalizeNum(h.usdValue) >= 100 && normalizeNum(h.usdValue) < 1_000).length;
    const dolphin = rows.filter((h) => normalizeNum(h.usdValue) > 0 && normalizeNum(h.usdValue) < 100).length;
    const sample = data?.holders.sampled ?? rows.length;
    return { poseidon, whale, shark, dolphin, sample };
  }, [data?.holders.top, data?.holders.sampled]);

  const burnRow = useMemo(() => {
    const rows = data?.holders.top ?? [];
    return (
      rows.find((h) => {
        const addr = h.address.toLowerCase();
        return addr === "0x0000000000000000000000000000000000000000" || addr === "0x000000000000000000000000000000000000dead";
      }) ?? null
    );
  }, [data?.holders.top]);

  const avgHoldingUsd = useMemo(() => {
    const marketCap = normalizeNum(data?.price.marketCapUsd);
    const holders = normalizeNum(data?.holders.total);
    if (!marketCap || !holders) return null;
    return marketCap / holders;
  }, [data?.price.marketCapUsd, data?.holders.total]);

  return (
    <div className="space-y-6 pb-8 pt-16 md:pt-22">
      <div className="flex items-center justify-between">
        <Link href="/" className="text-sm text-fire-text/70 transition hover:text-fire-accent">
          &larr; Back to Dashboard
        </Link>
        <p className="text-xs text-fire-text/50">{shortAddress(address)}</p>
      </div>

      {loading ? (
        <div className="glass p-6 text-sm text-fire-text/75">Loading coin analytics...</div>
      ) : error ? (
        <div className="glass border-rose-500/30 p-6 text-sm text-rose-300">{error}</div>
      ) : (
        <>
          <section className="glass rounded-3xl border-fire-accent/20 bg-gradient-to-br from-fire-accent/15 via-transparent to-fire-red/10 p-6">
            <div className="mb-5 flex items-start justify-between gap-4 max-md:flex-col">
              <div className="flex items-center gap-3">
                <div className="rounded-xl border border-white/15 bg-black/50 p-1">
                  {icon ? (
                    <Image src={icon} alt={data?.token.symbol ?? "Token"} width={40} height={40} />
                  ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded-md bg-black/60 text-sm font-semibold text-fire-accent">
                      {(data?.token.symbol ?? "T").slice(0, 2).toUpperCase()}
                    </div>
                  )}
                </div>
                <div>
                  <h1 className="text-3xl font-semibold text-white" style={{ fontFamily: "var(--font-title)" }}>
                    {data?.token.name}
                  </h1>
                  <p className="text-sm text-fire-text/60">{shortAddress(address)}</p>
                </div>
              </div>
              <a
                className="fire-button px-5 py-2 text-sm"
                href={`https://dexscreener.com/pulsechain/${data?.price.pairAddress ?? ""}`}
                target="_blank"
                rel="noreferrer"
              >
                Open on Dexscreener
              </a>
            </div>

            <div className="mb-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <article className="rounded-2xl border border-white/10 bg-black/30 p-4">
                <p className="text-xs text-fire-text/60">Price</p>
                <p className="mt-2 text-3xl font-semibold text-white">${formatPrice(data?.price.usd)}</p>
                <p className={`mt-2 text-sm ${Number(data?.price.change24h ?? 0) >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                  {data?.price.change24h !== null && data?.price.change24h !== undefined
                    ? `${data.price.change24h >= 0 ? "+" : ""}${data.price.change24h.toFixed(2)}% (24h)`
                    : "N/A"}
                </p>
              </article>
              <article className="rounded-2xl border border-white/10 bg-black/30 p-4">
                <p className="text-xs text-fire-text/60">Market Cap</p>
                <p className="mt-2 text-3xl font-semibold text-white">{formatMoney(data?.price.marketCapUsd)}</p>
              </article>
              <article className="rounded-2xl border border-white/10 bg-black/30 p-4">
                <p className="text-xs text-fire-text/60">FDV</p>
                <p className="mt-2 text-3xl font-semibold text-white">{formatMoney(data?.price.fdvUsd)}</p>
              </article>
              <article className="rounded-2xl border border-white/10 bg-black/30 p-4">
                <p className="text-xs text-fire-text/60">24h Volume</p>
                <p className="mt-2 text-3xl font-semibold text-white">{formatMoney(data?.price.volume24hUsd)}</p>
              </article>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <article className="rounded-2xl border border-white/10 bg-black/30 p-4">
                <p className="text-xs text-fire-text/60">Burn Summary</p>
                <p className="mt-2 text-2xl font-semibold text-white">{burnRow ? formatMoney(burnRow.usdValue) : "N/A"}</p>
                <p className="mt-2 text-sm text-fire-text/70">
                  {burnRow ? `${burnRow.balance} tokens in known burn wallet` : "No known burn wallet found in top holder sample."}
                </p>
                <p className="mt-1 text-xs text-fire-text/50">
                  {burnRow?.percent !== null && burnRow?.percent !== undefined
                    ? `${burnRow.percent.toFixed(2)}% of supply (top-holder sample)`
                    : "Burn % not available"}
                </p>
              </article>
              <article className="rounded-2xl border border-white/10 bg-black/30 p-4">
                <p className="text-xs text-fire-text/60">Liquidity</p>
                <p className="mt-2 text-2xl font-semibold text-white">{formatMoney(data?.price.liquidityUsd)}</p>
                <p className="mt-2 text-sm text-fire-text/70">
                  Pair: {data?.price.dexId ?? "N/A"} / {data?.price.quoteSymbol ?? "N/A"}
                </p>
                <p className="mt-1 text-xs text-fire-text/50">Pair address: {data?.price.pairAddress ? shortAddress(data.price.pairAddress) : "N/A"}</p>
              </article>
            </div>
          </section>

          <section className="glass rounded-3xl p-4">
            <h2 className="mb-3 text-lg font-semibold text-white">Price Chart</h2>
            {chartUrl ? (
              <iframe
                src={chartUrl}
                title="Dexscreener chart"
                className="h-[520px] w-full rounded-2xl border border-white/10 bg-black/50"
                loading="lazy"
              />
            ) : (
              <p className="rounded-xl border border-white/10 bg-black/30 p-4 text-sm text-fire-text/70">
                No active pair available for embedded chart yet.
              </p>
            )}
          </section>

          <section className="glass rounded-3xl p-5">
            <h2 className="mb-1 text-lg font-semibold text-white">Holder Analytics</h2>
            <p className="mb-4 text-sm text-fire-text/65">Distribution by USD value</p>
            <div className="mb-5 grid gap-4 md:grid-cols-2">
              <article className="rounded-2xl border border-white/10 bg-black/30 p-4">
                <p className="text-sm text-fire-text/60">Total Holders</p>
                <p className="mt-1 text-4xl font-semibold text-white">
                  {data?.holders.total?.toLocaleString() ?? `Sample ${data?.holders.sampled ?? 0}`}
                </p>
                {data?.holders.total ? null : <p className="mt-1 text-xs text-fire-text/50">Full holder total unavailable on current response.</p>}
              </article>
              <article className="rounded-2xl border border-white/10 bg-black/30 p-4">
                <p className="text-sm text-fire-text/60">Average Holdings</p>
                <p className="mt-1 text-4xl font-semibold text-white">{formatMoney(avgHoldingUsd)}</p>
              </article>
            </div>

            {[
              { label: "Poseidon ($10K+)", value: holderBuckets.poseidon },
              { label: "Whale ($1K-$10K)", value: holderBuckets.whale },
              { label: "Shark ($100-$1K)", value: holderBuckets.shark },
              { label: "Dolphin (<$100)", value: holderBuckets.dolphin },
            ].map((bucket) => (
              <div key={bucket.label} className="mb-3 grid grid-cols-[180px,1fr,110px] items-center gap-3 text-sm max-md:grid-cols-1">
                <p className="text-fire-text/90">{bucket.label}</p>
                <div className="h-5 overflow-hidden rounded-md bg-white/10">
                  <div
                    className="h-full rounded-md bg-blue-500"
                    style={{ width: `${toPct(bucket.value, holderBuckets.sample)}%` }}
                  />
                </div>
                <p className="text-emerald-400">
                  {bucket.value} ({toPct(bucket.value, holderBuckets.sample).toFixed(2)}%)
                </p>
              </div>
            ))}

            <p className="mb-5 text-xs text-fire-text/50">Sample size: {holderBuckets.sample} top holders</p>

            <h2 className="mb-3 text-lg font-semibold text-white">Top Holders</h2>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px] text-left">
                <thead>
                  <tr className="border-b border-white/10 text-sm text-fire-text/60">
                    <th className="py-2 pr-3">Rank</th>
                    <th className="py-2 pr-3">Address</th>
                    <th className="py-2 pr-3">Balance</th>
                    <th className="py-2 pr-3">%</th>
                    <th className="py-2 pr-3">USD Value</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.holders.top.length ? (
                    data.holders.top.map((holder) => (
                      <tr key={holder.address} className="border-b border-white/5 text-sm">
                        <td className="py-3 pr-3 text-fire-text/80">#{holder.rank}</td>
                        <td className="py-3 pr-3 font-mono text-fire-text/85">
                          {shortAddress(holder.address)}{" "}
                          {holder.address.toLowerCase() === "0x0000000000000000000000000000000000000000" ||
                          holder.address.toLowerCase() === "0x000000000000000000000000000000000000dead" ? (
                            <span className="ml-2 rounded-full bg-fire-red/20 px-2 py-0.5 text-[11px] text-fire-red">Burn Wallet</span>
                          ) : null}
                        </td>
                        <td className="py-3 pr-3 text-white">{holder.balance}</td>
                        <td className="py-3 pr-3 text-fire-text/85">
                          {holder.percent !== null && holder.percent !== undefined ? `${holder.percent.toFixed(2)}%` : "N/A"}
                        </td>
                        <td className="py-3 pr-3 text-white">{formatMoney(holder.usdValue)}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="py-4 text-sm text-fire-text/70">
                        Holder data unavailable with current API plan or token state.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
