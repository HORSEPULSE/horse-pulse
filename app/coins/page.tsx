import Link from "next/link";
import CoinCard from "@/components/CoinCard";

const trackedCoins = [
  { logo: "HORSE", symbol: "HORSE", price: "Live", change: 0.0, address: "0x8536949300886be15d6033da56473e7c368c8df2" },
  { logo: "PLS", symbol: "PLS", price: "Live", change: 0.0, address: "0xa1077a294dde1b09bb078844df40758a5d0f9a27" },
  { logo: "PLSX", symbol: "PLSX", price: "Live", change: 0.0, address: "0x95b303987a60c71504d99aa1b13b4da07b0790ab" },
  { logo: "INC", symbol: "INC", price: "Live", change: 0.0, address: "0x2fa878ab3f87cc1c9737fc071108f904c0b0c95d" },
  { logo: "HEX", symbol: "HEX", price: "Live", change: 0.0, address: "0x2b591e99afe9f32eaa6214f7b7629768c40eeb39" },
  { logo: "EHEX", symbol: "EHEX", price: "Live", change: 0.0, address: "0x57fde0a71132198bbec939b98976993d8d89d225" },
  { logo: "WBTC", symbol: "WBTC", price: "Live", change: 0.0, address: "0xb17d901469b9208b17d916112988a3fed19b5ca1" },
  { logo: "DAI", symbol: "DAI", price: "Live", change: 0.0, address: "0x6b175474e89094c44da98b954eedeac495271d0f" },
];

export default function CoinsPage() {
  return (
    <div className="space-y-6">
      <h1 className="section-title">Coins</h1>
      <p className="text-sm text-fire-text/70">
        Click any tracked token below to open its dedicated analytics page with chart, liquidity, and holder data.
      </p>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {trackedCoins.map((coin) => (
          <Link key={coin.symbol} href={`/coins/${coin.address}`} className="block">
            <CoinCard logo={coin.logo} symbol={coin.symbol} price={coin.price} change={coin.change} />
          </Link>
        ))}
      </div>

      <section className="glass p-5">
        <h2 className="mb-2 text-lg font-semibold">Custom Token Lookup</h2>
        <p className="text-sm text-fire-text/75">
          You can open any token page manually using the URL format:
          <code className="ml-1">/coins/0xYourTokenAddress</code>.
        </p>
      </section>
    </div>
  );
}
