import { createHmac, randomBytes, timingSafeEqual } from "crypto";

type NonceEntry = {
  value: string;
  expiresAt: number;
};

const nonceStore = new Map<string, NonceEntry>();

const SESSION_COOKIE = "horsepulse_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;
const NONCE_TTL_MS = 5 * 60 * 1000;

function getSecret(): string {
  return process.env.AUTH_SECRET || "horsepulse-dev-secret-change-me";
}

function sign(payload: string): string {
  return createHmac("sha256", getSecret()).update(payload).digest("hex");
}

function encode(payload: Record<string, unknown>): string {
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
}

function decode(value: string): Record<string, unknown> | null {
  try {
    return JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function buildMessage(address: string, nonce: string): string {
  return `HORSE PULSE Login\nAddress: ${address}\nNonce: ${nonce}`;
}

export function createNonce(address: string): string {
  const nonce = randomBytes(16).toString("hex");
  nonceStore.set(address, { value: nonce, expiresAt: Date.now() + NONCE_TTL_MS });
  return nonce;
}

export function consumeNonce(address: string, nonce: string): boolean {
  const entry = nonceStore.get(address);
  if (!entry) return false;
  nonceStore.delete(address);
  if (entry.expiresAt < Date.now()) return false;
  return entry.value === nonce;
}

export function createSessionToken(address: string): string {
  const exp = Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS;
  const payload = encode({ address, exp });
  const mac = sign(payload);
  return `${payload}.${mac}`;
}

export function verifySessionToken(token: string): { address: string } | null {
  const [payload, mac] = token.split(".");
  if (!payload || !mac) return null;
  const expected = sign(payload);
  const a = Buffer.from(mac, "hex");
  const b = Buffer.from(expected, "hex");
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  const parsed = decode(payload);
  if (!parsed) return null;
  const address = typeof parsed.address === "string" ? parsed.address : "";
  const exp = typeof parsed.exp === "number" ? parsed.exp : 0;
  if (!/^0x[a-fA-F0-9]{40}$/.test(address) || exp <= Math.floor(Date.now() / 1000)) return null;
  return { address: address.toLowerCase() };
}

export function sessionCookieValue(token: string): string {
  return `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_TTL_SECONDS}; Secure`;
}

export function clearSessionCookieValue(): string {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0; Secure`;
}

export function getSessionCookieName(): string {
  return SESSION_COOKIE;
}
