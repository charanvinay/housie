import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "var(--color-primary)",
        primaryForeground: "var(--color-primary-foreground)",
        accent: "var(--color-accent)",
        accentForeground: "var(--color-accent-foreground)",
        roomCard: "var(--room-card-bg)",
        cardBg: "var(--card-bg)",
        cardBorder: "var(--card-border)",
        inputBg: "var(--input-bg)",
        inputBorder: "var(--input-border)",
        success: "var(--success)",
        successBg: "var(--success-bg)",
        danger: "var(--danger)",
        dangerSoft: "var(--danger-soft)",
        accentDim: "var(--accent-dim)",
        yellow: "var(--yellow)",
        yellowDark: "var(--yellow-dark)",
        yellowDarker: "var(--yellow-darker)",
      },
      fontFamily: {
        display: ["var(--font-display)", "system-ui", "sans-serif"],
        body: ["var(--font-body)", "system-ui", "sans-serif"],
      },
      animation: {
        "fade-in": "fadeIn 0.2s ease-out",
        "scale-in": "scaleIn 0.25s ease-out",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        scaleIn: {
          "0%": { opacity: "0", transform: "scale(0.95)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
