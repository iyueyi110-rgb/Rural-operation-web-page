export interface SmsMessage {
  phone: string
  content: string
  apiKey: string
  templateId: string
}

export interface SendSmsOptions {
  apiKey?: string
  templateId?: string
  transport?: (message: SmsMessage) => Promise<boolean>
}

export interface SendSmsResult {
  fallback?: "in_app"
  success: boolean
}

export async function sendSms(
  phone: string,
  content: string,
  options: SendSmsOptions = {},
): Promise<SendSmsResult> {
  const apiKey = options.apiKey ?? process.env.SMS_API_KEY ?? ""
  const templateId = options.templateId ?? process.env.SMS_TEMPLATE_ID ?? ""

  if (!apiKey || !templateId) {
    console.warn("SMS not configured, falling back to in_app notification")
    return { success: false, fallback: "in_app" }
  }
  if (!/^1[3-9]\d{9}$/.test(phone.trim()) || !content.trim()) {
    console.warn(
      "SMS recipient or content is invalid, falling back to in_app notification",
    )
    return { success: false, fallback: "in_app" }
  }
  if (!options.transport) {
    console.warn(
      "SMS provider transport is not connected, falling back to in_app notification",
    )
    return { success: false, fallback: "in_app" }
  }

  try {
    const success = await options.transport({
      phone: phone.trim(),
      content: content.trim(),
      apiKey,
      templateId,
    })
    return success ? { success: true } : { success: false, fallback: "in_app" }
  } catch (error) {
    console.error(
      "SMS provider failed, falling back to in_app notification",
      error,
    )
    return { success: false, fallback: "in_app" }
  }
}
