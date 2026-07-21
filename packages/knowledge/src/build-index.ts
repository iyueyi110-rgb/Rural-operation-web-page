import { readFile, readdir, writeFile } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"

import { chunkDocument } from "./chunker"
import type {
  DocumentStatus,
  KnowledgeChunk,
  KnowledgeDocumentMetadata,
  KnowledgeIndex,
  KnowledgeRole,
} from "./schemas"

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")

export async function buildKnowledgeIndex() {
  const contentDir = path.join(root, "content")
  const files = (await readdir(contentDir))
    .filter((name) => name.endsWith(".md"))
    .sort()
  const chunks: KnowledgeChunk[] = []
  for (const name of files) {
    const source = await readFile(path.join(contentDir, name), "utf8")
    const { metadata, body } = parseDocument(source)
    chunks.push(...chunkDocument(metadata, body))
  }
  const index: KnowledgeIndex = {
    version:
      process.env.KNOWLEDGE_INDEX_VERSION ??
      new Date().toISOString().slice(0, 10),
    generatedAt: new Date().toISOString(),
    chunks,
  }
  await writeFile(
    path.join(root, "generated", "knowledge-index.json"),
    `${JSON.stringify(index, null, 2)}\n`,
    "utf8",
  )
  return index
}

export function parseDocument(source: string) {
  const match = /^---\r?\n([\s\S]+?)\r?\n---\r?\n([\s\S]*)$/u.exec(source)
  if (!match) throw new Error("Knowledge document requires YAML frontmatter")
  const values = new Map<string, string>()
  for (const line of match[1]!.split(/\r?\n/u)) {
    const separator = line.indexOf(":")
    if (separator > 0)
      values.set(
        line.slice(0, separator).trim(),
        line.slice(separator + 1).trim(),
      )
  }
  const roles = (values.get("allowed_roles") ?? "")
    .replace(/^\[|\]$/gu, "")
    .split(",")
    .map((role) => role.trim())
    .filter(
      (role): role is KnowledgeRole =>
        role === "operator" || role === "villager",
    )
  const status = values.get("status") as DocumentStatus
  if (
    !values.get("document_id") ||
    !values.get("title") ||
    !values.get("version") ||
    !["active", "superseded", "draft"].includes(status) ||
    !roles.length
  ) {
    throw new Error("Knowledge document metadata is incomplete")
  }
  const metadata: KnowledgeDocumentMetadata = {
    documentId: values.get("document_id")!,
    title: values.get("title")!,
    version: values.get("version")!,
    effectiveDate: values.get("effective_date") ?? "",
    status,
    allowedRoles: roles,
    owner: values.get("owner") ?? "",
    reviewedAt: values.get("reviewed_at") ?? "",
  }
  return { metadata, body: match[2]! }
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const index = await buildKnowledgeIndex()
  process.stdout.write(
    `Built ${index.chunks.length} knowledge chunks (${index.version})\n`,
  )
}
