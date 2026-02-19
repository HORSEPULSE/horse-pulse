"use client";

import { useState } from "react";

const frames = ["5m", "1h", "6h", "24h", "7d"];

export default function Chart() {
  const [active, setActive] = useState("24h");

  return (
    <section className="glass p-4 md:p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-sm font-medium text-fire-text/80">PLS Trend</h3>
        <div className="flex flex-wrap gap-2 rounded-full border border-white/10 bg-white/[0.02] p-1">
          {frames.map((frame) => (
            <button
              key={frame}
              onClick={() => setActive(frame)}
              className={`rounded-md px-2 py-1 text-xs transition ${
                active === frame
                  ? "bg-white/15 text-white"
                  : "text-fire-text/65 hover:text-fire-accent"
              }`}
              type="button"
            >
              {frame}
            </button>
          ))}
        </div>
      </div>

      <div className="h-56 rounded-xl border border-white/10 bg-black/45 p-3">
        <svg viewBox="0 0 100 40" className="h-full w-full">
          <defs>
            <linearGradient id="lineGlow" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ff6a00" stopOpacity="0.95" />
              <stop offset="100%" stopColor="#ff2e2e" stopOpacity="0.35" />
            </linearGradient>
            <linearGradient id="areaGlow" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ff6a00" stopOpacity="0.32" />
              <stop offset="100%" stopColor="#ff2e2e" stopOpacity="0.04" />
            </linearGradient>
          </defs>
          <polyline
            fill="url(#areaGlow)"
            stroke="none"
            points="0,40 0,30 8,26 15,28 22,20 30,21 38,15 46,18 54,12 62,16 70,10 78,13 86,9 94,11 100,7 100,40"
          />
          <polyline
            fill="none"
            stroke="url(#lineGlow)"
            strokeWidth="2"
            points="0,30 8,26 15,28 22,20 30,21 38,15 46,18 54,12 62,16 70,10 78,13 86,9 94,11 100,7"
          />
        </svg>
      </div>
    </section>
  );
}
