"use client";

import Image from "next/image";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import WalletAuthButton from "@/components/WalletAuthButton";

const links = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Stats", href: "/stats" },
  { label: "Apps", href: "/apps" },
  { label: "Coins", href: "/coins" },
  { label: "Ecosystem", href: "/ecosystem" },
  { label: "Buy", href: "#" },
  { label: "Portfolio", href: "/dashboard" },
  { label: "Swap", href: "#" },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-[#09090d]/90 backdrop-blur-xl">
      <nav className="container flex h-16 items-center justify-between gap-3">
        <Link href="/" className="flex items-center gap-2">
          <Image
            src="/fire_horse_icon_512.png"
            alt="Horse Pulse Logo"
            width={34}
            height={34}
            className="rounded-full border border-fire-accent/40"
            priority
          />
          <span className="text-sm font-semibold tracking-wide md:text-base" style={{ fontFamily: "var(--font-title)" }}>
            HORSE PULSE
          </span>
        </Link>

        <div className="hidden items-center gap-5 md:flex">
          {links.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className="text-sm text-fire-text/80 transition hover:text-fire-accent"
            >
              {link.label}
            </Link>
          ))}
        </div>

        <div className="hidden md:block">
          <WalletAuthButton />
        </div>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="rounded-md border border-fire-border/60 p-2 md:hidden"
          aria-label="Toggle menu"
        >
          {open ? <X size={18} /> : <Menu size={18} />}
        </button>
      </nav>

      {open ? (
        <div className="border-t border-white/10 bg-[#09090d]/95 md:hidden">
          <div className="container py-3">
            <div className="flex flex-col gap-2">
              {links.map((link) => (
                <Link
                  key={link.label}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className="rounded-md px-2 py-2 text-sm text-fire-text/85 transition hover:bg-fire-card hover:text-fire-accent"
                >
                  {link.label}
                </Link>
              ))}
              <div className="px-2 py-2">
                <WalletAuthButton />
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </header>
  );
}
