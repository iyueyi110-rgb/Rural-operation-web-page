import type { KnowledgeChunk, KnowledgeRole } from "./schemas"

export function filterChunksForRole(
  chunks: KnowledgeChunk[],
  role: KnowledgeRole,
  allowDraft = false,
) {
  return chunks.filter(
    (chunk) =>
      (chunk.status === "active" || (allowDraft && chunk.status === "draft")) &&
      chunk.allowedRoles.includes(role),
  )
}

export function sanitizeKnowledgeQuestion(input: string) {
  return input
    .replace(/1[3-9]\d{9}/gu, "[手机号已脱敏]")
    .replace(/\b\d{17}[0-9Xx]\b/gu, "[身份证号已脱敏]")
    .replace(
      /(?:订单|支付|商户)(?:号|编号)?[：:]?\s*[A-Za-z0-9-]{8,}/gu,
      "[业务编号已脱敏]",
    )
    .replace(
      /(?:金额|支付|收益)[：:]?\s*[¥￥]?\d+(?:\.\d{1,2})?/gu,
      "[金额已脱敏]",
    )
    .trim()
}
