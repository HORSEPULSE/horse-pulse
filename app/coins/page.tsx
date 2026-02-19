import CoinCard from "@/components/CoinCard";

const sectionCoins = [
  { logo: "PLS", symbol: "Overview", price: "$0.000145", change: 2.1 },
  { logo: "BBL", symbol: "Bubbles", price: "$0.012", change: -0.8 },
  { logo: "STB", symbol: "Stables", price: "$1.00", change: 0 },
  { logo: "TRD", symbol: "Trends", price: "$0.42", change: 5.2 },
  { logo: "MNT", symbol: "Mint", price: "$0.09", change: -2.3 },
  { logo: "MOON", symbol: "Moon calculator", price: "2.6x", change: 11.4 },
];

export default function CoinsPage() {
  return (
    <div className="space-y-6">
      <h1 className="section-title">Coins</h1>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {sectionCoins.map((coin) => (
          <CoinCard key={coin.symbol} {...coin} />
        ))}
      </div>

      <section className="glass p-5">
        <h2 className="mb-2 text-lg font-semibold">Moon Calculator</h2>
        <p className="text-sm text-fire-text/75">
          Estimate upside by entering target price, holdings, and projected market cap conditions. This module can be
          extended with live Dexscreener pair data from <code>lib/api.ts</code>.
        </p>
      </section>
    </div>
  );
}
