import type { ReactNode } from "react"

export function AdminStatCard({
  icon,
  label,
  value,
}: {
  icon?: ReactNode
  label: string
  value: string | number
}) {
  return (
    <div className="rounded-lg border border-stone bg-white p-4 shadow-soft">
      <div className="flex items-center gap-2">
        {icon ? <span className="text-ink/40">{icon}</span> : null}
        <div className="text-2xl font-extrabold">{value}</div>
      </div>
      <div className="mt-1 text-xs font-semibold text-ink/54">{label}</div>
    </div>
  )
}
