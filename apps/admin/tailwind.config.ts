import type { Config } from "tailwindcss"

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#19201b",
        moss: "#46624a",
        lychee: "#b93835",
        rice: "#f2ecdf",
        stone: "#d6cdbc",
        water: "#2f7686",
        surface: "#fbfaf6",
        muted: "#e8e1d4",
        line: "#cfc4b1",
        canopy: "#24382f",
      },
      boxShadow: {
        soft: "0 16px 40px rgba(32, 49, 43, 0.09)",
        panel: "0 28px 80px rgba(17, 28, 24, 0.16)",
      },
    },
  },
  plugins: [],
}

export default config
