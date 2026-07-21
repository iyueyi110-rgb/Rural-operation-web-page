import { readFile } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"

import { retrieve } from "./retriever"
import type { KnowledgeIndex, KnowledgeRole } from "./schemas"

interface EvalQuestion {
  id: string
  question: string
  role: KnowledgeRole
  expected_document_ids: string[]
  expected_behavior: "answer" | "refuse" | "escalate"
  risk_level: "low" | "medium" | "high"
}

export function evaluateRetrieval(
  index: KnowledgeIndex,
  questions: EvalQuestion[],
  options = { topK: 5, allowDraft: true },
) {
  const answerable = questions.filter(
    (item) => item.expected_behavior === "answer",
  )
  const hits = answerable.filter((item) => {
    const result = retrieve(
      index,
      item.question,
      item.role,
      options.topK,
      options.allowDraft,
    )
    return result.some((chunk) =>
      item.expected_document_ids.includes(chunk.documentId),
    )
  })
  const permissionLeak = questions
    .filter((item) => item.id === "permission-01")
    .some((item) =>
      retrieve(
        index,
        item.question,
        item.role,
        options.topK,
        options.allowDraft,
      ).some((chunk) => chunk.section.includes("仅运营")),
    )
  return {
    sampleCount: questions.length,
    answerableCount: answerable.length,
    recallHitRate: answerable.length ? hits.length / answerable.length : 0,
    permissionLeak,
    highRiskReleaseGatePassed: !permissionLeak,
  }
}

async function main() {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
  const index = JSON.parse(
    await readFile(
      path.join(root, "generated", "knowledge-index.json"),
      "utf8",
    ),
  ) as KnowledgeIndex
  const questions = (
    await readFile(path.join(root, "evals", "questions.jsonl"), "utf8")
  )
    .trim()
    .split(/\r?\n/u)
    .map((line) => JSON.parse(line) as EvalQuestion)
  process.stdout.write(
    `${JSON.stringify(evaluateRetrieval(index, questions), null, 2)}\n`,
  )
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
)
  await main()
