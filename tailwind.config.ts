import type { Config } from "tailwindcss";
import forms from "@tailwindcss/forms";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-noto-sans)", "Noto Sans", "system-ui", "sans-serif"]
      },
      boxShadow: {
        soft: "0 18px 60px rgba(0,0,0,0.06)",
        lift: "0 24px 80px rgba(0,0,0,0.1)"
      },
      colors: {
        paper: "#FAFAFA",
        ink: "#111111",
        muted: "#6B7280"
      }
    }
  },
  plugins: [forms]
};

export default config;
