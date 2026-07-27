export function normalizeMainlandMobile(value: unknown) {
  if (typeof value !== "string") return ""
  return value.replace(/\D/g, "")
}

export function isMainlandMobile(value: string) {
  return /^1[3-9]\d{9}$/.test(value)
}
