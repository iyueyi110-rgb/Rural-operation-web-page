export function extractJsonContent(content: string) {
  const trimmed = content.trim()

  try {
    return JSON.parse(trimmed) as unknown
  } catch {
    const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i)

    if (fenced?.[1]) {
      try {
        return JSON.parse(fenced[1]) as unknown
      } catch {
        // Continue to broad extraction below.
      }
    }

    const firstBrace = trimmed.indexOf("{")
    const lastBrace = trimmed.lastIndexOf("}")

    if (firstBrace >= 0 && lastBrace > firstBrace) {
      return JSON.parse(trimmed.slice(firstBrace, lastBrace + 1)) as unknown
    }

    throw new Error("AI JSON content could not be parsed")
  }
}
