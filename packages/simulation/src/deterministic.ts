export function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value)
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`
  const record = value as Record<string, unknown>
  return `{${Object.keys(record)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`)
    .join(",")}}`
}

export function stableHash(value: unknown): string {
  const input = stableStringify(value)
  let first = 0x811c9dc5
  let second = 0x9e3779b9
  for (let index = 0; index < input.length; index += 1) {
    const code = input.charCodeAt(index)
    first ^= code
    first = Math.imul(first, 0x01000193)
    second ^= code + index
    second = Math.imul(second, 0x85ebca6b)
  }
  return `${(first >>> 0).toString(16).padStart(8, "0")}${(second >>> 0).toString(16).padStart(8, "0")}`
}

/** A keyed random sample: adding a decision never shifts any other random stream. */
export function keyedRandom(
  seed: number,
  entityId: string,
  decision: string,
): number {
  const hash = stableHash([seed, entityId, decision])
  return Number.parseInt(hash.slice(0, 8), 16) / 0x1_0000_0000
}

export function addHours(iso: string, hours: number): string {
  return new Date(new Date(iso).getTime() + hours * 3_600_000).toISOString()
}

export function addDays(iso: string, days: number): string {
  return addHours(iso, days * 24)
}

export function hoursBetween(start: string, end: string): number {
  return (new Date(end).getTime() - new Date(start).getTime()) / 3_600_000
}

export function deterministicId(prefix: string, value: unknown): string {
  return `${prefix}_${stableHash(value)}`
}
