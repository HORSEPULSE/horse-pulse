"use client";

import { useEffect, useState } from "react";
import { fetchEcosystemSnapshotClient, type EcosystemApiResponse } from "@/lib/api";

export function useEcosystemData() {
  const [snapshot, setSnapshot] = useState<EcosystemApiResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const run = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchEcosystemSnapshotClient();
        if (!active) return;
        setSnapshot(data);
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Failed to load ecosystem snapshot.");
      } finally {
        if (active) setLoading(false);
      }
    };

    void run();
    const timer = setInterval(run, 30_000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, []);

  return { snapshot, loading, error };
}

