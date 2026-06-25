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
        rice: "#f2ecdf",
        stone: "#d6cdbc",
        surface: "#fbfaf6",
        muted: "#e8e1d4",
        line: "#cfc4b1",
        canopy: "#24382f",
      },
      boxShadow: {
        soft: "0 18px 46px rgba(25, 32, 27, 0.10)",
        panel: "0 28px 80px rgba(25, 32, 27, 0.16)",
      },
    },
  },
  plugins: [],
}

export default config
