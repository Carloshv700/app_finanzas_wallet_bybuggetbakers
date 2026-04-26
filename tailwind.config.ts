import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        bg: "#0b0f1a",
        panel: "#111827",
        panel2: "#0f1626",
        accent: "#28cb7c",
        accentSoft: "#1f8a55",
        warn: "#f59e0b",
        danger: "#ef4444",
        muted: "#94a3b8",
      },
      fontFamily: {
        sans: ["ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "Roboto", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      keyframes: {
        floatUp: {
          "0%": { opacity: "1", transform: "translateY(0)" },
          "100%": { opacity: "0", transform: "translateY(-32px)" },
        },
        pulseGlow: {
          "0%, 100%": { boxShadow: "0 0 20px rgba(40,203,124,0.25)" },
          "50%": { boxShadow: "0 0 35px rgba(40,203,124,0.55)" },
        },
      },
      animation: {
        floatUp: "floatUp 1.2s ease-out forwards",
        pulseGlow: "pulseGlow 2s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
