import { NextResponse } from "next/server";
import { clearSessionCookieValue } from "@/lib/auth/session";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.headers.set("Set-Cookie", clearSessionCookieValue());
  return response;
}

