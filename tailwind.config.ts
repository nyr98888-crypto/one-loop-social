import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        "studio-navbar": "#0B0F19",
        "studio-bg": "#F8FAFC",
        "studio-card": "#FFFFFF",
        "sky-brand": "#0ea5e9",
        "sky-hover": "#0284c7",
        "sky-light": "#E0F2FE",
        "sky-glow": "rgba(14, 165, 233, 0.25)",
      },
      fontFamily: {
        heebo: ["var(--font-heebo)", "Assistant", "sans-serif"],
        assistant: ["var(--font-assistant)", "Heebo", "sans-serif"],
      },
      boxShadow: {
        "sky-glow": "0 0 20px rgba(14, 165, 233, 0.25)",
      },
    },
  },
  plugins: [],
};

export default config;
