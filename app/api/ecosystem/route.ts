import { NextResponse } from "next/server";
import { getClientIp, assertRateLimit } from "@/lib/security/rate-limit";
import { getEcosystemSnapshot } from "@/lib/services/ecosystem-engine";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: Request) {
  const ip = getClientIp(request);
  const limit = assertRateLimit(`ecosystem:${ip}`, 80, 60_000);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Rate limit exceeded. Try again shortly." },
      { status: 429, headers: { "Retry-After": String(Math.ceil(limit.resetInMs / 1000)) } },
    );
  }

  try {
    const data = await getEcosystemSnapshot();
    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load ecosystem snapshot.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

