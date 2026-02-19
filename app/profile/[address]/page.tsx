"use client";

import Link from "next/link";
import { useProfileData } from "@/hooks/useProfileData";

function money(value: number): string {
  return `$${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

function pct(value: number): string {
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
}

export default function ProfilePage({ params }: { params: { address: string } }) {
  const address = params.address;
  const { profile, ai, loading, error } = useProfileData(address);

  return (
    <div className="space-y-6 pb-8 pt-16 md:pt-22">
      <div className="flex items-center justify-between">
        <h1 className="section-title">Wallet Intelligence Profile</h1>
        <Link href="/wallet" className="text-sm text-fire-text/70 hover:text-fire-accent">
          Open Lookup
        </Link>
      </div>

      {loading ? <div className="glass p-4 text-sm text-fire-text/70">Loading profile intelligence...</div> : null}
      {error ? <div className="glass border-rose-500/30 p-4 text-sm text-rose-300">{error}</div> : null}

      {profile ? (
        <>
          <section className="grid gap-4 md:grid-cols-4">
            <article className="glass p-4">
              <p className="text-xs text-fire-text/60">Total Portfolio USD</p>
              <p className="mt-2 text-2xl font-semibold text-white">{money(profile.overview.totalPortfolioUsd)}</p>
            </article>
            <article className="glass p-4">
              <p className="text-xs text-fire-text/60">Total PLS</p>
              <p className="mt-2 text-2xl font-semibold text-white">
                {profile.overview.totalPortfolioPls.toLocaleString(undefined, { maximumFractionDigits: 3 })}
              </p>
            </article>
            <article className="glass p-4">
              <p className="text-xs text-fire-text/60">7d / 30d Change</p>
              <p className="mt-2 text-2xl font-semibold text-white">
                <span className={profile.overview.change7dPctApprox >= 0 ? "text-emerald-400" : "text-rose-400"}>
                  {pct(profile.overview.change7dPctApprox)}
                </span>{" "}
                /{" "}
                <span className={profile.overview.change30dPctApprox >= 0 ? "text-emerald-400" : "text-rose-400"}>
                  {pct(profile.overview.change30dPctApprox)}
                </span>
              </p>
            </article>
            <article className="glass p-4">
              <p className="text-xs text-fire-text/60">Net Inflow / Outflow</p>
              <p className="mt-2 text-lg font-semibold text-white">
                {money(profile.overview.netInflowUsdApprox)} / {money(profile.overview.netOutflowUsdApprox)}
              </p>
            </article>
          </section>

          {ai ? (
            <section className="glass rounded-2xl p-4">
              <h2 className="mb-2 text-lg font-semibold text-white">AI Wallet Intelligence</h2>
              <div className="grid gap-4 md:grid-cols-3">
                <article>
                  <p className="text-xs text-fire-text/60">Risk Score</p>
                  <p className="text-3xl font-semibold text-white">{ai.riskScore.toFixed(1)}</p>
                </article>
                <article>
                  <p className="text-xs text-fire-text/60">Concentration</p>
                  <p className="text-sm text-fire-text/90">{ai.concentrationRisk}</p>
                </article>
                <article>
                  <p className="text-xs text-fire-text/60">Liquidity Exposure</p>
                  <p className="text-sm text-fire-text/90">{ai.liquidityExposure}</p>
                </article>
              </div>
              <p className="mt-3 text-sm text-fire-text/90">{ai.behaviorSummary}</p>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <article className="rounded-xl border border-white/10 bg-black/20 p-3">
                  <p className="mb-2 text-xs uppercase text-fire-text/55">Red Flags</p>
                  <ul className="space-y-1 text-sm text-rose-300">
                    {ai.redFlags.map((x) => (
                      <li key={x}>- {x}</li>
                    ))}
                  </ul>
                </article>
                <article className="rounded-xl border border-white/10 bg-black/20 p-3">
                  <p className="mb-2 text-xs uppercase text-fire-text/55">Opportunity Signals</p>
                  <ul className="space-y-1 text-sm text-emerald-300">
                    {ai.opportunitySignals.map((x) => (
                      <li key={x}>- {x}</li>
                    ))}
                  </ul>
                </article>
              </div>
            </section>
          ) : null}

          <section className="grid gap-4 lg:grid-cols-3">
            <article className="glass lg:col-span-2 p-4">
              <h2 className="mb-3 text-lg font-semibold text-white">Token Breakdown</h2>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-white/10 text-fire-text/60">
                      <th className="py-2 pr-3">Token</th>
                      <th className="py-2 pr-3">Balance</th>
                      <th className="py-2 pr-3">USD</th>
                      <th className="py-2 pr-3">Share</th>
                      <th className="py-2 pr-3">Liquidity</th>
                      <th className="py-2 pr-3">Concentration</th>
                      <th className="py-2 pr-3">Risk</th>
                      <th className="py-2 pr-3">Owner</th>
                    </tr>
                  </thead>
                  <tbody>
                    {profile.tokens.map((token) => (
                      <tr key={token.tokenAddress} className="border-b border-white/5">
                        <td className="py-2 pr-3 font-semibold text-white">{token.symbol}</td>
                        <td className="py-2 pr-3">{token.balance.toLocaleString(undefined, { maximumFractionDigits: 4 })}</td>
                        <td className="py-2 pr-3">{money(token.usdValue)}</td>
                        <td className="py-2 pr-3">{token.portfolioSharePct.toFixed(2)}%</td>
                        <td className="py-2 pr-3">{token.liquidityDepthUsd ? money(token.liquidityDepthUsd) : "N/A"}</td>
                        <td className="py-2 pr-3">{token.holderConcentration}</td>
                        <td className="py-2 pr-3">{token.riskRating}</td>
                        <td className="py-2 pr-3">{token.ownerStatus}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </article>

            <article className="glass p-4">
              <h2 className="mb-3 text-lg font-semibold text-white">LP Positions</h2>
              <div className="space-y-3">
                {profile.lpPositions.length ? (
                  profile.lpPositions.map((lp) => (
                    <div key={lp.pairLabel} className="rounded-xl border border-white/10 bg-black/20 p-3 text-sm">
                      <p className="font-semibold text-white">{lp.pairLabel}</p>
                      <p className="text-fire-text/80">Share: {lp.sharePct.toFixed(2)}%</p>
                      <p className="text-fire-text/80">USD: {money(lp.estimatedUsdValue)}</p>
                      <p className="text-fire-text/80">IL est: {lp.impermanentLossEstimatePct.toFixed(2)}%</p>
                      <p className="text-fire-text/80">Liquidity: {lp.liquidityDepthUsd ? money(lp.liquidityDepthUsd) : "N/A"}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-fire-text/65">No LP positions detected in current wallet snapshot.</p>
                )}
              </div>
            </article>
          </section>

          <section className="glass p-4">
            <h2 className="mb-3 text-lg font-semibold text-white">On-chain Behavior Timeline</h2>
            <div className="space-y-2">
              {profile.behaviorTimeline.map((event) => (
                <div key={event.hash} className="rounded-xl border border-white/10 bg-black/20 p-3 text-sm">
                  <div className="flex items-center justify-between">
                    <p className="font-mono text-fire-text/80">{event.hash.slice(0, 10)}...{event.hash.slice(-6)}</p>
                    <p className="text-fire-text/60">{new Date(event.timestamp).toLocaleString()}</p>
                  </div>
                  <p className="text-white">{event.kind}</p>
                  <p className="text-fire-text/70">
                    {event.from} {"->"} {event.to} | {money(event.valueUsdApprox)}
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
