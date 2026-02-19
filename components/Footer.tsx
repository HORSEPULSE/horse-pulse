import Image from "next/image";
import Link from "next/link";

export default function Footer() {
  return (
    <footer className="mt-14 border-t border-fire-border/60 bg-black/30">
      <div className="container flex flex-col items-center justify-between gap-4 py-7 md:flex-row">
        <Link href="/" className="flex items-center gap-2">
          <Image
            src="/fire_horse_icon_512.png"
            alt="Horse Pulse"
            width={28}
            height={28}
            className="rounded-full"
          />
          <span className="text-sm font-medium text-fire-text/85">
            HORSE PULSE
          </span>
        </Link>
        <p className="text-xs text-fire-text/60">
          PulseChain analytics dashboard. Built for Vercel deployment.
        </p>
      </div>
    </footer>
  );
}
