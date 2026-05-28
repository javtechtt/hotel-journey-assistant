import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        display: ["var(--font-display)", "serif"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"]
      },
      colors: {
        ink: {
          900: "#05070d",
          800: "#0a0f1c",
          700: "#101728",
          600: "#1a2238"
        },
        gold: {
          50: "#fff7e6",
          200: "#f5e1b0",
          400: "#e6c46a",
          500: "#d4a73b",
          600: "#a8801f"
        },
        sand: {
          100: "#f5f0e6",
          200: "#e8dec9"
        },
        teal: {
          400: "#5fd2c5",
          500: "#33b2a4",
          700: "#0f5b56"
        }
      },
      backgroundImage: {
        "luxe-radial":
          "radial-gradient(1200px 600px at 20% 0%, rgba(212,167,59,0.18), transparent 60%), radial-gradient(900px 500px at 100% 100%, rgba(51,178,164,0.18), transparent 60%), linear-gradient(180deg, #05070d 0%, #0a0f1c 100%)",
        "gold-sheen":
          "linear-gradient(135deg, rgba(245,225,176,0.95) 0%, rgba(212,167,59,0.85) 45%, rgba(168,128,31,0.95) 100%)"
      },
      boxShadow: {
        glass: "0 30px 80px -30px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.06)",
        gold: "0 18px 40px -18px rgba(212,167,59,0.55)"
      },
      keyframes: {
        breathe: {
          "0%, 100%": { transform: "scale(1)", opacity: "0.9" },
          "50%": { transform: "scale(1.06)", opacity: "1" }
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" }
        }
      },
      animation: {
        breathe: "breathe 3s ease-in-out infinite",
        shimmer: "shimmer 3s linear infinite"
      }
    }
  },
  plugins: []
};

export default config;
