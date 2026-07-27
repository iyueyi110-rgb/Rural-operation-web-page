import type { ReactNode } from "react"

export function MasterDetailLayout({
  master,
  detail,
  className = "",
}: {
  master: ReactNode
  detail: ReactNode
  className?: string
}) {
  return (
    <div className={`grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.62fr)] ${className}`}>
      <section className="min-w-0">{master}</section>
      <aside className="min-w-0 rounded-xl border border-line bg-surface p-5 shadow-[0_12px_28px_rgba(25,32,27,0.08)] lg:sticky lg:top-20 lg:self-start">
        {detail}
      </aside>
    </div>
  )
}
