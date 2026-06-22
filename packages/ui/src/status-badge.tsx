import type { ReactNode } from "react"

type StatusBadgeVariant = "default" | "info" | "success" | "warning"

const variantClasses: Record<StatusBadgeVariant, string> = {
  default: "border-white/20 bg-white/10 text-white/90 backdrop-blur",
  info: "border-water/20 bg-water/10 text-water",
  success: "border-moss/20 bg-moss/10 text-moss",
  warning: "border-amber-500/25 bg-amber-100/70 text-amber-800",
}

export function StatusBadge({
  children,
  variant = "default",
}: {
  children: ReactNode
  variant?: StatusBadgeVariant
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium ${variantClasses[variant]}`}
    >
      {children}
    </span>
  )
}
