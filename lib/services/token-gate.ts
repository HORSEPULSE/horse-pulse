import { recoverMessageAddress } from "viem";
import { callPulseRpc } from "@/lib/services/web3-rpc";

const HORSE_TOKEN_ADDRESS = "0x8536949300886be15d6033da56473e7c368c8df2";

const ERC20_BALANCE_OF_SELECTOR = "0x70a08231";

function padAddressForCall(address: string): string {
  return address.toLowerCase().replace("0x", "").padStart(64, "0");
}

function isAddress(value: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(value);
}

export async function verifyWalletSignature(address: string, message: string, signature: string): Promise<boolean> {
  try {
    const recovered = await recoverMessageAddress({
      message,
      signature: signature as `0x${string}`,
    });
    return recovered.toLowerCase() === address.toLowerCase();
  } catch {
    return false;
  }
}

export async function getHorseTokenBalance(address: string): Promise<bigint> {
  if (!isAddress(address)) return 0n;
  const data = `${ERC20_BALANCE_OF_SELECTOR}${padAddressForCall(address)}`;
  const result = await callPulseRpc<string>("eth_call", [{ to: HORSE_TOKEN_ADDRESS, data }, "latest"]).catch(() => "0x0");
  try {
    return BigInt(result);
  } catch {
    return 0n;
  }
}

export function hasHorseUtility(balance: bigint): {
  tier: "none" | "core" | "pro";
  features: string[];
} {
  if (balance >= 1000000000000000000000000n) {
    return {
      tier: "pro",
      features: [
        "unlimited_ai",
        "whale_alerts",
        "advanced_risk",
        "private_watchlists",
        "csv_exports",
        "custom_alerts",
        "premium_dashboards",
      ],
    };
  }
  if (balance > 0n) {
    return {
      tier: "core",
      features: ["unlimited_ai", "advanced_risk"],
    };
  }
  return { tier: "none", features: [] };
}

