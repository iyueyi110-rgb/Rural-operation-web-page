const loginErrorMessages = {
  invalid_credentials: "口令不正确，请检查后重新输入。",
  not_configured: "后台登录尚未配置，请通过根目录 start.cmd 重新启动演示。",
  rate_limited: "尝试次数过多，请稍后再试。",
} as const

export default function AdminLoginPage({
  searchParams,
}: {
  searchParams?: { error?: string }
}) {
  const errorMessage =
    searchParams?.error && searchParams.error in loginErrorMessages
      ? loginErrorMessages[
          searchParams.error as keyof typeof loginErrorMessages
        ]
      : null
  const showLocalDemoPassword =
    process.env.NODE_ENV !== "production" &&
    process.env.ADMIN_LOGIN_PASSWORD === "zouma-demo-local"

  return (
    <main className="grid min-h-screen place-items-center bg-rice px-5 text-ink">
      <form
        action="/api/admin/session"
        className="w-full max-w-sm rounded-2xl border border-stone bg-white p-7 shadow-panel"
        method="post"
      >
        <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-canopy">
          邹马村管理后台
        </p>
        <h1 className="mt-3 text-2xl font-extrabold">管理员登录</h1>
        <p className="mt-2 text-sm leading-6 text-ink/60">
          登录后浏览器仅保存 HttpOnly 会话，不会接触 Web API 服务密钥。
        </p>
        {errorMessage ? (
          <p
            aria-live="polite"
            className="mt-4 rounded-lg border border-lychee/25 bg-lychee/8 px-3 py-2 text-sm font-bold leading-6 text-lychee"
            role="alert"
          >
            {errorMessage}
          </p>
        ) : null}
        {showLocalDemoPassword ? (
          <p className="mt-4 rounded-lg border border-moss/20 bg-moss/8 px-3 py-2 text-sm leading-6 text-ink/72">
            本地演示口令：
            <code className="ml-1 font-bold text-canopy">zouma-demo-local</code>
          </p>
        ) : null}
        <label className="mt-6 grid gap-2 text-sm font-bold">
          管理员口令
          <input
            autoComplete="current-password"
            className="rounded-lg border border-stone px-3 py-2.5 outline-none focus:border-canopy"
            name="password"
            required
            type="password"
          />
        </label>
        <button
          className="mt-5 w-full rounded-lg bg-canopy px-4 py-2.5 text-sm font-extrabold text-white"
          type="submit"
        >
          登录管理后台
        </button>
      </form>
    </main>
  )
}
