import type { ReactNode } from "react"

import { Section } from "@ui/index"

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ")
}

export function SubpageHero({
  eyebrow,
  title,
  body,
  icon,
  meta,
  aside,
  className = "",
}: {
  eyebrow?: ReactNode
  title: ReactNode
  body?: ReactNode
  icon?: ReactNode
  meta?: ReactNode
  aside?: ReactNode
  className?: string
}) {
  return (
    <Section className={cx("pt-10 sm:pt-12", className)}>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,0.82fr)_minmax(280px,0.38fr)] lg:items-end">
        <div className="min-w-0 max-w-3xl">
          {eyebrow ? (
            <div className="flex items-center gap-2 text-sm font-bold text-water">
              {icon}
              {eyebrow}
            </div>
          ) : null}
          <h1 className="mt-3 break-words text-3xl font-extrabold leading-tight tracking-normal text-balance sm:text-5xl">
            {title}
          </h1>
          {body ? (
            <p className="mt-5 max-w-3xl break-words text-base leading-8 text-ink/68 text-pretty">
              {body}
            </p>
          ) : null}
          {meta ? <div className="mt-5 flex flex-wrap items-center gap-3">{meta}</div> : null}
        </div>
        {aside ? <div className="min-w-0">{aside}</div> : null}
      </div>
    </Section>
  )
}

export function HeroMeta({ icon, children }: { icon?: ReactNode; children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface/72 px-3 py-1.5 text-xs font-semibold text-ink/58">
      {icon}
      {children}
    </span>
  )
}

export function SurfacePanel({
  children,
  tone = "light",
  className = "",
}: {
  children: ReactNode
  tone?: "light" | "dark" | "muted" | "success" | "danger" | "info"
  className?: string
}) {
  const tones = {
    light: "border-line bg-surface text-ink",
    dark: "border-white/10 bg-ink text-white",
    muted: "border-line bg-rice/70 text-ink",
    success: "border-moss/20 bg-moss/10 text-ink",
    danger: "border-lychee/20 bg-lychee/10 text-ink",
    info: "border-water/20 bg-water/10 text-ink",
  }

  return (
    <div className={cx("rounded-xl border p-5 shadow-[0_12px_28px_rgba(25,32,27,0.08)]", tones[tone], className)}>
      {children}
    </div>
  )
}

export function PanelTitle({
  icon,
  children,
  tone = "water",
}: {
  icon?: ReactNode
  children: ReactNode
  tone?: "water" | "moss" | "lychee" | "ink" | "white"
}) {
  const tones = {
    water: "text-water",
    moss: "text-moss",
    lychee: "text-lychee",
    ink: "text-ink",
    white: "text-white/74",
  }

  return (
    <div className={cx("flex items-center gap-2 text-sm font-bold", tones[tone])}>
      {icon}
      {children}
    </div>
  )
}

export function MetricTile({
  label,
  value,
  icon,
  tone = "light",
}: {
  label: ReactNode
  value: ReactNode
  icon?: ReactNode
  tone?: "light" | "dark" | "muted"
}) {
  return (
    <div
      className={cx(
        "min-w-0 rounded-lg p-4",
        tone === "dark" ? "bg-white/8 text-white" : tone === "muted" ? "bg-rice text-ink" : "border border-line bg-surface text-ink",
      )}
    >
      {icon ? <div className={tone === "dark" ? "text-white/62" : "text-water"}>{icon}</div> : null}
      <div className="mt-2 break-words text-2xl font-extrabold tabular-nums">{value}</div>
      <div className={cx("mt-1 text-xs font-semibold", tone === "dark" ? "text-white/54" : "text-ink/54")}>{label}</div>
    </div>
  )
}

export function InlineNotice({
  children,
  icon,
  tone = "info",
  className = "",
}: {
  children: ReactNode
  icon?: ReactNode
  tone?: "info" | "success" | "warning" | "danger" | "neutral"
  className?: string
}) {
  const tones = {
    info: "border-water/20 bg-water/10 text-water",
    success: "border-moss/20 bg-moss/10 text-moss",
    warning: "border-amber-500/25 bg-amber-100/70 text-amber-800",
    danger: "border-lychee/20 bg-lychee/10 text-lychee",
    neutral: "border-line bg-rice text-ink/66",
  }

  return (
    <div className={cx("flex items-start gap-2 rounded-lg border p-3 text-sm font-semibold leading-6", tones[tone], className)}>
      {icon ? <span className="mt-0.5 shrink-0">{icon}</span> : null}
      <span className="min-w-0 break-words">{children}</span>
    </div>
  )
}

export function EmptyState({
  title,
  body,
  icon,
  className = "",
}: {
  title: ReactNode
  body?: ReactNode
  icon?: ReactNode
  className?: string
}) {
  return (
    <div className={cx("flex min-h-40 flex-col items-center justify-center rounded-xl border border-line bg-rice/70 p-6 text-center", className)}>
      {icon ? <div className="mb-3 text-water">{icon}</div> : null}
      <div className="text-sm font-extrabold text-ink/68">{title}</div>
      {body ? <p className="mt-2 max-w-sm text-sm leading-6 text-ink/52">{body}</p> : null}
    </div>
  )
}

export function FieldLabel({
  label,
  children,
  helper,
  className = "",
}: {
  label: ReactNode
  children: ReactNode
  helper?: ReactNode
  className?: string
}) {
  return (
    <label className={cx("grid gap-2 text-sm font-bold text-ink", className)}>
      <span>{label}</span>
      {children}
      {helper ? <span className="text-xs font-semibold text-ink/48">{helper}</span> : null}
    </label>
  )
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  labelFor,
  className = "",
}: {
  options: readonly T[]
  value: T
  onChange: (value: T) => void
  labelFor: (value: T) => ReactNode
  className?: string
}) {
  return (
    <div className={cx("grid rounded-full border border-line bg-surface p-1", className)}>
      {options.map((option) => (
        <button
          className={cx(
            "h-10 rounded-full px-3 text-sm font-bold transition active:scale-[0.98] motion-reduce:transition-none",
            value === option ? "bg-ink text-white" : "text-ink/58 hover:bg-rice hover:text-ink",
          )}
          key={option}
          onClick={() => onChange(option)}
          type="button"
        >
          {labelFor(option)}
        </button>
      ))}
    </div>
  )
}
