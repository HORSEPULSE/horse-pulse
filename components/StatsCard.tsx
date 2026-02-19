type Props = {
  label: string;
  value: string;
  delta?: string;
};

export default function StatsCard({ label, value, delta }: Props) {
  const positive = delta?.startsWith("+");
  return (
    <article className="glass glass-hover rounded-xl p-4">
      <p className="text-[11px] uppercase tracking-[0.14em] text-fire-text/55">{label}</p>
      <p className="mt-2 text-2xl font-semibold leading-none">{value}</p>
      {delta ? (
        <p className={`mt-2 text-xs ${positive ? "text-emerald-400" : "text-rose-400"}`}>{delta}</p>
      ) : null}
    </article>
  );
}
