import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#C15F3C", // warm terracotta, distinct from Anthropic's own marks
          dark: "#9E4A2C",
        },
      },
    },
  },
  plugins: [],
};

export default config;
