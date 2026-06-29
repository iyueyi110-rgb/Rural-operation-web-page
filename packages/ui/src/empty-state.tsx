import { type ReactNode } from "react"

interface EmptyStateProps {
  action?: ReactNode
  className?: string
  description?: string
  icon?: ReactNode
  title: string
}

export function EmptyState({
  action,
  className = "",
  description,
  icon,
  title,
}: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center rounded-lg border border-dashed border-line bg-surface/60 px-6 py-12 text-center ${className}`}
    >
      {icon ? <div className="mb-3 text-ink/35">{icon}</div> : null}
      <h3 className="text-base font-semibold text-ink/72">{title}</h3>
      {description ? (
        <p className="mt-1 max-w-md text-sm leading-6 text-ink/54">{description}</p>
      ) : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  )
}
