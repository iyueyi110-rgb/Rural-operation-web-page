import createNextIntlPlugin from "next-intl/plugin"
import prismaWorkaroundPlugin from "@prisma/nextjs-monorepo-workaround-plugin"

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts")
const { PrismaPlugin } = prismaWorkaroundPlugin

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: [
    "@zouma/contracts",
    "@zouma/database",
    "@zouma/prompts",
    "@zouma/ui",
    "@zouma/utils",
  ],
  webpack(config, { isServer }) {
    if (isServer) {
      config.plugins.push(new PrismaPlugin())
    }
    return config
  },
  images: {
    deviceSizes: [640, 768, 1024, 1280, 1536],
    formats: ["image/avif", "image/webp"],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
}

export default withNextIntl(nextConfig)
