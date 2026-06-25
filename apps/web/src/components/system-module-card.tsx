import type { ComponentType } from "react"
import Link from "next/link"
import { ArrowUpRight } from "lucide-react"

export function SystemModuleCard({
  href,
  icon: Icon,
  title,
  body,
  tag,
  status,
  tone = "light",
}: {
  href?: string
  icon: ComponentType<{ className?: string }>
  title: string
  body: string
  tag: string
  status: string
  tone?: "light" | "dark" | "image"
}) {
  const content = (
    <>
      <div className="flex items-start justify-between gap-4">
        <span
          className={
            tone === "dark"
              ? "grid h-11 w-11 place-items-center rounded-lg bg-white/10 text-[#d7b56d]"
              : "grid h-11 w-11 place-items-center rounded-lg bg-moss/10 text-moss"
          }
        >
          <Icon aria-hidden="true" className="h-5 w-5" />
        </span>
        <span
          className={
            tone === "dark"
              ? "rounded-full border border-white/12 px-3 py-1 text-xs font-semibold text-white/62"
              : "rounded-full border border-line bg-surface px-3 py-1 text-xs font-semibold text-ink/56"
          }
        >
          {status}
        </span>
      </div>
      <div className="mt-7">
        <p
          className={
            tone === "dark"
              ? "text-xs font-semibold text-[#d7b56d]"
              : "text-xs font-semibold text-lychee"
          }
        >
          {tag}
        </p>
        <h3
          className={
            tone === "dark"
              ? "mt-2 text-2xl font-extrabold leading-tight text-white"
              : "mt-2 text-2xl font-extrabold leading-tight text-ink"
          }
        >
          {title}
        </h3>
        <p
          className={
            tone === "dark"
              ? "mt-3 text-sm leading-6 text-white/62"
              : "mt-3 text-sm leading-6 text-ink/62"
          }
        >
          {body}
        </p>
      </div>
      {href ? (
        <span
          className={
            tone === "dark"
              ? "mt-8 inline-flex items-center gap-2 text-sm font-bold text-white"
              : "mt-8 inline-flex items-center gap-2 text-sm font-bold text-water"
          }
        >
          <span>进入模块</span>
          <ArrowUpRight aria-hidden="true" className="h-4 w-4" />
        </span>
      ) : null}
    </>
  )

  const className =
    tone === "dark"
      ? "group flex min-h-[320px] flex-col justify-between rounded-xl border border-white/10 bg-canopy p-6 shadow-panel transition hover:-translate-y-0.5 motion-reduce:hover:translate-y-0"
      : "group flex min-h-[320px] flex-col justify-between rounded-xl border border-line/75 bg-surface p-6 shadow-soft transition hover:-translate-y-0.5 motion-reduce:hover:translate-y-0"

  if (!href) {
    return <article className={className}>{content}</article>
  }

  return (
    <Link className={className} href={href}>
      {content}
    </Link>
  )
}
