"use client"

import { KeyRound, LogIn } from "lucide-react"
import { useLocale } from "next-intl"
import { useRouter } from "next/navigation"
import { useState } from "react"

import { saveAuthToken } from "@web/lib/auth-client"

export function DemoLoginClient() {
  const locale = useLocale()
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")

  async function demoLogin() {
    setBusy(true)
    setError("")

    try {
      const response = await fetch("/api/v1/auth/demo-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      })
      const result = (await response.json()) as {
        token?: string
        error?: string
      }

      if (!response.ok || !result.token) {
        throw new Error(result.error ?? "login failed")
      }

      saveAuthToken(result.token)
      router.replace(`/${locale}/me`)
    } catch {
      setError("演示登录失败，请稍后重试")
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-rice p-5 text-ink">
      <div className="w-full max-w-md rounded-xl border border-line bg-white p-8 text-center shadow-soft">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-lychee/10 text-lychee">
          <KeyRound aria-hidden="true" className="h-6 w-6" />
        </div>
        <h1 className="mt-5 text-2xl font-extrabold">演示模式登录</h1>
        <p className="mt-3 text-sm leading-7 text-ink/62">
          本页面为课程汇报演示专用，无需手机号即可一键登录，体验个人中心、订单和认养记录等功能。
        </p>

        {error ? (
          <p className="mt-4 rounded-md bg-lychee/10 px-4 py-3 text-sm font-semibold text-lychee">
            {error}
          </p>
        ) : null}

        <button
          className="mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-full bg-ink px-5 text-sm font-bold text-white transition hover:bg-moss disabled:opacity-40"
          disabled={busy}
          onClick={demoLogin}
          type="button"
        >
          <LogIn aria-hidden="true" className="h-4 w-4" />
          {busy ? "登录中..." : "一键演示登录"}
        </button>

        <p className="mt-5 text-xs text-ink/40">
          演示账户仅用于汇报展示，不会产生真实数据。
        </p>
      </div>
    </main>
  )
}
