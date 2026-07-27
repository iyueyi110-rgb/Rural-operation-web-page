import { tokenize } from "./chunker"
import { filterChunksForRole } from "./permission-filter"
import type { KnowledgeIndex, KnowledgeRole, RankedChunk } from "./schemas"

export function retrieve(
  index: KnowledgeIndex,
  question: string,
  role: KnowledgeRole,
  topK = 5,
  allowDraft = false,
): RankedChunk[] {
  const chunks = filterChunksForRole(index.chunks, role, allowDraft)
  if (!chunks.length) return []
  const queryTokens = tokenize(question)
  const averageLength =
    chunks.reduce((sum, chunk) => sum + chunk.tokens.length, 0) / chunks.length
  const documentFrequency = new Map<string, number>()
  for (const token of queryTokens) {
    documentFrequency.set(
      token,
      chunks.filter((chunk) => chunk.tokens.includes(token)).length,
    )
  }
  return chunks
    .map((chunk) => {
      let score = 0
      for (const token of queryTokens) {
        const frequency = chunk.tokens.filter((item) => item === token).length
        if (!frequency) continue
        const df = documentFrequency.get(token) ?? 0
        const idf = Math.log(1 + (chunks.length - df + 0.5) / (df + 0.5))
        score +=
          idf *
          ((frequency * 2.2) /
            (frequency +
              1.2 * (0.25 + (0.75 * chunk.tokens.length) / averageLength)))
      }
      return { ...chunk, score }
    })
    .filter((chunk) => chunk.score > 0)
    .sort(
      (left, right) =>
        right.score - left.score || left.id.localeCompare(right.id),
    )
    .slice(0, Math.max(1, Math.min(topK, 8)))
}
