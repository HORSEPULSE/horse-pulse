"use client";

import { FormEvent, useState } from "react";
import { analyzeContractClient, type AiAnalyzeResponse } from "@/lib/api";

function shortAddress(value: string | null): string {
  if (!value) return "N/A";
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}

export default function AiAnalyzer() {
  const [address, setAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AiAnalyzeResponse | null>(null);

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setResult(null);
    const input = address.trim();
    if (!input) return;

    try {
      setLoading(true);
      const data = await analyzeContractClient(input);
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to run analysis.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="glass rounded-3xl border-fire-accent/30 bg-gradient-to-br from-fire-accent/10 via-black/40 to-fire-red/10 p-5">
      <div className="mb-4 flex items-center justify-between gap-3 max-md:flex-col max-md:items-start">
        <div>
          <h2 className="text-2xl font-semibold text-white" style={{ fontFamily: "var(--font-title)" }}>
            ClawAI Contract Intel
          </h2>
          <p className="mt-1 text-sm text-fire-text/70">
            Contract explanation, red flag detection, token mechanics breakdown, and owner/renounce checks.
          </p>
        </div>
        <span className="subtle-pill border-fire-accent/50 text-[11px]">PulseChain AI Beta</span>
      </div>

      <form onSubmit={onSubmit} className="mb-4 flex gap-3 max-md:flex-col">
        <input
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="Paste token or contract address (0x...)"
          className="h-11 flex-1 rounded-lg border border-white/15 bg-black/35 px-3 text-sm outline-none placeholder:text-fire-text/35"
        />
        <button type="submit" className="fire-button h-11 px-5">
          {loading ? "Analyzing..." : "Analyze Contract"}
        </button>
      </form>

      {error ? <p className="mb-3 text-sm text-rose-300">{error}</p> : null}

      {result ? (
        <div className="space-y-4">
          <div className="grid gap-3 md:grid-cols-4">
            <article className="rounded-xl border border-white/10 bg-black/35 p-3">
              <p className="text-xs text-fire-text/60">Risk Score</p>
              <p className="mt-1 text-2xl font-semibold text-white">{result.score}/100</p>
            </article>
            <article className="rounded-xl border border-white/10 bg-black/35 p-3">
              <p className="text-xs text-fire-text/60">Risk Level</p>
              <p className={`mt-1 text-2xl font-semibold ${result.level === "low" ? "text-emerald-400" : result.level === "medium" ? "text-amber-300" : "text-rose-400"}`}>
                {result.level.toUpperCase()}
              </p>
            </article>
            <article className="rounded-xl border border-white/10 bg-black/35 p-3">
              <p className="text-xs text-fire-text/60">Owner</p>
              <p className="mt-1 text-lg font-semibold text-white">{shortAddress(result.owner.address)}</p>
              <p className="text-xs text-fire-text/60">{result.owner.renounced ? "Renounced" : "Owner active"}</p>
            </article>
            <article className="rounded-xl border border-white/10 bg-black/35 p-3">
              <p className="text-xs text-fire-text/60">Proxy</p>
              <p className="mt-1 text-lg font-semibold text-white">{result.proxy.detected ? "Detected" : "Not detected"}</p>
              <p className="text-xs text-fire-text/60">{shortAddress(result.proxy.implementation)}</p>
            </article>
          </div>

          <article className="rounded-xl border border-white/10 bg-black/35 p-3">
            <p className="mb-2 text-xs uppercase tracking-wide text-fire-text/55">Plain-English Summary</p>
            <p className="text-sm text-fire-text/90">{result.explanation}</p>
            <p className="mt-2 text-[11px] text-fire-text/55">Engine: {result.provider}</p>
          </article>

          <div className="grid gap-3 md:grid-cols-2">
            <article className="rounded-xl border border-white/10 bg-black/35 p-3">
              <p className="mb-2 text-xs uppercase tracking-wide text-fire-text/55">Red Flags</p>
              <ul className="space-y-1 text-sm text-rose-300">
                {result.redFlags.map((flag) => (
                  <li key={flag}>- {flag}</li>
                ))}
              </ul>
            </article>
            <article className="rounded-xl border border-white/10 bg-black/35 p-3">
              <p className="mb-2 text-xs uppercase tracking-wide text-fire-text/55">Token Mechanics</p>
              <ul className="space-y-1 text-sm text-fire-text/90">
                {result.mechanics.map((item) => (
                  <li key={item}>- {item}</li>
                ))}
              </ul>
            </article>
          </div>

          {result.hiddenMechanics.length ? (
            <article className="rounded-xl border border-white/10 bg-black/35 p-3">
              <p className="mb-2 text-xs uppercase tracking-wide text-fire-text/55">Hidden Mechanics (Explained)</p>
              <ul className="space-y-1 text-sm text-fire-text/90">
                {result.hiddenMechanics.map((item) => (
                  <li key={item}>- {item}</li>
                ))}
              </ul>
            </article>
          ) : null}
        </div>
      ) : (
        <p className="text-xs text-fire-text/60">
          Tip: try pasting one of your tracked tokens to generate a real report instantly.
        </p>
      )}
    </section>
  );
}
