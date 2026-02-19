import type { WalletAiProfileResult } from "@/lib/types/intelligence";
import { getWalletProfileSnapshot } from "@/lib/services/profile-engine";
import { getOrSetCache } from "@/lib/cache/store";

function clamp(min: number, max: number, value: number): number {
  return Math.max(min, Math.min(max, value));
}

export async function analyzeWalletProfile(address: string): Promise<WalletAiProfileResult> {
  return getOrSetCache(`profile-ai:${address.toLowerCase()}`, 60_000, async () => {
    const snapshot = await getWalletProfileSnapshot(address);
    const tokens = snapshot.tokens.slice(0, 10);

    const top3Share = tokens.slice(0, 3).reduce((acc, t) => acc + t.portfolioSharePct, 0);
    const illiquidShare = tokens
      .filter((t) => (t.liquidityDepthUsd ?? 0) < 150_000)
      .reduce((acc, t) => acc + t.portfolioSharePct, 0);
    const highRiskShare = tokens
      .filter((t) => t.riskRating === "High Risk" || t.riskRating === "Speculative")
      .reduce((acc, t) => acc + t.portfolioSharePct, 0);
    const swaps = snapshot.behaviorTimeline.filter((e) => e.kind === "swap").length;
    const contracts = snapshot.behaviorTimeline.filter((e) => e.kind === "contract_interaction").length;

    let riskScore = 26;
    riskScore += top3Share * 0.45;
    riskScore += illiquidShare * 0.25;
    riskScore += highRiskShare * 0.35;
    riskScore += swaps > 10 ? 8 : 0;
    riskScore += contracts > 10 ? 6 : 0;
    riskScore = clamp(5, 98, riskScore);

    const concentrationRisk =
      top3Share > 70
        ? "Portfolio is highly concentrated in top 3 assets."
        : top3Share > 45
          ? "Portfolio concentration is moderate."
          : "Portfolio concentration is broadly distributed.";

    const liquidityExposure =
      illiquidShare > 45
        ? "Material exposure to low-liquidity assets detected."
        : illiquidShare > 20
          ? "Moderate low-liquidity exposure present."
          : "Liquidity profile is relatively healthy.";

    const tradingPattern =
      swaps >= 12
        ? "High-frequency DEX behavior with active routing."
        : swaps >= 5
          ? "Moderate active trading pattern."
          : "Low-turnover wallet behavior.";

    const redFlags: string[] = [];
    if (highRiskShare > 35) redFlags.push("Large allocation in speculative/high-risk contracts.");
    if (illiquidShare > 45) redFlags.push("Portfolio can face exit slippage under volatility.");
    if (snapshot.overview.netOutflowUsdApprox > snapshot.overview.netInflowUsdApprox * 1.8) {
      redFlags.push("Outflow-heavy behavior suggests defensive or distribution phase.");
    }

    const whaleActivity: string[] = [];
    const largeEvents = snapshot.behaviorTimeline.filter((e) => e.valueUsdApprox > 25_000);
    if (largeEvents.length) {
      whaleActivity.push(`${largeEvents.length} large-value interactions detected in latest timeline window.`);
    } else {
      whaleActivity.push("No obvious whale-sized transaction footprint in sampled history.");
    }

    const opportunitySignals: string[] = [];
    if (snapshot.overview.change7dPctApprox > 0) opportunitySignals.push("Wallet momentum alignment is positive on 7d approximation.");
    if (illiquidShare < 20) opportunitySignals.push("Low slippage exposure supports tactical rotation.");
    if (tokens.some((t) => t.riskRating === "High")) opportunitySignals.push("Core allocation includes higher-trust contracts.");

    return {
      riskScore,
      behaviorSummary: `Top-3 concentration ${top3Share.toFixed(1)}%, illiquid exposure ${illiquidShare.toFixed(1)}%, high-risk exposure ${highRiskShare.toFixed(1)}%.`,
      concentrationRisk,
      liquidityExposure,
      tradingPattern,
      redFlags: redFlags.length ? redFlags : ["No major systemic wallet red flags in current snapshot."],
      whaleActivity,
      opportunitySignals: opportunitySignals.length ? opportunitySignals : ["No strong asymmetric signal detected yet."],
    };
  });
}

