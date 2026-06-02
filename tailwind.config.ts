import type { Config } from "tailwindcss";

// v6 canonical tokens, mapped to CSS variables so [data-theme=dark] works.
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "var(--ink)",
        sky: "var(--sky)",
        accent: "var(--accent)",
        gold: "var(--gold)",
        bg: "var(--bg)",
        paper: "var(--paper)",
        line: "var(--line)",
        "line-2": "var(--line-2)",
        text: "var(--text)",
        muted: "var(--muted)",
        success: "var(--success)",
        danger: "var(--danger)",
      },
      fontFamily: {
        display: ["Archivo", "system-ui", "sans-serif"],
        body: ["DM Sans", "system-ui", "sans-serif"],
      },
    },
  },
  darkMode: ["selector", '[data-theme="dark"]'],
  plugins: [],
};

export default config;
