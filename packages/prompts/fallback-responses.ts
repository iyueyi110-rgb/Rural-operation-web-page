export interface FallbackResponse {
  content: string
  source: "fallback"
}

const fallbackResponses: Record<string, string> = {
  route: "AI 路线服务暂时不可用，已按路线模板为你保留可解释路线建议。",
  content_factory: "AI 文案草稿暂时不可用，已显示预设内容。你可以稍后重试。",
  ai_query: "AI 数据整理暂时不可用，已显示预设说明。你可以稍后重试。",
  recommendation: "AI 建议草稿暂时不可用，请先查看规则和现场记录。",
}

export function getFallbackResponse(queryType: string): FallbackResponse {
  return {
    content:
      fallbackResponses[queryType] ??
      "AI 服务暂时不可用，显示预设内容，请稍后重试。",
    source: "fallback",
  }
}
