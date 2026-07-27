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
    console.error("Global error:", error)
  }, [error])

  return (
    <html lang="zh-CN">
      <body>
        <main className="flex min-h-screen items-center justify-center bg-rice px-6 text-ink">
          <div className="max-w-md rounded-lg border border-stone bg-white p-6 text-center shadow-soft">
            <h1 className="text-xl font-semibold">系统暂时不可用</h1>
            <p className="mt-3 text-sm leading-6 text-ink/70">
              页面加载过程中发生了错误。请刷新页面重试，系统会保留可恢复的访问路径。
            </p>
            <button
              className="mt-5 rounded-full bg-ink px-5 py-2 text-sm font-semibold text-white"
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
