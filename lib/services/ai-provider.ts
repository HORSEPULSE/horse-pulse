export type AiProviderName = "heuristic" | "clawfi";

export type AiProviderInput = {
  objective: "contract" | "wallet";
  chain: "pulsechain";
  address: string;
  context: Record<string, unknown>;
};

export type AiProviderOutput = {
  provider: AiProviderName;
  summary: string;
  flags: string[];
  score?: number;
};

export interface AiProvider {
  name: AiProviderName;
  analyze(input: AiProviderInput): Promise<AiProviderOutput | null>;
}

export class ClawFiProvider implements AiProvider {
  name: AiProviderName = "clawfi";

  async analyze(input: AiProviderInput): Promise<AiProviderOutput | null> {
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
        body: JSON.stringify({
          chain: input.chain,
          address: input.address,
          objective: input.objective,
          context: input.context,
        }),
        cache: "no-store",
      });

      if (!res.ok) return null;
      const data = (await res.json()) as Record<string, unknown>;
      return {
        provider: "clawfi",
        summary: typeof data.explanation === "string" ? data.explanation : "External provider completed.",
        flags: Array.isArray(data.flags) ? (data.flags as string[]) : [],
        score: Number.isFinite(Number(data.riskScore)) ? Number(data.riskScore) : undefined,
      };
    } catch {
      return null;
    }
  }
}

