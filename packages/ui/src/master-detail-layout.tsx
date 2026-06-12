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
      <aside className="min-w-0 rounded-lg border border-stone bg-white p-5 shadow-soft lg:sticky lg:top-20 lg:self-start">
        {detail}
      </aside>
    </div>
  )
}
