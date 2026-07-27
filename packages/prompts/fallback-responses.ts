export interface FallbackResponse {
  content: string
  source: "fallback"
}

const fallbackResponses: Record<string, string> = {
  route: "AI 路线服务暂时不可用，已按路线模板为你保留可解释路线建议。",
  content_factory: "AI 内容工厂暂时不可用，已显示审核过的预设内容方向。",
  ai_query: "AI 问答暂时不可用，已显示走马村云脑的预设运营说明。",
  recommendation: "AI 智策生成暂时不可用，请先查看规则层和现场数据建议。",
}

export function getFallbackResponse(queryType: string): FallbackResponse {
  return {
    content:
      fallbackResponses[queryType] ??
      "AI 服务暂时不可用，显示预设内容，请稍后重试。",
    source: "fallback",
  }
}
