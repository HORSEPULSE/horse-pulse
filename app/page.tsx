"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { fetchOverviewSnapshotClient } from "@/lib/api";

type FeaturedPriceItem = {
  symbol: string;
  priceUsd: number | null;
  priceNative?: number | null;
  quoteSymbol?: string | null;
  change24h: number | null;
  changeSelected?: number | null;
  marketCapUsd?: number | null;
  liquidityUsd?: number | null;
  pairCount?: number;
  confidence?: "high" | "medium" | "thin";
  sourcePairs?: string[];
};

const frames = ["5m", "1h", "6h", "24h", "7d", "30d", "90d", "ATL"];

const iconMap: Record<string, string> = {
  HORSE: "/fire_horse_icon_512.png",
  PLS: "/coins/svg/pls.svg",
  PLSX: "/coins/svg/plsx.svg",
  INC: "/coins/svg/inc.svg",
  HEX: "/coins/svg/hex.svg",
};

function formatPrice(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return "N/A";
  if (value >= 1) return `$${value.toFixed(3).replace(/0+$/, "").replace(/\.$/, "")}`;
  if (value >= 0.01) return `$${value.toFixed(4)}`;
  if (value >= 0.001) return `$${value.toFixed(6)}`;
  return `$${value.toFixed(8)}`;
}

function formatCompactUsd(value: number | null | undefined): string {
  if (!value || !Number.isFinite(value)) return "N/A";
  return `$${value.toLocaleString(undefined, { notation: "compact", maximumFractionDigits: 2 })}`;
}

export default function HomePage() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [activeFrame, setActiveFrame] = useState("ATL");
  const [showUsd, setShowUsd] = useState(true);
  const [excludeOA, setExcludeOA] = useState(false);
  const [featuredPrices, setFeaturedPrices] = useState<Record<string, FeaturedPriceItem>>({});
  const [overviewMarketCap, setOverviewMarketCap] = useState<string | null>(null);
  const [topSubtext, setTopSubtext] = useState("PulseChain market");
  const [plsChange, setPlsChange] = useState("-0.0%");
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);

  const onSearch = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const value = query.trim();
    if (!value) return;
    router.push(`/explorer?q=${encodeURIComponent(value)}`);
  };

  useEffect(() => {
    const loadOverview = async () => {
      try {
        const snapshot = await fetchOverviewSnapshotClient();
        if (snapshot.marketCapUsd && Number.isFinite(snapshot.marketCapUsd)) {
          setOverviewMarketCap(formatCompactUsd(snapshot.marketCapUsd));
        }
        if (snapshot.gasPriceGwei && Number.isFinite(snapshot.gasPriceGwei)) setTopSubtext("PulseChain market");
      } catch {
        // Keep fallback values when overview source fails.
      }
    };

    void loadOverview();
  }, []);

  useEffect(() => {
    const loadFeaturedPrices = async () => {
      try {
        const res = await fetch(`/api/featured-prices?frame=${encodeURIComponent(activeFrame)}`, { cache: "no-store" });
        if (!res.ok) return;

        const payload = (await res.json()) as {
          frame?: string;
          updatedAt?: string;
          data?: Array<{
            symbol: string;
            priceUsd: number | null;
            priceNative?: number | null;
            quoteSymbol?: string | null;
            change24h: number | null;
            changeSelected?: number | null;
            marketCapUsd?: number | null;
            liquidityUsd?: number | null;
            pairCount?: number;
            confidence?: "high" | "medium" | "thin";
            sourcePairs?: string[];
          }>;
        };

        const map: Record<string, FeaturedPriceItem> = {};
        for (const item of payload.data ?? []) {
          map[item.symbol] = item;
        }
        setFeaturedPrices(map);
        if (payload.updatedAt) setUpdatedAt(payload.updatedAt);
      } catch {
        // Ignore transient failures and preserve latest good values.
      }
    };

    void loadFeaturedPrices();
    const id = setInterval(loadFeaturedPrices, 30_000);
    return () => clearInterval(id);
  }, [activeFrame]);

  useEffect(() => {
    const pls = featuredPrices.PLS;
    if (!pls) return;
    const delta = typeof pls.changeSelected === "number" ? pls.changeSelected : pls.change24h;
    if (typeof delta === "number" && Number.isFinite(delta)) {
      setPlsChange(`${delta >= 0 ? "+" : ""}${delta.toFixed(1)}%`);
    }
  }, [featuredPrices, activeFrame]);

  const topPrice = showUsd
    ? formatPrice(featuredPrices.PLS?.priceUsd ?? null)
    : featuredPrices.PLS?.priceNative && featuredPrices.PLS?.quoteSymbol
      ? `${featuredPrices.PLS.priceNative.toFixed(6)} ${featuredPrices.PLS.quoteSymbol}`
      : "N/A";
  const topMarketCapFromFeatured = formatCompactUsd(featuredPrices.PLS?.marketCapUsd);
  const topMarketCap = topMarketCapFromFeatured !== "N/A" ? topMarketCapFromFeatured : overviewMarketCap ?? "N/A";
  const topConfidence = featuredPrices.PLS?.confidence ?? "thin";
  const topConfidenceLabel =
    topConfidence === "high" ? "High confidence" : topConfidence === "medium" ? "Medium confidence" : "Thin liquidity";

  const featuredCoins = useMemo(
    () => [
      { symbol: "HORSE", subtitle: "Fire Horse", supply: "N/A", burned: "N/A", burnedPct: "" },
      { symbol: "PLSX", subtitle: "PulseX", supply: "142T", burned: "1.67T", burnedPct: "1.18%" },
      { symbol: "INC", subtitle: "Incentive", supply: "56M", burned: "121K", burnedPct: "0.216%" },
      { symbol: "HEX", subtitle: "on PulseChain", supply: "669B", burned: "N/A", burnedPct: "" },
    ],
    [],
  );

  const visibleCoins = excludeOA ? featuredCoins.filter((coin) => coin.symbol !== "HORSE") : featuredCoins;

  return (
    <div className="space-y-7 pb-8 pt-16 md:pt-22">
      <form onSubmit={onSearch} className="rounded-full border border-white/20 bg-black/45 px-5 py-3 md:py-4">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by Coin / Block / Transaction"
          className="w-full bg-transparent text-2xl text-fire-text outline-none placeholder:text-fire-text/30 max-md:text-lg"
          style={{ fontFamily: "var(--font-title)" }}
        />
      </form>

      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="section-title text-fire-text/90">Day 1014</h2>
          <div className="flex flex-wrap gap-1 rounded-full border border-white/15 bg-black/40 p-1">
            {frames.map((frame) => (
              <button
                key={frame}
                type="button"
                onClick={() => setActiveFrame(frame)}
                className={`rounded-full px-3 py-1 text-sm transition ${
                  activeFrame === frame ? "bg-white/20 text-white" : "text-fire-text/60 hover:text-fire-accent"
                }`}
              >
                {frame}
              </button>
            ))}
          </div>
        </div>

        <article className="rounded-3xl border border-white/15 bg-black/40 px-6 py-6 max-md:px-4">
          <div className="grid items-center gap-4 md:grid-cols-[1.1fr,1.4fr,0.9fr,0.8fr,0.2fr]">
            <div className="flex items-center gap-3 border-white/15 md:border-r md:pr-5">
              <div className="rounded-lg border border-white/15 bg-black/65 p-1">
                <Image src={iconMap.PLS} alt="PLS" width={34} height={34} />
              </div>
              <div>
                <p className="text-4xl font-semibold leading-none text-white max-md:text-3xl" style={{ fontFamily: "var(--font-title)" }}>
                  PLS
                </p>
                <p className="text-sm text-fire-text/55">Pulse</p>
              </div>
            </div>

            <div className="border-white/15 md:border-r md:pr-5">
              <p className="text-4xl font-semibold leading-none text-white [font-variant-numeric:tabular-nums] max-md:text-3xl">
                {topPrice}
              </p>
              <div className="mt-1 flex items-center gap-4 text-base">
                <span className="text-fire-text/45">{topSubtext}</span>
                <span className={plsChange.startsWith("-") ? "text-rose-500" : "text-emerald-400"}>{plsChange}</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs ${
                    topConfidence === "high"
                      ? "bg-emerald-500/20 text-emerald-300"
                      : topConfidence === "medium"
                        ? "bg-amber-500/20 text-amber-300"
                        : "bg-rose-500/20 text-rose-300"
                  }`}
                >
                  {topConfidenceLabel}
                </span>
              </div>
            </div>

            <div>
              <p className="text-sm text-fire-text/50">Market Cap</p>
              <p className="text-3xl font-semibold text-white [font-variant-numeric:tabular-nums] max-md:text-2xl">{topMarketCap}</p>
            </div>

            <div className="border-white/15 md:border-r md:pr-5">
              <p className="text-sm text-fire-text/50">Supply</p>
              <p className="text-3xl font-semibold text-white max-md:text-2xl">135T</p>
            </div>

            <div className="text-right text-fire-text/70">
              <span className="text-2xl">&gt;</span>
            </div>
          </div>
        </article>
      </section>

      <section
        className={`grid gap-4 ${
          visibleCoins.length === 3 ? "md:grid-cols-3" : "md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4"
        }`}
      >
        {visibleCoins.map((coin) => {
          const live = featuredPrices[coin.symbol];
          const priceText = showUsd
            ? formatPrice(live?.priceUsd ?? null)
            : live?.priceNative && live?.quoteSymbol
              ? `${live.priceNative.toFixed(6)} ${live.quoteSymbol}`
              : "N/A";
          const selectedChange = typeof live?.changeSelected === "number" ? live.changeSelected : live?.change24h;
          const change = typeof selectedChange === "number" ? `${selectedChange >= 0 ? "+" : ""}${selectedChange.toFixed(1)}%` : "N/A";
          const marketCapText = formatCompactUsd(live?.marketCapUsd);
          const liquidityText = formatCompactUsd(live?.liquidityUsd);

          return (
            <article key={coin.symbol} className="rounded-3xl border border-white/15 bg-black/45 px-6 py-5">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg border border-white/15 bg-black/65 p-1">
                    <Image src={iconMap[coin.symbol]} alt={coin.symbol} width={34} height={34} />
                  </div>
                  <div>
                    <p className="text-3xl font-semibold leading-none text-white max-md:text-2xl" style={{ fontFamily: "var(--font-title)" }}>
                      {coin.symbol}
                    </p>
                    <p className="text-sm text-fire-text/50">{coin.subtitle}</p>
                  </div>
                </div>
                <span className="text-3xl text-fire-text/50">&gt;</span>
              </div>

              <div className="border-y border-white/10 py-4">
                <p className="min-w-0 text-4xl font-semibold leading-none text-white [font-variant-numeric:tabular-nums] max-md:text-2xl">
                  {priceText}
                </p>
                <div className="mt-2 flex justify-end">
                  <p
                    className={`rounded-full px-2 py-0.5 text-xl font-semibold leading-none ${
                      change.startsWith("-") ? "bg-rose-500/15 text-rose-400" : "bg-emerald-500/15 text-emerald-400"
                    } max-md:text-lg`}
                  >
                    {change}
                  </p>
                </div>
                <p className="mt-1 text-base text-fire-text/50">
                  {coin.symbol === "HORSE"
                    ? "HORSE meme coin on PulseChain"
                    : coin.symbol === "PLSX"
                      ? "0.75 PLS (1:1.34)"
                      : coin.symbol === "INC"
                        ? "41,550 PLS"
                        : "155 PLS | incl. eHEX"}
                </p>
                <p className="mt-1 text-xs text-fire-text/45">
                  {live?.pairCount ? `${live.pairCount} pools` : "No pool depth"} |{" "}
                  {live?.confidence === "high" ? "High confidence" : live?.confidence === "medium" ? "Medium confidence" : "Thin liquidity"}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-x-4 gap-y-3 border-b border-white/10 py-4 text-center">
                <div className="min-w-0">
                  <p className="text-sm text-fire-text/50">Market Cap</p>
                  <p className="whitespace-nowrap text-2xl font-semibold leading-none text-white [font-variant-numeric:tabular-nums] max-md:text-xl">
                    {marketCapText}
                  </p>
                </div>
                <div className="min-w-0">
                  <p className="text-sm text-fire-text/50">Supply</p>
                  <p className="whitespace-nowrap text-2xl font-semibold leading-none text-white [font-variant-numeric:tabular-nums] max-md:text-xl">
                    {coin.supply}
                  </p>
                </div>
                <div className="col-span-2 min-w-0">
                  <p className="text-sm text-fire-text/50">Burned</p>
                  <p className="whitespace-nowrap text-2xl font-semibold leading-none text-white [font-variant-numeric:tabular-nums] max-md:text-xl">
                    {coin.burned}
                  </p>
                  {coin.burnedPct ? <p className="text-sm text-fire-text/50">{coin.burnedPct}</p> : null}
                </div>
              </div>

              <p className="pt-4 text-center text-base text-fire-text/55">Liquidity: {liquidityText}</p>
            </article>
          );
        })}
      </section>

      <div className="flex justify-center gap-4">
        <button
          type="button"
          onClick={() => setExcludeOA((v) => !v)}
          className={`subtle-pill text-base ${excludeOA ? "border-fire-accent text-fire-accent" : ""}`}
        >
          Exclude OA
        </button>
        <button
          type="button"
          onClick={() => setShowUsd((v) => !v)}
          className={`subtle-pill text-base ${showUsd ? "border-fire-accent text-fire-accent" : ""}`}
        >
          {showUsd ? "USD Mode" : "Native Mode"}
        </button>
      </div>

      <p className="text-center text-xs text-fire-text/45">
        {updatedAt ? `Last update: ${new Date(updatedAt).toLocaleTimeString()}` : "Live update pending"} | Source:
        Dexscreener aggregated PulseChain pools
      </p>
    </div>
  );
}
