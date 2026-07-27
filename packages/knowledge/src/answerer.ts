import type { KnowledgeAnswerData } from "@zouma/contracts"
import { ModelProviderAdapter } from "@zouma/utils"

import { sanitizeKnowledgeQuestion } from "./permission-filter"
import { retrieve } from "./retriever"
import {
  isKnowledgeAnswer,
  type KnowledgeIndex,
  type KnowledgeRole,
  type RankedChunk,
} from "./schemas"

const prohibitedPattern =
  /(自动|直接).{0,6}(退款|结算|判责|修改.{0,4}(订单|任务).{0,4}状态)/u
const specificCasePattern =
  /(这笔|这个订单|具体投诉|谁的责任|应该赔偿|判定责任)/u

export async function answerKnowledgeQuestion(input: {
  index: KnowledgeIndex
  question: string
  role: KnowledgeRole
  context?: Record<string, unknown>
  topK?: number
  allowDraft?: boolean
}): Promise<{
  data: KnowledgeAnswerData
  meta: { promptVersion: string; indexVersion: string; degraded?: boolean }
}> {
  const question = sanitizeKnowledgeQuestion(input.question)
  const baseMeta = {
    promptVersion: "knowledge-v2",
    indexVersion: input.index.version,
  }
  if (prohibitedPattern.test(question))
    return refused(
      "prohibited_action",
      "知识助手不能执行退款、结算、判责或修改业务状态。",
      baseMeta,
    )
  if (specificCasePattern.test(question))
    return refused(
      "specific_case_requires_operator",
      "该问题涉及具体业务判断，需要转交运营人员处理。",
      baseMeta,
    )
  const chunks = retrieve(
    input.index,
    question,
    input.role,
    input.topK ?? 5,
    input.allowDraft,
  )
  if (!chunks.length) {
    const hasPublishedForRole = input.index.chunks.some(
      (chunk) =>
        chunk.status === "active" && chunk.allowedRoles.includes(input.role),
    )
    return refused(
      hasPublishedForRole ? "insufficient_evidence" : "knowledge_not_published",
      hasPublishedForRole
        ? "现有已审核规则不足以回答该问题。"
        : "知识文档尚未发布。",
      baseMeta,
    )
  }
  if (chunks[0]!.score < 0.35)
    return refused(
      "insufficient_evidence",
      "现有已审核规则不足以回答该问题。",
      baseMeta,
    )
  const result = await ModelProviderAdapter.complete(
    buildPrompt(question, chunks, input.context),
    {
      systemPrompt:
        "你是走马村制度知识助手。只能根据给定原文回答；不得执行业务操作；只返回符合约定字段的 JSON。引用 quote 必须逐字复制原文。",
      temperature: 0.1,
      timeout: 20_000,
    },
  )
  if (!result.content.trim())
    return refused(
      "insufficient_evidence",
      "知识问答服务暂时不可用，请转人工处理。",
      { ...baseMeta, degraded: true },
    )
  try {
    const parsed = JSON.parse(
      result.content.replace(/^```json\s*|\s*```$/gu, ""),
    ) as unknown
    if (
      !isKnowledgeAnswer(parsed) ||
      !validateCitations(parsed, chunks, input.role)
    )
      throw new Error("INVALID_ANSWER")
    return { data: parsed, meta: baseMeta }
  } catch {
    return refused(
      "insufficient_evidence",
      "回答未通过原文引用校验，请转人工处理。",
      { ...baseMeta, degraded: true },
    )
  }
}

function buildPrompt(
  question: string,
  chunks: RankedChunk[],
  context?: Record<string, unknown>,
) {
  return JSON.stringify({
    question,
    context: context ?? {},
    evidence: chunks.map(
      ({ tokens: _tokens, score: _score, ...chunk }) => chunk,
    ),
    responseSchema: {
      answer: "string",
      status: "answered",
      citations: [
        {
          documentId: "string",
          title: "string",
          version: "string",
          section: "string",
          quote: "verbatim string",
        },
      ],
      allowedRoles: ["operator or villager"],
      requiresHuman: false,
    },
  })
}

export function validateCitations(
  answer: KnowledgeAnswerData,
  chunks: RankedChunk[],
  role: KnowledgeRole,
) {
  if (
    answer.status !== "answered" ||
    answer.citations.length === 0 ||
    !answer.allowedRoles.includes(role)
  )
    return false
  return answer.citations.every((citation) =>
    chunks.some(
      (chunk) =>
        chunk.documentId === citation.documentId &&
        chunk.version === citation.version &&
        chunk.section === citation.section &&
        chunk.allowedRoles.includes(role) &&
        chunk.text.includes(citation.quote),
    ),
  )
}

function refused(
  status: Exclude<KnowledgeAnswerData["status"], "answered">,
  answer: string,
  meta: { promptVersion: string; indexVersion: string; degraded?: boolean },
) {
  return {
    data: {
      answer,
      status,
      citations: [],
      allowedRoles: ["operator", "villager"] as KnowledgeRole[],
      requiresHuman: true,
    },
    meta,
  }
}
