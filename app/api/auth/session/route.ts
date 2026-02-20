import { NextResponse } from "next/server";
import { getSessionCookieName, verifySessionToken } from "@/lib/auth/session";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: Request) {
  const cookie = request.headers.get("cookie") || "";
  const name = `${getSessionCookieName()}=`;
  const token = cookie
    .split(";")
    .map((x) => x.trim())
    .find((x) => x.startsWith(name))
    ?.slice(name.length);

  if (!token) return NextResponse.json({ authenticated: false, address: null });
  const session = verifySessionToken(token);
  if (!session) return NextResponse.json({ authenticated: false, address: null });
  return NextResponse.json({ authenticated: true, address: session.address });
}

