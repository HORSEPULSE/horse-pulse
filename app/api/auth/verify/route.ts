import { NextResponse } from "next/server";
import { authVerifyRequestSchema } from "@/lib/schemas/api";
import { assertRateLimit, getClientIp } from "@/lib/security/rate-limit";
import { consumeNonce, createSessionToken, sessionCookieValue, buildMessage } from "@/lib/auth/session";
import { verifyWalletSignature } from "@/lib/services/token-gate";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(request: Request) {
  const ip = getClientIp(request);
  const limit = assertRateLimit(`auth:verify:${ip}`, 30, 60_000);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Rate limit exceeded. Try again shortly." },
      { status: 429, headers: { "Retry-After": String(Math.ceil(limit.resetInMs / 1000)) } },
    );
  }

  try {
    const body = await request.json();
    const parsed = authVerifyRequestSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

    const { address, signature, nonce } = parsed.data;
    if (!consumeNonce(address, nonce)) return NextResponse.json({ error: "Invalid or expired nonce." }, { status: 401 });

    const message = buildMessage(address, nonce);
    const ok = await verifyWalletSignature(address, message, signature);
    if (!ok) return NextResponse.json({ error: "Signature verification failed." }, { status: 401 });

    const token = createSessionToken(address);
    const response = NextResponse.json({ ok: true, address });
    response.headers.set("Set-Cookie", sessionCookieValue(token));
    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Auth verify failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
