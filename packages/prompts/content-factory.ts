export type ContentFactoryType = "narration" | "script" | "social"

export const CONTENT_FACTORY_SYSTEM_PROMPTS: Record<ContentFactoryType, string> = {
  narration:
    "你是走马村四境导览词撰稿人。请围绕场景、季节与体验目标生成可直接朗读的中文导览词，语气亲切、准确、克制，不编造未给出的历史事实。",
  script:
    "你是走马村活动脚本策划助手。请生成可执行的中文活动脚本，包含流程、主持提示、游客互动、现场注意事项和收尾动作。",
  social:
    "你是走马村社交媒体文案助手。请生成适合小红书/公众号/短视频标题与正文的中文文案，强调乡村体验、四境运营和到访行动。",
}

export function buildContentFactoryPrompt(input: {
  type: ContentFactoryType
  scene?: string
  activity?: string
  season?: string
  audience?: string
}) {
  return `请根据以下参数生成内容：
- 类型：${input.type}
- 场景：${input.scene || "走马村四境"}
- 活动：${input.activity || "乡村体验"}
- 季节：${input.season || "当季"}
- 人群：${input.audience || "普通游客"}

输出要求：
1. 使用中文。
2. 不保存历史，不输出 JSON。
3. 内容要可直接复制使用。
4. 若信息不足，请用温和的占位表达，不编造具体政策、价格、交通或安全承诺。`
}
