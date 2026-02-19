import { NextResponse } from "next/server";
import { aiAnalyzeRequestSchema } from "@/lib/schemas/api";
import { getClientIp, assertRateLimit } from "@/lib/security/rate-limit";
import { analyzeContractRisk } from "@/lib/services/risk-engine";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type ClawFiResponse = {
  riskScore?: number;
  trustLevel?: "High" | "Moderate" | "Speculative" | "High Risk";
  flags?: string[];
  tokenomicsSummary?: string;
};

async function enrichWithClawFi(address: string): Promise<ClawFiResponse | null> {
  const key = process.env.CLAWFI_API_KEY;
  if (!key) return null;
  const baseUrl = process.env.CLAWFI_BASE_URL || "https://api.clawfi.ai";
  const path = process.env.CLAWFI_ANALYZE_PATH || "/v1/analyze/token";

  try {
    const res = await fetch(`${baseUrl}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
        "X-API-Key": key,
      },
      body: JSON.stringify({ chain: "pulsechain", address }),
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = (await res.json()) as Record<string, unknown>;
    return {
      riskScore: Number.isFinite(Number(data.riskScore)) ? Number(data.riskScore) : undefined,
      trustLevel: ["High", "Moderate", "Speculative", "High Risk"].includes(String(data.trustLevel))
        ? (data.trustLevel as ClawFiResponse["trustLevel"])
        : undefined,
      flags: Array.isArray(data.flags) ? (data.flags as string[]) : undefined,
      tokenomicsSummary: typeof data.tokenomicsSummary === "string" ? data.tokenomicsSummary : undefined,
    };
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  const ip = getClientIp(request);
  const limit = assertRateLimit(`ai:analyze:${ip}`, 45, 60_000);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Rate limit exceeded. Try again shortly." },
      { status: 429, headers: { "Retry-After": String(Math.ceil(limit.resetInMs / 1000)) } },
    );
  }

  try {
    const body = await request.json();
    const parsed = aiAnalyzeRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const address = parsed.data.address;
    const [base, claw] = await Promise.all([analyzeContractRisk(address), enrichWithClawFi(address)]);

    const merged = {
      ...base,
      score: claw?.riskScore ?? base.score,
      trustLevel: claw?.trustLevel ?? base.trustLevel,
      flags: claw?.flags ?? base.flags,
      tokenomicsSummary: claw?.tokenomicsSummary ?? base.tokenomicsSummary,
      // Backward-compatible fields used by current frontend analyzer block.
      provider: claw ? "hybrid" : "heuristic",
      contractAddress: address,
      level:
        (claw?.trustLevel ?? base.trustLevel) === "High"
          ? "low"
          : (claw?.trustLevel ?? base.trustLevel) === "Moderate"
            ? "medium"
            : "high",
      owner: {
        address: base.ownerStatus.ownerAddress,
        renounced: base.ownerStatus.renounced,
      },
      proxy: {
        detected: base.proxyStatus.isProxy,
        implementation: base.proxyStatus.implementationAddress,
      },
      redFlags: claw?.flags ?? base.flags,
      hiddenMechanics: [
        base.mechanics.mintable ? "Mint path detected; supply can expand." : "",
        base.mechanics.blacklist ? "Blacklist controls can restrict addresses." : "",
        base.mechanics.feeModifiable ? "Fee parameters appear adjustable." : "",
        base.mechanics.honeypotHeuristic ? "Honeypot heuristic triggered by restrictive controls." : "",
      ].filter(Boolean),
      explanation: base.explanation,
    };

    return NextResponse.json(merged);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Analyze failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

