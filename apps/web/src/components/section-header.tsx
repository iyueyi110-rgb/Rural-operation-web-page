import type { ReactNode } from "react"

export function SectionHeader({
  title,
  body,
  kicker,
  align = "left",
  children,
}: {
  title: string
  body?: string
  kicker?: string
  align?: "left" | "center"
  children?: ReactNode
}) {
  return (
    <div
      className={
        align === "center"
          ? "mx-auto max-w-3xl text-center"
          : "max-w-3xl text-left"
      }
    >
      {kicker ? (
        <p className="text-sm font-semibold text-lychee">{kicker}</p>
      ) : null}
      <h2 className="hero-serif mt-3 text-3xl font-semibold leading-tight text-ink text-balance sm:text-5xl">
        {title}
      </h2>
      {body ? (
        <p className="mt-4 max-w-2xl text-sm leading-7 text-ink/66 sm:text-base">
          {body}
        </p>
      ) : null}
      {children}
    </div>
  )
}
