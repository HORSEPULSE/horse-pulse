"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAuthSession } from "@/hooks/useAuthSession";

export default function ProfileEntryPage() {
  const router = useRouter();
  const { address, authenticated, login } = useAuthSession();
  const [value, setValue] = useState("");

  const open = (wallet: string) => router.push(`/profile/${wallet.toLowerCase()}`);

  return (
    <div className="space-y-6 pb-8 pt-16 md:pt-22">
      <h1 className="section-title">Open Wallet Profile</h1>
      <div className="glass p-4">
        {authenticated && address ? (
          <button onClick={() => open(address)} type="button" className="fire-button">
            Open My Profile
          </button>
        ) : (
          <button onClick={() => void login()} type="button" className="fire-button">
            Connect Wallet
          </button>
        )}
      </div>
      <form
        className="glass flex flex-col gap-3 p-4 md:flex-row"
        onSubmit={(e) => {
          e.preventDefault();
          const v = value.trim();
          if (!/^0x[a-fA-F0-9]{40}$/.test(v)) return;
          open(v);
        }}
      >
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Enter wallet address"
          className="h-11 flex-1 rounded-md border border-white/15 bg-black/35 px-3 text-sm outline-none"
        />
        <button className="fire-button h-11 min-w-24" type="submit">
          Open
        </button>
      </form>
    </div>
  );
}

