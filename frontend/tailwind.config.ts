import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        orbitron: ["var(--font-orbitron)", "sans-serif"],
        space: ["var(--font-space)", "monospace"],
      },
      colors: {
        primary: "var(--bg-primary)",
        deep: "var(--bg-deep)",
        surface: "var(--bg-surface)",
        accent: {
          DEFAULT: "var(--accent)",
          dim: "var(--accent-dim)",
          glow: "var(--accent-glow)",
        },
        text: {
          primary: "var(--text-primary)",
          muted: "var(--text-muted)",
        },
        border: "var(--border)",
        overlay: "var(--overlay)",
      },
    },
  },
  plugins: [],
};
export default config;
