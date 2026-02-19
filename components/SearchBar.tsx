"use client";

import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

export default function SearchBar() {
  const router = useRouter();
  const [query, setQuery] = useState("");

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!query.trim()) return;
    router.push(`/explorer?q=${encodeURIComponent(query.trim())}`);
  };

  return (
    <form
      onSubmit={onSubmit}
      className="grid grid-cols-[auto,1fr,auto] items-center gap-2 rounded-full border border-white/15 bg-black/35 p-2 backdrop-blur"
    >
      <Search className="ml-2 text-fire-text/55" size={18} />
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="h-10 w-full bg-transparent px-2 text-sm outline-none placeholder:text-fire-text/45"
        placeholder="Search by Coin / Block / Transaction"
      />
      <button type="submit" className="fire-button h-10 rounded-full px-6 text-sm">
        Search
      </button>
    </form>
  );
}
