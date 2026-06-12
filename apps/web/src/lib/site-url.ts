export function getSiteUrl() {
  return new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000")
}

export function getAllowedCorsOrigins() {
  const configuredOrigins = process.env.CORS_ALLOWED_ORIGINS
    ?.split(",")
    .map((origin) => origin.trim())
    .filter(Boolean)

  return configuredOrigins && configuredOrigins.length > 0
    ? configuredOrigins
    : ["http://localhost:3000", "http://localhost:3001"]
}
