"use client";

import { useMemo, useState } from "react";
import Chart from "@/components/Chart";
import StatsCard from "@/components/StatsCard";

const categories = [
  "Blocks",
  "Validators",
  "Bridge",
  "Gas",
  "Activity",
  "Treasury",
  "Locked",
  "Leagues",
  "Liquidity",
];

export default function StatsPage() {
  const [active, setActive] = useState("Blocks");

  const cards = useMemo(
    () => [
      { label: `${active} Metric A`, value: "1,203,445", delta: "+2.4%" },
      { label: `${active} Metric B`, value: "$52.4M", delta: "-1.1%" },
      { label: `${active} Metric C`, value: "8,492", delta: "+0.8%" },
    ],
    [active],
  );

  const rows = [
    { name: `${active} Alpha`, value: "2,431", share: "31%" },
    { name: `${active} Beta`, value: "1,982", share: "22%" },
    { name: `${active} Gamma`, value: "1,677", share: "17%" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="section-title">Stats</h1>
        <select
          value={active}
          onChange={(e) => setActive(e.target.value)}
          className="rounded-md border border-fire-border bg-black/40 px-3 py-2 text-sm outline-none"
        >
          {categories.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
      </div>

      <section className="grid gap-4 md:grid-cols-3">
        {cards.map((card) => (
          <StatsCard key={card.label} {...card} />
        ))}
      </section>

      <section>
        <Chart />
      </section>

      <section className="glass overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-black/30 text-fire-text/70">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Value</th>
              <th className="px-4 py-3">Share</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.name} className="border-t border-fire-border/40">
                <td className="px-4 py-3">{row.name}</td>
                <td className="px-4 py-3">{row.value}</td>
                <td className="px-4 py-3">{row.share}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
