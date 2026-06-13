import createNextIntlPlugin from "next-intl/plugin"

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts")

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@zouma/contracts", "@zouma/database", "@zouma/prompts", "@zouma/ui", "@zouma/utils"],
}

export default withNextIntl(nextConfig)
