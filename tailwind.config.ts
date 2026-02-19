import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "1rem",
      screens: {
        "2xl": "1440px",
      },
    },
    extend: {
      colors: {
        fire: {
          bg: "#0b0b0f",
          accent: "#ff6a00",
          red: "#ff2e2e",
          text: "#f5f5f5",
          card: "rgba(255,255,255,0.06)",
          border: "rgba(255,106,0,0.35)",
        },
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(255,106,0,0.35), 0 12px 40px rgba(255,46,46,0.2)",
        card: "0 16px 40px rgba(0,0,0,0.45)",
      },
      backgroundImage: {
        "fire-gradient":
          "radial-gradient(circle at top right, rgba(255,106,0,0.22), transparent 35%), radial-gradient(circle at bottom left, rgba(255,46,46,0.2), transparent 30%)",
      },
      animation: {
        "pulse-glow": "pulseGlow 2.4s ease-in-out infinite",
        "float-slow": "floatSlow 8s ease-in-out infinite",
      },
      keyframes: {
        pulseGlow: {
          "0%, 100%": {
            boxShadow:
              "0 0 0 1px rgba(255,106,0,0.22), 0 0 20px rgba(255,46,46,0.12)",
          },
          "50%": {
            boxShadow:
              "0 0 0 1px rgba(255,106,0,0.38), 0 0 30px rgba(255,46,46,0.25)",
          },
        },
        floatSlow: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-6px)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
