import type { Config } from "tailwindcss"

const config: Config = {
  content: [
    "./src/**/*.{ts,tsx}",
    "../../packages/ui/src/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: "#19201b",
        moss: "#46624a",
        lychee: "#b93835",
        water: "#2f7686",
        rice: "#f5f0e4",
        stone: "#ded5c4",
      },
      boxShadow: {
        soft: "0 22px 60px rgba(25, 32, 27, 0.12)",
      },
    },
  },
  plugins: [],
}

export default config
