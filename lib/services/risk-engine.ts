import { fetchDexPairsByTokenAddress } from "@/lib/api";
import type { ContractRiskResult, TrustLevel } from "@/lib/types/intelligence";

const EIP1967_IMPL_SLOT = "0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc";

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
  if (!rpcUrl) throw new Error("NEXT_PUBLIC_RPC_URL is missing.");
  const res = await fetch(rpcUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: Date.now(), method, params }),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`RPC request failed: ${res.status}`);
  const json = (await res.json()) as RpcResponse<T>;
  if (json.error) throw new Error(json.error.message || "RPC error");
  return json.result as T;
}

function decodeAddress32(value: string | null | undefined): string | null {
  if (!value || !value.startsWith("0x")) return null;
  const raw = value.slice(2);
  if (raw.length < 64) return null;
  const addr = `0x${raw.slice(-40)}`.toLowerCase();
  return isAddress(addr) ? addr : null;
}

function hasSelector(bytecode: string, selector: string): boolean {
  return bytecode.toLowerCase().includes(selector.toLowerCase().replace("0x", ""));
}

const ownerOnlySelectorMap: Array<{ selector: string; label: string }> = [
  { selector: "0x40c10f19", label: "mint(address,uint256)" },
  { selector: "0x79cc6790", label: "setTax(uint256)" },
  { selector: "0x8456cb59", label: "pause()" },
  { selector: "0x3f4ba83a", label: "unpause()" },
  { selector: "0xf2fde38b", label: "transferOwnership(address)" },
  { selector: "0x715018a6", label: "renounceOwnership()" },
  { selector: "0xdd62ed3e", label: "allowance(address,address)" },
  { selector: "0x4e2800f3", label: "setBlacklist(address,bool)" },
  { selector: "0x8a8c523c", label: "setFees(uint256,uint256)" },
];

async function detectOwner(address: string): Promise<string | null> {
  for (const data of ["0x8da5cb5b", "0x893d20e8"]) {
    try {
      const call = await callRpc<string>("eth_call", [{ to: address, data }, "latest"]);
      const addr = decodeAddress32(call);
      if (addr) return addr;
    } catch {
      // try next selector
    }
  }
  return null;
}

function riskLevelFromScore(score: number): TrustLevel {
  if (score >= 80) return "High";
  if (score >= 65) return "Moderate";
  if (score >= 45) return "Speculative";
  return "High Risk";
}

export async function analyzeContractRisk(addressInput: string): Promise<ContractRiskResult> {
  const address = normalizeAddress(addressInput);
  if (!isAddress(address)) {
    throw new Error("Invalid contract address.");
  }

  const [bytecode, ownerAddress, implSlot, pairs] = await Promise.all([
    callRpc<string>("eth_getCode", [address, "latest"]),
    detectOwner(address),
    callRpc<string>("eth_getStorageAt", [address, EIP1967_IMPL_SLOT, "latest"]).catch(() => "0x"),
    fetchDexPairsByTokenAddress(address).catch(() => []),
  ]);

  if (!bytecode || bytecode === "0x") {
    return {
      score: 5,
      trustLevel: "High Risk",
      flags: ["No deployed bytecode found at this address."],
      ownerStatus: {
        ownerAddress: null,
        renounced: false,
        ownerOnlyFunctions: [],
      },
      proxyStatus: {
        isProxy: false,
        implementationAddress: null,
        upgradeabilityRisk: "high",
      },
      liquidityStatus: {
        totalLiquidityUsd: 0,
        pairCount: 0,
        concentrationRisk: "high",
      },
      tokenomicsSummary: "No executable logic detected. Treat as non-verified/high-risk.",
      mechanics: {
        mintable: false,
        pausable: false,
        blacklist: false,
        feeModifiable: false,
        taxLogic: false,
        honeypotHeuristic: true,
      },
      explanation: "No contract code was found. This is high risk by default.",
    };
  }

  const renounced = ownerAddress === "0x0000000000000000000000000000000000000000";
  const implementationAddress = decodeAddress32(implSlot);
  const isProxy = Boolean(implementationAddress && implementationAddress !== "0x0000000000000000000000000000000000000000");

  const ownerOnlyFunctions = ownerOnlySelectorMap
    .filter((x) => hasSelector(bytecode, x.selector))
    .map((x) => x.label);

  const mechanics = {
    mintable: hasSelector(bytecode, "0x40c10f19") || hasSelector(bytecode, "0x1249c58b"),
    pausable: hasSelector(bytecode, "0x8456cb59") || hasSelector(bytecode, "0x3f4ba83a"),
    blacklist: hasSelector(bytecode, "0x4e2800f3") || hasSelector(bytecode, "0xf9f92be4"),
    feeModifiable: hasSelector(bytecode, "0x8a8c523c") || hasSelector(bytecode, "0x9d47f4f4"),
    taxLogic: hasSelector(bytecode, "0x79cc6790") || hasSelector(bytecode, "0x2f7ba6f1"),
    honeypotHeuristic:
      hasSelector(bytecode, "0x8456cb59") &&
      hasSelector(bytecode, "0x4e2800f3") &&
      (hasSelector(bytecode, "0xa9059cbb") || hasSelector(bytecode, "0x23b872dd")),
  };

  const pulsePairs = pairs.filter((p) => p.chainId?.toLowerCase() === "pulsechain");
  const totalLiquidityUsd = pulsePairs.reduce((acc, p) => acc + Number(p.liquidity?.usd ?? 0), 0);
  const topLiquidity = Math.max(0, ...pulsePairs.map((p) => Number(p.liquidity?.usd ?? 0)));
  const concentrationRatio = totalLiquidityUsd > 0 ? topLiquidity / totalLiquidityUsd : 1;
  const concentrationRisk = concentrationRatio > 0.8 ? "high" : concentrationRatio > 0.55 ? "medium" : "low";

  const flags: string[] = [];
  if (ownerAddress && !renounced) flags.push("Owner privileges are active.");
  if (!ownerAddress) flags.push("Owner accessor not detected (custom access control).");
  if (isProxy) flags.push("Upgradeable proxy pattern detected.");
  if (mechanics.mintable) flags.push("Mint function detected (supply expansion possible).");
  if (mechanics.blacklist) flags.push("Blacklist controls detected.");
  if (mechanics.pausable) flags.push("Pausable transfer flow detected.");
  if (mechanics.feeModifiable || mechanics.taxLogic) flags.push("Transfer fee/tax parameters appear modifiable.");
  if (mechanics.honeypotHeuristic) flags.push("Honeypot heuristic triggered: restrictive admin controls + transfer selectors.");
  if (totalLiquidityUsd < 100_000) flags.push("Low total DEX liquidity on PulseChain.");

  let score = 90;
  if (ownerAddress && !renounced) score -= 18;
  if (!ownerAddress) score -= 8;
  if (isProxy) score -= 12;
  if (mechanics.mintable) score -= 12;
  if (mechanics.blacklist) score -= 10;
  if (mechanics.pausable) score -= 8;
  if (mechanics.feeModifiable || mechanics.taxLogic) score -= 10;
  if (mechanics.honeypotHeuristic) score -= 15;
  if (totalLiquidityUsd < 100_000) score -= 10;
  score = Math.max(1, Math.min(99, score));

  const trustLevel = riskLevelFromScore(score);
  const tokenomicsSummary = [
    mechanics.mintable ? "Mintable supply path present." : "No common mint selector detected.",
    mechanics.taxLogic || mechanics.feeModifiable ? "Fee/tax controls likely adjustable." : "No common fee-adjust selectors detected.",
    concentrationRisk === "high"
      ? "Liquidity is concentrated in a narrow set of pools."
      : "Liquidity distribution is moderate to broad.",
  ].join(" ");

  const explanation =
    trustLevel === "High"
      ? "Contract surface appears comparatively standard with lower privilege risk."
      : trustLevel === "Moderate"
        ? "Contract includes notable privileged controls. Active monitoring is recommended."
        : trustLevel === "Speculative"
          ? "Contract has several privilege or tokenomics risks. Use strict position sizing."
          : "Contract risk is elevated due to multiple critical control vectors.";

  return {
    score,
    trustLevel,
    flags,
    ownerStatus: {
      ownerAddress,
      renounced,
      ownerOnlyFunctions,
    },
    proxyStatus: {
      isProxy,
      implementationAddress: implementationAddress ?? null,
      upgradeabilityRisk: isProxy ? "high" : "low",
    },
    liquidityStatus: {
      totalLiquidityUsd,
      pairCount: pulsePairs.length,
      concentrationRisk,
    },
    tokenomicsSummary,
    mechanics,
    explanation,
  };
}

