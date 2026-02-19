import { NextResponse } from "next/server";
import { utilityAccessRequestSchema } from "@/lib/schemas/api";
import { getClientIp, assertRateLimit } from "@/lib/security/rate-limit";
import { getHorseTokenBalance, hasHorseUtility, verifyWalletSignature } from "@/lib/services/token-gate";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(request: Request) {
  const ip = getClientIp(request);
  const limit = assertRateLimit(`utility:access:${ip}`, 50, 60_000);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Rate limit exceeded. Try again shortly." },
      { status: 429, headers: { "Retry-After": String(Math.ceil(limit.resetInMs / 1000)) } },
    );
  }

  try {
    const body = await request.json();
    const parsed = utilityAccessRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const { address, message, signature, feature } = parsed.data;
    const signatureValid = await verifyWalletSignature(address, message, signature);
    if (!signatureValid) {
      return NextResponse.json({ allowed: false, reason: "Invalid signature." }, { status: 401 });
    }

    const balance = await getHorseTokenBalance(address);
    const tier = hasHorseUtility(balance);
    const allowed = tier.features.includes(feature);

    return NextResponse.json({
      allowed,
      tier: tier.tier,
      features: tier.features,
      balanceRaw: balance.toString(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Utility access check failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

