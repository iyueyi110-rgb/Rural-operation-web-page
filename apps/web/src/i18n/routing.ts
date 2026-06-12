export const locales = ["zh-CN", "en", "ja"] as const

export type Locale = (typeof locales)[number]

export const defaultLocale: Locale = "zh-CN"
