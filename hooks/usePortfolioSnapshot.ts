"use client";

import { useCallback, useEffect, useState } from "react";
import type { PortfolioSnapshot } from "@/lib/types/portfolio";

export function usePortfolioSnapshot(address: string) {
  const [data, setData] = useState<PortfolioSnapshot | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/portfolio/${address}`, { cache: "no-store" });
      if (!res.ok) throw new Error(`Portfolio request failed: ${res.status}`);
      setData((await res.json()) as PortfolioSnapshot);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Portfolio load failed.");
    } finally {
      setLoading(false);
    }
  }, [address]);

  useEffect(() => {
    void load();
  }, [load]);

  return { data, loading, error, reload: load };
}

