import Image from "next/image";
import Link from "next/link";

export default function Hero() {
  return (
    <section className="glass overflow-hidden p-5 md:p-8">
      <div className="grid items-center gap-6 md:grid-cols-[1.2fr,1fr]">
        <div>
          <p className="mb-3 subtle-pill border-fire-accent/50 bg-fire-accent/10 text-fire-accent">
            PulseChain Analytics Layer
          </p>
          <h1 className="text-3xl font-bold tracking-tight md:text-5xl" style={{ fontFamily: "var(--font-title)" }}>
            HORSE PULSE
          </h1>
          <p className="mt-3 max-w-xl text-sm text-fire-text/75 md:text-base">
            PulseChain analytics, intelligence, and discovery.
          </p>
          <Link href="/coins" className="fire-button mt-6">
            Explore Ecosystem
          </Link>
        </div>

        <div className="relative animate-float-slow overflow-hidden rounded-xl border border-white/10">
          <Image
            src="/fire_horse_sick_header.png"
            alt="Fire Horse Banner"
            width={1200}
            height={400}
            className="h-full w-full object-cover"
            priority
          />
        </div>
      </div>
    </section>
  );
}
