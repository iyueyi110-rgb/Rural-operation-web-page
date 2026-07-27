import type { ReactNode } from "react"

export function AdminPageShell({
  title,
  eyebrow,
  description,
  actions,
  children,
}: {
  title: string
  eyebrow?: string
  description?: string
  actions?: ReactNode
  children: ReactNode
}) {
  return (
    <div className="grid min-w-0 gap-5">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          {eyebrow ? <p className="text-sm font-bold text-water">{eyebrow}</p> : null}
          <h1 className="mt-1 text-2xl font-extrabold tracking-normal text-ink sm:text-3xl">{title}</h1>
          {description ? <p className="mt-2 max-w-3xl text-sm leading-6 text-ink/60">{description}</p> : null}
        </div>
        {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
      </header>
      {children}
    </div>
  )
}

export function AdminPanel({
  children,
  className = "",
}: {
  children: ReactNode
  className?: string
}) {
  return <section className={`rounded-xl border border-line bg-surface p-5 shadow-soft ${className}`}>{children}</section>
}

export function AdminNotice({
  children,
  tone = "neutral",
  className = "",
}: {
  children: ReactNode
  tone?: "neutral" | "error" | "success"
  className?: string
}) {
  const toneClass =
    tone === "error"
      ? "border-lychee/20 bg-lychee/10 text-lychee"
      : tone === "success"
        ? "border-moss/20 bg-moss/10 text-moss"
        : "border-line bg-surface text-ink/62"

  return <div className={`rounded-lg border px-4 py-3 text-sm font-bold ${toneClass} ${className}`}>{children}</div>
}
