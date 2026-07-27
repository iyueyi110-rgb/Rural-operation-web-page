import Link from "next/link"
import { ArrowLeft, FileX } from "lucide-react"

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#ece5d8] px-6 text-[#19201b]">
      <div className="max-w-md rounded-lg border border-[#cfc4b1] bg-white p-6 text-center shadow">
        <FileX aria-hidden="true" className="mx-auto h-12 w-12 text-[#19201b]/30" />
        <h1 className="mt-4 text-xl font-semibold">管理页面未找到</h1>
        <p className="mt-3 text-sm leading-6 text-[#19201b]/60">
          该管理页面不存在。请检查 URL，或返回仪表盘继续操作。
        </p>
        <Link
          className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#19201b] px-5 py-2 text-sm font-semibold text-white"
          href="/dashboard"
        >
          <ArrowLeft aria-hidden="true" className="h-4 w-4" />
          返回仪表盘
        </Link>
      </div>
    </main>
  )
}
