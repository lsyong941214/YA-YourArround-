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
      keyframes: {
        "card-out": {
          "0%": { transform: "translateY(0) scale(1)", opacity: "1" },
          "100%": { transform: "translateY(-28px) scale(0.85)", opacity: "0" },
        },
        "card-in": {
          "0%": { transform: "translateY(28px) scale(0.92)", opacity: "0" },
          "100%": { transform: "translateY(0) scale(1)", opacity: "1" },
        },
      },
      animation: {
        "card-out": "card-out 220ms ease-in forwards",
        "card-in": "card-in 260ms ease-out forwards",
      },
    },
  },
  plugins: [],
};

export default config;
