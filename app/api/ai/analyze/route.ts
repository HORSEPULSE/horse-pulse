import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const EIP1967_IMPL_SLOT = "0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc";

type AnalyzerResult = {
  provider: "heuristic" | "clawfi" | "hybrid";
  contractAddress: string;
  score: number;
  level: "low" | "medium" | "high";
  owner: {
    address: string | null;
    renounced: boolean;
  };
  proxy: {
    detected: boolean;
    implementation: string | null;
  };
  mechanics: string[];
  redFlags: string[];
  explanation: string;
  hiddenMechanics: string[];
};

type RpcResponse<T> = {
  result?: T;
  error?: { message?: string };
};

function isAddress(value: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(value);
}

function normalizeAddress(value: string): string {
  return value.trim().toLowerCase();
}

async function callRpc<T>(method: string, params: unknown[]): Promise<T> {
  const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL;
  if (!rpcUrl) {
    throw new Error("NEXT_PUBLIC_RPC_URL is missing.");
  }

  const res = await fetch(rpcUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: Date.now(),
      method,
      params,
    }),
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`RPC failed: ${res.status}`);
  }

  const json = (await res.json()) as RpcResponse<T>;
  if (json.error) {
    throw new Error(json.error.message || "RPC error");
  }
  return json.result as T;
}

function decodeAddress32(value: string | null | undefined): string | null {
  if (!value || !value.startsWith("0x")) return null;
  const hex = value.slice(2);
  if (hex.length < 64) return null;
  const addr = `0x${hex.slice(-40)}`.toLowerCase();
  if (!isAddress(addr)) return null;
  return addr;
}

function hasSelector(bytecode: string, selector: string): boolean {
  return bytecode.toLowerCase().includes(selector.toLowerCase().replace("0x", ""));
}

async function detectOwner(contract: string): Promise<string | null> {
  const ownerCalls = ["0x8da5cb5b", "0x893d20e8"]; // owner(), getOwner()
  for (const data of ownerCalls) {
    try {
      const result = await callRpc<string>("eth_call", [{ to: contract, data }, "latest"]);
      const addr = decodeAddress32(result);
      if (addr) return addr;
    } catch {
      // Try next selector.
    }
  }
  return null;
}

async function getHeuristicAnalysis(address: string): Promise<AnalyzerResult> {
  const [bytecode, ownerAddress, implSlot] = await Promise.all([
    callRpc<string>("eth_getCode", [address, "latest"]),
    detectOwner(address),
    callRpc<string>("eth_getStorageAt", [address, EIP1967_IMPL_SLOT, "latest"]).catch(() => "0x"),
  ]);

  const redFlags: string[] = [];
  const mechanics: string[] = [];
  const hiddenMechanics: string[] = [];

  if (!bytecode || bytecode === "0x") {
    redFlags.push("Address has no deployed contract bytecode.");
    return {
      provider: "heuristic",
      contractAddress: address,
      score: 0,
      level: "high",
      owner: { address: null, renounced: false },
      proxy: { detected: false, implementation: null },
      mechanics: ["No executable contract detected"],
      redFlags,
      hiddenMechanics: ["No contract logic available at this address."],
      explanation: "This address is not a live contract. Risk is high because no token logic can be verified.",
    };
  }

  const renounced = ownerAddress === "0x0000000000000000000000000000000000000000";
  if (!ownerAddress) redFlags.push("Owner function not detected (possible custom access control).");
  if (ownerAddress && !renounced) redFlags.push("Owner control is active (not renounced).");

  const implementation = decodeAddress32(implSlot);
  const proxyDetected =
    implementation !== null && implementation !== "0x0000000000000000000000000000000000000000";
  if (proxyDetected) redFlags.push("Proxy pattern detected (logic can be upgraded).");

  const selectorFlags = [
    { selector: "0x40c10f19", mechanic: "Mint function present", risk: "Mint path can expand supply." },
    { selector: "0x8456cb59", mechanic: "Pause function present", risk: "Transfers may be paused by admin." },
    { selector: "0xf2fde38b", mechanic: "Ownership transfer present", risk: "Admin rights can be reassigned." },
    { selector: "0x715018a6", mechanic: "Renounce ownership function present", risk: "Owner can renounce later." },
    { selector: "0xdd62ed3e", mechanic: "Allowance model present", risk: "Standard ERC20 approval surface." },
  ];

  for (const item of selectorFlags) {
    if (hasSelector(bytecode, item.selector)) {
      mechanics.push(item.mechanic);
      hiddenMechanics.push(item.risk);
    }
  }

  const codeBytes = Math.max((bytecode.length - 2) / 2, 0);
  if (codeBytes < 1200) redFlags.push("Contract bytecode is unusually small; verify expected behavior.");

  let score = 92;
  if (ownerAddress && !renounced) score -= 20;
  if (!ownerAddress) score -= 10;
  if (proxyDetected) score -= 15;
  if (hasSelector(bytecode, "0x40c10f19")) score -= 10;
  if (hasSelector(bytecode, "0x8456cb59")) score -= 6;
  if (codeBytes < 1200) score -= 8;
  score = Math.max(5, Math.min(99, score));

  const level: AnalyzerResult["level"] = score >= 75 ? "low" : score >= 50 ? "medium" : "high";
  const explanation =
    level === "low"
      ? "Structure looks relatively standard. Continue monitoring owner/proxy privileges."
      : level === "medium"
        ? "Some privileged mechanics exist. Use caution and monitor owner/proxy actions."
        : "Multiple risk factors detected. Treat this token as high-risk until fully audited.";

  return {
    provider: "heuristic",
    contractAddress: address,
    score,
    level,
    owner: { address: ownerAddress, renounced },
    proxy: { detected: proxyDetected, implementation: implementation ?? null },
    mechanics: mechanics.length ? mechanics : ["No common admin selectors detected in bytecode scan."],
    redFlags: redFlags.length ? redFlags : ["No immediate red flags from heuristic scan."],
    hiddenMechanics,
    explanation,
  };
}

async function tryClawFi(address: string): Promise<Partial<AnalyzerResult> | null> {
  const key = process.env.CLAWFI_API_KEY;
  if (!key) return null;

  // ClawFi endpoint can vary by account tier/version; override via env to avoid hard-coding.
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
        chain: "pulsechain",
        address,
      }),
      cache: "no-store",
    });

    if (!res.ok) return null;
    const data = (await res.json()) as Record<string, unknown>;

    const score = Number(data.riskScore ?? data.score);
    const levelRaw = String(data.riskLevel ?? "").toLowerCase();
    const flags = Array.isArray(data.redFlags) ? (data.redFlags as string[]) : [];
    const mechanics = Array.isArray(data.mechanics) ? (data.mechanics as string[]) : [];
    const explanation = typeof data.explanation === "string" ? data.explanation : "";

    return {
      provider: "clawfi",
      score: Number.isFinite(score) ? score : undefined,
      level: levelRaw === "high" || levelRaw === "medium" || levelRaw === "low" ? levelRaw : undefined,
      redFlags: flags.length ? flags : undefined,
      mechanics: mechanics.length ? mechanics : undefined,
      explanation: explanation || undefined,
    };
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as { address?: string };
    const address = normalizeAddress(payload.address ?? "");
    if (!isAddress(address)) {
      return NextResponse.json({ error: "Invalid contract address." }, { status: 400 });
    }

    const [heuristic, clawfi] = await Promise.all([getHeuristicAnalysis(address), tryClawFi(address)]);
    if (!clawfi) {
      return NextResponse.json(heuristic);
    }

    const merged: AnalyzerResult = {
      ...heuristic,
      provider: "hybrid",
      score: typeof clawfi.score === "number" ? clawfi.score : heuristic.score,
      level: clawfi.level ?? heuristic.level,
      redFlags: clawfi.redFlags ?? heuristic.redFlags,
      mechanics: clawfi.mechanics ?? heuristic.mechanics,
      explanation: clawfi.explanation ?? heuristic.explanation,
    };

    return NextResponse.json(merged);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to analyze contract.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
