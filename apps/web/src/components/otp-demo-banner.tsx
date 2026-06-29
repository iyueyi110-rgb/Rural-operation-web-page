"use client"

import { InlineNotice } from "@web/components/subpage-ui"

export function OtpDemoBanner({ otpCode }: { otpCode: string }) {
  if (process.env.NODE_ENV !== "development" || !otpCode) return null

  return (
    <InlineNotice className="mt-4" tone="info">
      演示模式：验证码已显示在页面中，无需等待短信。当前验证码：{otpCode}
    </InlineNotice>
  )
}
