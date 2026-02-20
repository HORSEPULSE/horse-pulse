"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type SessionState = {
  loading: boolean;
  authenticated: boolean;
  address: string | null;
  error: string | null;
};

type EthereumProvider = {
  request: (args: { method: string; params?: unknown[] | Record<string, unknown> }) => Promise<unknown>;
};

function getProvider(): EthereumProvider | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { ethereum?: EthereumProvider };
  return w.ethereum || null;
}

export function useAuthSession() {
  const [state, setState] = useState<SessionState>({
    loading: true,
    authenticated: false,
    address: null,
    error: null,
  });

  const refresh = useCallback(async () => {
    try {
      setState((s) => ({ ...s, loading: true, error: null }));
      const res = await fetch("/api/auth/session", { cache: "no-store" });
      if (!res.ok) throw new Error(`Session failed: ${res.status}`);
      const data = (await res.json()) as { authenticated: boolean; address: string | null };
      setState({ loading: false, authenticated: data.authenticated, address: data.address, error: null });
    } catch (error) {
      setState({
        loading: false,
        authenticated: false,
        address: null,
        error: error instanceof Error ? error.message : "Session check failed.",
      });
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const login = useCallback(async () => {
    const provider = getProvider();
    if (!provider) throw new Error("No EVM wallet detected. Install MetaMask/WalletConnect-compatible wallet.");

    const accounts = (await provider.request({ method: "eth_requestAccounts" })) as string[];
    const address = accounts?.[0];
    if (!address) throw new Error("Wallet did not return an address.");

    const nonceRes = await fetch("/api/auth/nonce", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ address }),
    });
    if (!nonceRes.ok) throw new Error("Failed to create sign-in nonce.");
    const nonceData = (await nonceRes.json()) as { nonce: string; message: string };

    const signature = (await provider.request({
      method: "personal_sign",
      params: [nonceData.message, address],
    })) as string;

    const verifyRes = await fetch("/api/auth/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ address, nonce: nonceData.nonce, signature }),
    });
    if (!verifyRes.ok) throw new Error("Signature verification failed.");

    await refresh();
  }, [refresh]);

  const logout = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    await refresh();
  }, [refresh]);

  return useMemo(
    () => ({
      ...state,
      login,
      logout,
      refresh,
    }),
    [state, login, logout, refresh],
  );
}

