type RateEntry = {
  hits: number;
  resetAt: number;
};

const BUCKET = new Map<string, RateEntry>();

export function getClientIp(request: Request): string {
  const xff = request.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp;
  return "unknown";
}

export function assertRateLimit(key: string, maxHits: number, windowMs: number): {
  allowed: boolean;
  remaining: number;
  resetInMs: number;
} {
  const now = Date.now();
  const existing = BUCKET.get(key);
  if (!existing || now > existing.resetAt) {
    const resetAt = now + windowMs;
    BUCKET.set(key, { hits: 1, resetAt });
    return { allowed: true, remaining: maxHits - 1, resetInMs: windowMs };
  }

  if (existing.hits >= maxHits) {
    return { allowed: false, remaining: 0, resetInMs: Math.max(existing.resetAt - now, 0) };
  }

  existing.hits += 1;
  return { allowed: true, remaining: maxHits - existing.hits, resetInMs: Math.max(existing.resetAt - now, 0) };
}

