export interface ModelProviderAdapterOptions {
  temperature?: number
}

declare const process: {
  env: Record<string, string | undefined>
}

export interface ModelProviderAdapterResult {
  content: string
  provider: string
  model: string
  latencyMs: number
}

export class ModelProviderAdapter {
  static async complete(prompt: string, options: ModelProviderAdapterOptions = {}): Promise<ModelProviderAdapterResult> {
    const apiKey = process.env.DEEPSEEK_API_KEY
    const model = process.env.DEEPSEEK_MODEL ?? "deepseek-chat"
    const startedAt = Date.now()

    if (!apiKey) {
      throw new Error("DEEPSEEK_API_KEY is not configured")
    }

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
            content: "You are a route planning adapter. Return compact JSON only.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: options.temperature ?? 0.2,
      }),
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
  }
}
