import type { Config } from "tailwindcss"

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#20312b",
        moss: "#51785f",
        lychee: "#b93835",
        rice: "#f6f2e9",
        stone: "#ded6c8",
        water: "#507184",
      },
      boxShadow: {
        soft: "0 18px 50px rgba(32, 49, 43, 0.10)",
      },
    },
  },
  plugins: [],
}

export default config
