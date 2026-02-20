import { NextResponse } from "next/server";
import { evmAddressSchema } from "@/lib/schemas/api";
import { assertRateLimit, getClientIp } from "@/lib/security/rate-limit";
import { getPortfolioSnapshot } from "@/lib/services/portfolio/engine";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: Request, { params }: { params: { address: string } }) {
  const ip = getClientIp(request);
  const limit = assertRateLimit(`portfolio:${ip}`, 80, 60_000);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Rate limit exceeded. Try again shortly." },
      { status: 429, headers: { "Retry-After": String(Math.ceil(limit.resetInMs / 1000)) } },
    );
  }

  const parsed = evmAddressSchema.safeParse(params.address);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid address." }, { status: 400 });
  }

  try {
    const data = await getPortfolioSnapshot(parsed.data);
    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Portfolio query failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

