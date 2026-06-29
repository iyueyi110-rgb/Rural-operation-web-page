import "server-only"

export interface ModelProviderAdapterOptions {
  systemPrompt?: string
  temperature?: number
  timeout?: number
}

export interface ModelProviderAdapterResult {
  content: string
  provider: string
  model: string
  latencyMs: number
}

const FALLBACK_RESULT: ModelProviderAdapterResult = {
  content: "",
  provider: "fallback",
  model: "none",
  latencyMs: 0,
}

export class ModelProviderAdapter {
  static async complete(prompt: string, options: ModelProviderAdapterOptions = {}): Promise<ModelProviderAdapterResult> {
    const apiKey = process.env.DEEPSEEK_API_KEY
    const model = process.env.DEEPSEEK_MODEL ?? "deepseek-chat"
    const timeout = options.timeout ?? 30_000
    const startedAt = Date.now()

    if (!apiKey) {
      console.warn("ModelProviderAdapter: DEEPSEEK_API_KEY not configured, using fallback")
      return FALLBACK_RESULT
    }

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeout)

    try {
      const response = await fetch("https://api.deepseek.com/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          messages: [
            {
              role: "system",
              content:
                options.systemPrompt ??
                "你是走马村四境游线规划助手。根据游客的时长、人群、天气，从给定路线中推荐最合适的一条。只返回 JSON。",
            },
            {
              role: "user",
              content: prompt,
            },
          ],
          temperature: options.temperature ?? 0.2,
        }),
        signal: controller.signal,
      })

      if (!response.ok) {
        throw new Error(`DeepSeek request failed with ${response.status}`)
      }

      const payload = (await response.json()) as {
        choices?: Array<{ message?: { content?: string } }>
      }

      return {
        content: payload.choices?.[0]?.message?.content ?? "",
        provider: "deepseek",
        model,
        latencyMs: Date.now() - startedAt,
      }
    } catch (error) {
      console.error("ModelProviderAdapter: request failed, using fallback:", error)
      return { ...FALLBACK_RESULT, latencyMs: Date.now() - startedAt }
    } finally {
      clearTimeout(timeoutId)
    }
  }
}
