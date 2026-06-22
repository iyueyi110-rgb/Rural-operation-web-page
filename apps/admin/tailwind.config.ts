import type { Config } from "tailwindcss"

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#19201b",
        moss: "#46624a",
        lychee: "#b93835",
        rice: "#f5f0e4",
        stone: "#ded5c4",
        water: "#2f7686",
      },
      boxShadow: {
        soft: "0 18px 50px rgba(32, 49, 43, 0.10)",
      },
    },
  },
  plugins: [],
}

export default config
