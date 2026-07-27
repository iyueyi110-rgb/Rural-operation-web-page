import { adminCopy } from "@admin/lib/admin-copy"

export default function Loading() {
  return (
    <main className="min-h-screen bg-rice p-5 text-ink">
      <div className="rounded-lg border border-stone bg-white p-6 text-sm font-semibold text-ink/64 shadow-soft">
        {adminCopy.loading}
      </div>
    </main>
  )
}
