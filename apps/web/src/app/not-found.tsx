import Link from "next/link"
import { ArrowLeft, Compass } from "lucide-react"

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-rice px-6 text-ink">
      <div className="max-w-md rounded-lg border border-stone bg-white p-6 text-center shadow-soft">
        <Compass aria-hidden="true" className="mx-auto h-12 w-12 text-ink/30" />
        <h1 className="mt-4 text-xl font-semibold">页面未找到</h1>
        <p className="mt-3 text-sm leading-6 text-ink/70">
          您访问的页面不存在或已被移除。可能是链接已过期，或输入的地址有误。
        </p>
        <Link
          className="mt-5 inline-flex items-center gap-2 rounded-full bg-ink px-5 py-2 text-sm font-semibold text-white"
          href="/zh-CN"
        >
          <ArrowLeft aria-hidden="true" className="h-4 w-4" />
          返回首页
        </Link>
      </div>
    </main>
  )
}
