import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Rajdhani, Sora } from "next/font/google";
import "@/styles/globals.css";

const sora = Sora({
  subsets: ["latin"],
  variable: "--font-sans",
});

const rajdhani = Rajdhani({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-title",
});

export const metadata: Metadata = {
  title: "HORSE PULSE",
  description: "PulseChain analytics, intelligence, and discovery.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="dark">
      <body className={`${sora.variable} ${rajdhani.variable}`}>
        <Navbar />
        <main className="container py-6">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
