"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useAuthSession } from "@/hooks/useAuthSession";
import { usePortfolioSnapshot } from "@/hooks/usePortfolioSnapshot";

function money(value: number): string {
  return `$${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

function short(value: string): string {
  return `${value.slice(0, 8)}...${value.slice(-6)}`;
}

export default function DashboardPage() {
  const auth = useAuthSession();
  const [addressInput, setAddressInput] = useState("");
  const [selectedAddress, setSelectedAddress] = useState<string>("");
  const portfolio = usePortfolioSnapshot(selectedAddress);

  const sourceAddress = auth.address || selectedAddress;
  const chainMax = useMemo(() => {
    const list = portfolio.data?.chainBreakdown || [];
    return list.reduce((acc, c) => Math.max(acc, c.valueUsd), 0);
  }, [portfolio.data]);

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const normalized = addressInput.trim();
    if (!/^0x[a-fA-F0-9]{40}$/.test(normalized)) return;
    setSelectedAddress(normalized.toLowerCase());
  };

  return (
    <div className="space-y-6 pb-8 pt-16 md:pt-22">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="section-title">Portfolio Intelligence Terminal</h1>
          <p className="text-sm text-fire-text/65">DeBank-style multi-chain read-only wallet analytics.</p>
        </div>
        <div className="flex gap-2">
          {!auth.authenticated ? (
            <button type="button" onClick={() => void auth.login()} className="fire-button">
              Connect Wallet
            </button>
          ) : (
            <Link href={`/profile/${auth.address}`} className="fire-button">
              Open My Profile
            </Link>
          )}
        </div>
      </div>

      <form onSubmit={onSubmit} className="glass flex flex-col gap-3 p-4 md:flex-row">
        <input
          value={addressInput}
          onChange={(e) => setAddressInput(e.target.value)}
          placeholder="Enter any wallet address to inspect"
          className="h-11 flex-1 rounded-md border border-white/15 bg-black/35 px-3 text-sm outline-none"
        />
        <button className="fire-button h-11 min-w-28" type="submit">
          Analyze
        </button>
      </form>

      {!selectedAddress && sourceAddress ? (
        <button
          type="button"
          onClick={() => setSelectedAddress(sourceAddress)}
          className="subtle-pill border-fire-accent/40 text-fire-accent"
        >
          Load connected wallet: {short(sourceAddress)}
        </button>
      ) : null}

      {portfolio.loading ? <div className="glass p-4 text-sm text-fire-text/70">Loading portfolio...</div> : null}
      {portfolio.error ? <div className="glass border-rose-500/30 p-4 text-sm text-rose-300">{portfolio.error}</div> : null}

      {portfolio.data ? (
        <>
          <section className="grid gap-4 md:grid-cols-4">
            <article className="glass p-4">
              <p className="text-xs text-fire-text/60">Wallet</p>
              <p className="mt-2 font-mono text-white">{short(portfolio.data.address)}</p>
            </article>
            <article className="glass p-4">
              <p className="text-xs text-fire-text/60">Net Worth</p>
              <p className="mt-2 text-2xl font-semibold text-white">{money(portfolio.data.totalValueUsd)}</p>
            </article>
            <article className="glass p-4">
              <p className="text-xs text-fire-text/60">Tokens</p>
              <p className="mt-2 text-2xl font-semibold text-white">{portfolio.data.tokenBreakdown.length}</p>
            </article>
            <article className="glass p-4">
              <p className="text-xs text-fire-text/60">Activity</p>
              <p className="mt-2 text-2xl font-semibold text-white">{portfolio.data.recentActivity.length}</p>
            </article>
          </section>

          <section className="grid gap-4 lg:grid-cols-3">
            <article className="glass p-4 lg:col-span-1">
              <h2 className="mb-3 text-lg font-semibold text-white">Chain Allocation</h2>
              <div className="space-y-3">
                {portfolio.data.chainBreakdown.map((item) => (
                  <div key={item.chain}>
                    <div className="mb-1 flex items-center justify-between text-xs text-fire-text/70">
                      <span className="uppercase">{item.chain}</span>
                      <span>{item.sharePct.toFixed(1)}%</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-white/10">
                      <div
                        className="h-2 rounded-full bg-gradient-to-r from-fire-accent to-fire-red"
                        style={{ width: `${chainMax > 0 ? (item.valueUsd / chainMax) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </article>

            <article className="glass p-4 lg:col-span-2">
              <h2 className="mb-3 text-lg font-semibold text-white">Token Allocation</h2>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[840px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-white/10 text-fire-text/60">
                      <th className="py-2 pr-3">Token</th>
                      <th className="py-2 pr-3">Chain</th>
                      <th className="py-2 pr-3">Balance</th>
                      <th className="py-2 pr-3">Price</th>
                      <th className="py-2 pr-3">Value</th>
                      <th className="py-2 pr-3">Type</th>
                    </tr>
                  </thead>
                  <tbody>
                    {portfolio.data.tokenBreakdown.slice(0, 60).map((token) => (
                      <tr key={`${token.chain}:${token.tokenAddress}`} className="border-b border-white/5">
                        <td className="py-2 pr-3 font-semibold text-white">{token.symbol}</td>
                        <td className="py-2 pr-3 uppercase">{token.chain}</td>
                        <td className="py-2 pr-3">{token.balance.toLocaleString(undefined, { maximumFractionDigits: 4 })}</td>
                        <td className="py-2 pr-3">{token.priceUsd > 0 ? money(token.priceUsd) : "N/A"}</td>
                        <td className="py-2 pr-3">{money(token.valueUsd)}</td>
                        <td className="py-2 pr-3">
                          {token.isLP ? "LP" : token.isStaked ? "Staked" : "Spot"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </article>
          </section>

          <section className="glass p-4">
            <h2 className="mb-3 text-lg font-semibold text-white">Recent On-chain Activity</h2>
            <div className="space-y-2">
              {portfolio.data.recentActivity.map((event) => (
                <div key={event.hash} className="rounded-xl border border-white/10 bg-black/20 p-3 text-sm">
                  <div className="flex items-center justify-between">
                    <p className="font-mono text-fire-text/85">{short(event.hash)}</p>
                    <p className="text-fire-text/60">{new Date(event.timestamp).toLocaleString()}</p>
                  </div>
                  <p className="mt-1 text-white">
                    {event.action} {event.protocol ? `on ${event.protocol}` : ""}
                  </p>
                  <p className="text-fire-text/70">
                    {event.chain.toUpperCase()} | Amount: {event.amountUsd ? money(event.amountUsd) : "N/A"} | Gas:{" "}
                    {event.gasUsd ? money(event.gasUsd) : "N/A"}
                  </p>
                </div>
              ))}
            </div>
          </section>
        </>
      ) : null}
    </div>
  );
}

