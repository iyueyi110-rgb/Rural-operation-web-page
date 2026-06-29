import createNextIntlPlugin from "next-intl/plugin"

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts")

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@zouma/contracts", "@zouma/database", "@zouma/prompts", "@zouma/ui", "@zouma/utils"],
  images: {
    deviceSizes: [640, 768, 1024, 1280, 1536],
    formats: ["image/avif", "image/webp"],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
}

export default withNextIntl(nextConfig)
