import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#FFF3E9",
          200: "#FFD1A6",
          500: "#FB8A3C",
          600: "#F26B12",
          700: "#D9560A",
        },
      },
    },
  },
  plugins: [],
};

export default config;
