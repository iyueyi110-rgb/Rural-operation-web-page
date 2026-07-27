import { CircleAlert, ClipboardCheck, GitCompareArrows } from "lucide-react"
import type { ReactNode } from "react"

import type { PolicyVersion } from "@admin/lib/simulation-admin"
import { severityLabel } from "./types"

export const controlClass =
  "h-10 rounded-lg border border-stone bg-rice px-3 text-sm font-semibold outline-none transition focus:border-water focus:bg-white"
export const labelClass = "text-[11px] font-extrabold text-ink/48"
export const thClass = "px-5 py-3"
export const tdClass = "px-5 py-4"

export function SectionHeading({
  compact = false,
  description,
  eyebrow,
  title,
}: {
  compact?: boolean
  description?: string
  eyebrow?: string
  title: string
}) {
  return (
    <div>
      {eyebrow ? (
        <div className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-water">
          {eyebrow}
        </div>
      ) : null}
      <h2
        className={`${eyebrow ? "mt-1" : ""} ${compact ? "text-base" : "text-lg"} font-extrabold tracking-tight`}
      >
        {title}
      </h2>
      {description ? (
        <p className="mt-1 text-xs font-semibold leading-5 text-ink/48">
          {description}
        </p>
      ) : null}
    </div>
  )
}

export function CompactStat({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div className="min-w-[120px] rounded-lg bg-rice p-3">
      <div className="text-[10px] font-extrabold text-ink/42">{label}</div>
      <div className="mt-1 truncate text-sm font-extrabold" title={value}>
        {value}
      </div>
    </div>
  )
}
export function MetaCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 bg-canopy px-3 py-2.5">
      <div className="text-[9px] font-extrabold uppercase tracking-wider text-white/38">
        {label}
      </div>
      <div
        className="mt-1 truncate font-mono text-[11px] font-bold text-white/82"
        title={value}
      >
        {value}
      </div>
    </div>
  )
}
export function ActionButton({
  compact = false,
  disabled,
  icon,
  label,
  onClick,
}: {
  compact?: boolean
  disabled?: boolean
  icon: ReactNode
  label: string
  onClick: () => void
}) {
  return (
    <button
      className={`flex shrink-0 items-center justify-center gap-2 rounded-full bg-ink px-4 text-sm font-extrabold text-white disabled:opacity-50 ${compact ? "h-10" : "h-11"}`}
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      {icon}
      {label}
    </button>
  )
}
export function IconButton({
  children,
  label,
  onClick,
  tone = "normal",
}: {
  children: ReactNode
  label: string
  onClick: () => void
  tone?: "normal" | "danger"
}) {
  return (
    <button
      aria-label={label}
      className={`rounded-full border p-2 ${tone === "danger" ? "border-lychee/25 text-lychee hover:bg-lychee/5" : "border-stone text-ink/58 hover:bg-rice"}`}
      onClick={onClick}
      title={label}
      type="button"
    >
      {children}
    </button>
  )
}
export function PolicyBadge({ version }: { version: PolicyVersion }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-extrabold ${version === "V1" ? "bg-water/12 text-water" : "bg-ink/8 text-ink/60"}`}
    >
      模拟 {version}
    </span>
  )
}
export function StatusBadge({ status }: { status?: string }) {
  const normalized = status?.toLowerCase() ?? "unknown"
  const label: Record<string, string> = {
    pending: "排队中",
    queued: "排队中",
    running: "运行中",
    completed: "已完成",
    failed: "失败",
    archived: "已归档",
  }
  const tone =
    normalized === "completed"
      ? "bg-moss/10 text-moss"
      : normalized === "failed"
        ? "bg-lychee/10 text-lychee"
        : normalized === "running"
          ? "bg-water/10 text-water"
          : "bg-ink/7 text-ink/52"
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-extrabold ${tone}`}
    >
      模拟{label[normalized] ?? status ?? "未知"}
    </span>
  )
}
export function SeverityBadge({ severity }: { severity?: string }) {
  const value = severity?.toLowerCase() ?? "medium"
  const classes =
    value === "critical" || value === "high"
      ? "bg-lychee/10 text-lychee"
      : value === "low"
        ? "bg-moss/10 text-moss"
        : "bg-[#c9832e]/10 text-[#a6651d]"
  return (
    <span
      className={`rounded-full px-2.5 py-1 text-[10px] font-extrabold ${classes}`}
    >
      模拟{severityLabel(value)}
    </span>
  )
}
export function Notice({
  text,
  tone,
}: {
  text: string
  tone: "error" | "success"
}) {
  return (
    <div
      aria-live={tone === "error" ? "assertive" : "polite"}
      className={`flex items-center gap-2 rounded-xl border p-3 text-sm font-bold ${tone === "error" ? "border-lychee/20 bg-lychee/5 text-lychee" : "border-moss/20 bg-moss/5 text-moss"}`}
      role={tone === "error" ? "alert" : "status"}
    >
      {tone === "error" ? (
        <CircleAlert className="h-4 w-4 shrink-0" />
      ) : (
        <ClipboardCheck className="h-4 w-4 shrink-0" />
      )}
      {text}
    </div>
  )
}
export function EmptyPanel({
  detail,
  title,
}: {
  detail: string
  title: string
}) {
  return (
    <section className="rounded-xl border border-dashed border-stone bg-white p-12 text-center shadow-soft">
      <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-rice">
        <GitCompareArrows className="h-5 w-5 text-water" />
      </div>
      <h2 className="mt-4 text-lg font-extrabold">{title}</h2>
      <p className="mx-auto mt-2 max-w-lg text-sm font-semibold text-ink/48">
        {detail}
      </p>
    </section>
  )
}
