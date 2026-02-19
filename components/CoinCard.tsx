import Image from "next/image";

type Props = {
  logo: string;
  symbol: string;
  price: string;
  change: number;
};

const localIcons: Record<string, string> = {
  HORSE: "/coins/svg/horse.svg",
  PLS: "/coins/svg/pls.svg",
  HEX: "/coins/svg/hex.svg",
  EHEX: "/coins/svg/hex.svg",
  INC: "/coins/svg/inc.svg",
  PLSX: "/coins/svg/plsx.svg",
  WBTC: "/coins/svg/pwbtc.svg",
  DAI: "/coins/svg/pdai.svg",
};

export default function CoinCard({ logo, symbol, price, change }: Props) {
  const isUp = change >= 0;
  const iconPath = localIcons[symbol.toUpperCase()];

  return (
    <article className="glass glass-hover rounded-2xl p-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {iconPath ? (
            <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-lg border border-white/10 bg-black/50 p-1">
              <Image src={iconPath} alt={`${symbol} icon`} width={28} height={28} className="h-7 w-7 object-contain" />
            </div>
          ) : (
            <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-black/50 text-[10px] font-bold text-fire-accent">
              {logo}
            </div>
          )}
          <span className="text-xl font-semibold" style={{ fontFamily: "var(--font-title)" }}>
            {symbol}
          </span>
        </div>
        <p className={`text-sm font-semibold ${isUp ? "text-emerald-400" : "text-rose-400"}`}>
          {isUp ? "+" : ""}
          {change.toFixed(2)}%
        </p>
      </div>
      <div className="my-4 h-px bg-white/10" />
      <p className="text-3xl font-semibold leading-none">{price}</p>
      <p className="mt-2 text-xs text-fire-text/55">Liquidity and market data updating live.</p>
    </article>
  );
}
