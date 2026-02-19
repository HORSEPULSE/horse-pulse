"use client";

import { useEcosystemData } from "@/hooks/useEcosystemData";

function money(value: number): string {
  return `$${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

export default function EcosystemPage() {
  const { snapshot, loading, error } = useEcosystemData();

  return (
    <div className="space-y-6 pb-8 pt-16 md:pt-22">
      <h1 className="section-title">PulseChain Ecosystem Intelligence</h1>
      {loading ? <div className="glass p-4 text-sm text-fire-text/70">Loading ecosystem feeds...</div> : null}
      {error ? <div className="glass border-rose-500/30 p-4 text-sm text-rose-300">{error}</div> : null}

      {snapshot ? (
        <>
          <section className="grid gap-4 xl:grid-cols-3">
            <article className="glass p-4">
              <h2 className="mb-3 text-lg font-semibold text-white">Top Volume Tokens</h2>
              <div className="space-y-2">
                {snapshot.topVolumeTokens.slice(0, 8).map((item) => (
                  <div key={`${item.address}-${item.symbol}`} className="flex items-center justify-between rounded-md border border-white/10 bg-black/20 p-2 text-sm">
                    <p className="font-semibold text-white">{item.symbol}</p>
                    <p className="text-fire-text/80">{money(item.volume24hUsd)}</p>
                  </div>
                ))}
              </div>
            </article>

            <article className="glass p-4">
              <h2 className="mb-3 text-lg font-semibold text-white">Liquidity Growth</h2>
              <div className="space-y-2">
                {snapshot.liquidityGrowth.slice(0, 8).map((item) => (
                  <div key={`${item.address}-${item.symbol}`} className="flex items-center justify-between rounded-md border border-white/10 bg-black/20 p-2 text-sm">
                    <p className="font-semibold text-white">{item.symbol}</p>
                    <p className="text-fire-text/80">
                      {money(item.liquidityUsd)} ({item.growth24hPct.toFixed(2)}%)
                    </p>
                  </div>
                ))}
              </div>
            </article>

            <article className="glass p-4">
              <h2 className="mb-3 text-lg font-semibold text-white">Holder Growth</h2>
              <div className="space-y-2">
                {snapshot.holderGrowth.slice(0, 8).map((item) => (
                  <div key={`${item.address}-${item.symbol}`} className="flex items-center justify-between rounded-md border border-white/10 bg-black/20 p-2 text-sm">
                    <p className="font-semibold text-white">{item.symbol}</p>
                    <p className="text-fire-text/80">{item.holdersApprox.toLocaleString()} ({item.growth7dPctApprox.toFixed(2)}%)</p>
                  </div>
                ))}
              </div>
            </article>
          </section>

          <section className="grid gap-4 xl:grid-cols-2">
            <article className="glass p-4">
              <h2 className="mb-3 text-lg font-semibold text-white">Whale Movement Tracker</h2>
              <div className="space-y-2">
                {snapshot.whaleMovements.slice(0, 12).map((move) => (
                  <div key={`${move.wallet}-${move.timestamp}`} className="rounded-md border border-white/10 bg-black/20 p-2 text-sm">
                    <p className="text-white">
                      {move.direction === "in" ? "IN" : "OUT"} {move.token} {money(move.amountUsd)}
                    </p>
                    <p className="text-fire-text/70">{move.wallet} | {new Date(move.timestamp).toLocaleString()}</p>
                  </div>
                ))}
              </div>
            </article>

            <article className="glass p-4">
              <h2 className="mb-3 text-lg font-semibold text-white">Risk Heatmap</h2>
              <div className="space-y-2">
                {snapshot.riskHeatmap.map((row) => (
                  <div key={row.symbol} className="flex items-center justify-between rounded-md border border-white/10 bg-black/20 p-2 text-sm">
                    <p className="font-semibold text-white">{row.symbol}</p>
                    <p className={`${row.riskScore >= 80 ? "text-emerald-300" : row.riskScore >= 60 ? "text-amber-300" : "text-rose-300"}`}>
                      {row.riskScore.toFixed(1)} ({row.trustLevel})
                    </p>
                  </div>
                ))}
              </div>
            </article>
          </section>

          <section className="grid gap-4 xl:grid-cols-2">
            <article className="glass p-4">
              <h2 className="mb-3 text-lg font-semibold text-white">Burn Leaderboard</h2>
              <div className="space-y-2">
                {snapshot.burnLeaderboard.map((row) => (
                  <div key={row.symbol} className="flex items-center justify-between rounded-md border border-white/10 bg-black/20 p-2 text-sm">
                    <p className="font-semibold text-white">{row.symbol}</p>
                    <p className="text-fire-text/80">{money(row.burnedUsdApprox)}</p>
                  </div>
                ))}
              </div>
            </article>

            <article className="glass p-4">
              <h2 className="mb-3 text-lg font-semibold text-white">New Contract Deploys</h2>
              <div className="space-y-2">
                {snapshot.newContracts.map((row) => (
                  <div key={row.address} className="rounded-md border border-white/10 bg-black/20 p-2 text-sm">
                    <p className="font-mono text-fire-text/85">{row.address.slice(0, 12)}...{row.address.slice(-6)}</p>
                    <p className="text-fire-text/70">{row.label} | {new Date(row.deployedAt).toLocaleString()}</p>
                  </div>
                ))}
              </div>
            </article>
          </section>
        </>
      ) : null}
    </div>
  );
}

