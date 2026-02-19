type CacheEntry<T> = {
  value: T;
  expiresAt: number;
};

const memoryStore = new Map<string, CacheEntry<unknown>>();

async function getFromVercelKv<T>(key: string): Promise<T | null> {
  const base = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  if (!base || !token) return null;
  try {
    const res = await fetch(`${base}/get/${encodeURIComponent(key)}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { result?: T };
    return json.result ?? null;
  } catch {
    return null;
  }
}

async function setToVercelKv<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
  const base = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  if (!base || !token) return;
  try {
    await fetch(`${base}/set/${encodeURIComponent(key)}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ value, ex: ttlSeconds }),
      cache: "no-store",
    });
  } catch {
    // Best-effort write-through.
  }
}

export async function getOrSetCache<T>(
  key: string,
  ttlMs: number,
  loader: () => Promise<T>,
): Promise<T> {
  const now = Date.now();
  const local = memoryStore.get(key) as CacheEntry<T> | undefined;
  if (local && local.expiresAt > now) return local.value;

  const kv = await getFromVercelKv<T>(key);
  if (kv !== null) {
    memoryStore.set(key, { value: kv, expiresAt: now + ttlMs });
    return kv;
  }

  const value = await loader();
  memoryStore.set(key, { value, expiresAt: now + ttlMs });
  await setToVercelKv(key, value, Math.max(1, Math.floor(ttlMs / 1000)));
  return value;
}
