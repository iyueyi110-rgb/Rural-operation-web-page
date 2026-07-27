import assert from "node:assert/strict"
import test from "node:test"

import { chunkDocument, tokenize } from "./chunker"
import {
  filterChunksForRole,
  sanitizeKnowledgeQuestion,
} from "./permission-filter"
import { retrieve } from "./retriever"
import type { KnowledgeDocumentMetadata, KnowledgeIndex } from "./schemas"

const metadata: KnowledgeDocumentMetadata = {
  documentId: "care-sop",
  title: "养护 SOP",
  version: "v1",
  effectiveDate: "2026-07-20",
  status: "active",
  allowedRoles: ["operator", "villager"],
  owner: "test",
  reviewedAt: "2026-07-20",
}

test("tokenizes Chinese queries with characters and bigrams", () => {
  const tokens = tokenize("养护照片模糊")
  assert.ok(tokens.includes("养护"))
  assert.ok(tokens.includes("照片"))
})

test("operator-only headings never leak to villagers", () => {
  const chunks = chunkDocument(
    metadata,
    "## 公开流程\n\n可以提交申请。\n\n## [仅运营] 审核\n\n检查内部记录。",
  )
  assert.equal(
    filterChunksForRole(chunks, "villager").some((chunk) =>
      chunk.section.includes("仅运营"),
    ),
    false,
  )
  assert.equal(
    filterChunksForRole(chunks, "operator").some((chunk) =>
      chunk.section.includes("仅运营"),
    ),
    true,
  )
})

test("sanitizes sensitive values before retrieval or model calls", () => {
  const sanitized = sanitizeKnowledgeQuestion("手机号13812345678，金额：¥680")
  assert.equal(sanitized.includes("13812345678"), false)
  assert.equal(sanitized.includes("680"), false)
})

test("retrieves the supporting care section deterministically", () => {
  const chunks = chunkDocument(
    metadata,
    "## 凭证\n\n照片模糊时需要重新提交清晰图片。\n\n## 接单\n\n先核对任务。",
  )
  const index: KnowledgeIndex = { version: "test", generatedAt: "", chunks }
  const result = retrieve(index, "养护照片模糊怎么办", "villager", 1)
  assert.equal(result[0]?.section, "凭证")
})
