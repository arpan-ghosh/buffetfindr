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
          50:  "#FFF3EC",   /* warm cream */
          100: "#FFE0C8",
          400: "#E0662E",
          500: "#C94A1F",   /* burnt tandoor orange */
          600: "#A83A14",   /* deeper */
        },
        gold: {
          400: "#E09A2A",
          500: "#D4891A",   /* curry gold */
        },
        surface: "#FFF8F2",
      },
      borderRadius: {
        "2xl": "1rem",
        "3xl": "1.5rem",
        "4xl": "2rem",
      },
      boxShadow: {
        card: "0 2px 16px 0 rgba(0,0,0,0.07)",
        "card-hover": "0 6px 28px 0 rgba(0,0,0,0.12)",
        sheet: "0 -4px 32px 0 rgba(0,0,0,0.08)",
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
