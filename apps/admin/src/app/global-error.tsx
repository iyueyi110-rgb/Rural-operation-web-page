"use client"

import { useEffect } from "react"

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("Admin global error:", error)
  }, [error])

  return (
    <html lang="zh-CN">
      <body>
        <main className="flex min-h-screen items-center justify-center bg-[#ece5d8] px-6 text-[#19201b]">
          <div className="max-w-md rounded-lg border border-[#cfc4b1] bg-white p-6 text-center shadow">
            <h1 className="text-xl font-semibold">运营后台暂时不可用</h1>
            <p className="mt-3 text-sm leading-6 text-[#19201b]/60">
              系统布局加载失败。请刷新页面重试，或联系技术支持确认后台服务状态。
            </p>
            <button
              className="mt-5 rounded-full bg-[#19201b] px-5 py-2 text-sm font-semibold text-white"
              onClick={reset}
              type="button"
            >
              刷新页面
            </button>
          </div>
        </main>
      </body>
    </html>
  )
}
