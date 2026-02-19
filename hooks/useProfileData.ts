"use client";

import { useEffect, useState } from "react";
import {
  analyzeProfileClient,
  fetchProfileSnapshotClient,
  type WalletProfileAiResponse,
  type WalletProfileApiResponse,
} from "@/lib/api";

export function useProfileData(address: string) {
  const [profile, setProfile] = useState<WalletProfileApiResponse | null>(null);
  const [ai, setAi] = useState<WalletProfileAiResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const normalized = address.trim();
    if (!/^0x[a-fA-F0-9]{40}$/.test(normalized)) {
      setError("Invalid wallet address.");
      setProfile(null);
      setAi(null);
      return;
    }

    const run = async () => {
      try {
        setLoading(true);
        setError(null);
        const [snapshot, analysis] = await Promise.all([
          fetchProfileSnapshotClient(normalized),
          analyzeProfileClient(normalized),
        ]);
        if (!active) return;
        setProfile(snapshot);
        setAi(analysis);
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Failed to load profile intelligence.");
      } finally {
        if (active) setLoading(false);
      }
    };

    void run();
    return () => {
      active = false;
    };
  }, [address]);

  return { profile, ai, loading, error };
}

