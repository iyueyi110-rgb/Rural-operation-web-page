import type { KnowledgeChunk, KnowledgeDocumentMetadata } from "./schemas"

export function tokenize(input: string) {
  const normalized = input
    .toLowerCase()
    .replace(/[^\p{Script=Han}a-z0-9]+/gu, " ")
  const latin = normalized.match(/[a-z0-9]+/gu) ?? []
  const han = [...normalized.replace(/[^\p{Script=Han}]/gu, "")]
  const bigrams = han
    .slice(0, -1)
    .map((character, index) => `${character}${han[index + 1]}`)
  return [...new Set([...latin, ...han, ...bigrams])]
}

export function chunkDocument(
  metadata: KnowledgeDocumentMetadata,
  body: string,
): KnowledgeChunk[] {
  const sections: Array<{ heading: string; body: string }> = []
  let current = { heading: metadata.title, body: "" }
  for (const line of body.split(/\r?\n/u)) {
    const match = /^(#{2,4})\s+(.+)$/u.exec(line)
    if (match) {
      if (current.body.trim()) sections.push(current)
      current = { heading: match[2]!.trim(), body: "" }
    } else current.body += `${line}\n`
  }
  if (current.body.trim()) sections.push(current)
  return sections.flatMap((section, sectionIndex) => {
    const paragraphs = section.body
      .split(/\n\s*\n/u)
      .map((item) => item.trim())
      .filter(Boolean)
    const groups: string[] = []
    let buffer = ""
    for (const paragraph of paragraphs) {
      if (buffer && buffer.length + paragraph.length > 600) {
        groups.push(buffer)
        buffer = ""
      }
      buffer = buffer ? `${buffer}\n\n${paragraph}` : paragraph
    }
    if (buffer) groups.push(buffer)
    return groups.map((text, chunkIndex) => ({
      id: `${metadata.documentId}:${sectionIndex + 1}:${chunkIndex + 1}`,
      documentId: metadata.documentId,
      title: metadata.title,
      version: metadata.version,
      section: section.heading,
      text,
      tokens: tokenize(`${section.heading} ${text}`),
      allowedRoles: section.heading.includes("[仅运营]")
        ? ["operator"]
        : metadata.allowedRoles,
      status: metadata.status,
    }))
  })
}
