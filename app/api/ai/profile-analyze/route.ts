import { NextResponse } from "next/server";
import { profileAnalyzeRequestSchema } from "@/lib/schemas/api";
import { getClientIp, assertRateLimit } from "@/lib/security/rate-limit";
import { analyzeWalletProfile } from "@/lib/services/profile-ai";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(request: Request) {
  const ip = getClientIp(request);
  const limit = assertRateLimit(`ai:profile:${ip}`, 40, 60_000);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Rate limit exceeded. Try again shortly." },
      { status: 429, headers: { "Retry-After": String(Math.ceil(limit.resetInMs / 1000)) } },
    );
  }

  try {
    const body = await request.json();
    const parsed = profileAnalyzeRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const result = await analyzeWalletProfile(parsed.data.address);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Profile AI analyze failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

