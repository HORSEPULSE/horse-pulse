import { Flame, Rocket, ShieldCheck } from "lucide-react";

const groups = {
  "Get Started": [
    {
      title: "PulseChain Bridge",
      description: "Bridge assets into PulseChain quickly and monitor settlement.",
      icon: Rocket,
    },
    {
      title: "Wallet Connect",
      description: "Connect wallets for token and transaction visibility.",
      icon: ShieldCheck,
    },
  ],
  Staking: [
    {
      title: "Validator Staking",
      description: "Track validator APR, stake health, and rewards.",
      icon: Flame,
    },
    {
      title: "Liquid Staking",
      description: "Explore liquid staking derivatives and yields.",
      icon: Rocket,
    },
  ],
  Create: [
    {
      title: "Token Launcher",
      description: "Draft and deploy token contracts with guided templates.",
      icon: Flame,
    },
    {
      title: "Pool Builder",
      description: "Create and tune liquidity pools with safety checks.",
      icon: ShieldCheck,
    },
  ],
};

export default function AppsPage() {
  return (
    <div className="space-y-8">
      <h1 className="section-title">Apps</h1>
      {Object.entries(groups).map(([category, items]) => (
        <section key={category}>
          <h2 className="mb-3 text-lg font-semibold">{category}</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {items.map((item) => {
              const Icon = item.icon;
              return (
                <article key={item.title} className="glass glass-hover p-5">
                  <div className="flex items-start gap-3">
                    <div className="rounded-lg border border-fire-border/60 bg-black/30 p-2 text-fire-accent">
                      <Icon size={18} />
                    </div>
                    <div>
                      <h3 className="font-semibold">{item.title}</h3>
                      <p className="mt-1 text-sm text-fire-text/70">{item.description}</p>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
