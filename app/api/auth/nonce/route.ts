import { NextResponse } from "next/server";
import { authNonceRequestSchema } from "@/lib/schemas/api";
import { assertRateLimit, getClientIp } from "@/lib/security/rate-limit";
import { buildMessage, createNonce } from "@/lib/auth/session";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(request: Request) {
  const ip = getClientIp(request);
  const limit = assertRateLimit(`auth:nonce:${ip}`, 40, 60_000);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Rate limit exceeded. Try again shortly." },
      { status: 429, headers: { "Retry-After": String(Math.ceil(limit.resetInMs / 1000)) } },
    );
  }

  try {
    const body = await request.json();
    const parsed = authNonceRequestSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    const address = parsed.data.address;
    const nonce = createNonce(address);
    const message = buildMessage(address, nonce);
    return NextResponse.json({ nonce, message });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Nonce generation failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
