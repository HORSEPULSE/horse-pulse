"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { UserCircle2 } from "lucide-react";
import { useAuthSession } from "@/hooks/useAuthSession";

function shortAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export default function WalletAuthButton() {
  const { loading, authenticated, address, login, logout } = useAuthSession();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const label = useMemo(() => {
    if (loading) return "Loading";
    if (authenticated && address) return shortAddress(address);
    return "Connect";
  }, [loading, authenticated, address]);

  const onPrimary = async () => {
    if (busy || loading) return;
    try {
      setError(null);
      setBusy(true);
      if (authenticated) await logout();
      else await login();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Wallet auth failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={onPrimary}
        className="rounded-full border border-fire-border/60 p-2 text-fire-text/90 transition hover:border-fire-accent hover:text-fire-accent"
        aria-label={authenticated ? "Disconnect wallet" : "Connect wallet"}
        title={authenticated ? "Disconnect wallet" : "Connect wallet"}
      >
        <UserCircle2 size={20} />
      </button>
      <button
        type="button"
        onClick={onPrimary}
        className="hidden rounded-full border border-white/20 px-3 py-1 text-xs text-fire-text/90 transition hover:border-fire-accent hover:text-fire-accent md:inline-flex"
      >
        {busy ? "..." : label}
      </button>
      {authenticated && address ? (
        <Link
          href={`/profile/${address}`}
          className="hidden rounded-full border border-fire-accent/40 px-3 py-1 text-xs text-fire-accent transition hover:bg-fire-accent/10 md:inline-flex"
        >
          Profile
        </Link>
      ) : null}
      {error ? <span className="hidden text-xs text-rose-400 md:inline">{error}</span> : null}
    </div>
  );
}

