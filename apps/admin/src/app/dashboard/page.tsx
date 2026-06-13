import { adminCopy } from "@admin/lib/admin-copy"

export default function DashboardPage() {
  return (
    <div className="rounded-lg border border-stone bg-white p-6 shadow-soft">
      <p className="text-sm font-bold text-water">{adminCopy.shell.subtitle}</p>
      <h1 className="mt-1 text-2xl font-extrabold">{adminCopy.dashboard.title}</h1>
      <p className="mt-3 text-sm font-semibold leading-6 text-ink/58">{adminCopy.dashboard.noData}</p>
    </div>
  )
}
