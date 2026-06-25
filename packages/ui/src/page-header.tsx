import Link from "next/link"
import type { ReactNode } from "react"

import { Section } from "./section"

export function PageHeader({
  backHref,
  backLabel,
  rightLabel,
  icon,
}: {
  backHref: string
  backLabel: string
  rightLabel?: string
  icon?: ReactNode
}) {
  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-ink/88 text-white backdrop-blur-xl">
      <Section className="flex h-16 items-center justify-between gap-4">
        <Link className="flex shrink-0 items-center gap-2 rounded-full px-2 py-1 text-sm font-semibold text-white/86 transition hover:bg-white/10 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2" href={backHref}>
          {icon}
          {backLabel}
        </Link>
        {rightLabel ? (
          <div className="min-w-0 truncate rounded-full border border-white/12 bg-white/8 px-3 py-1 text-right text-sm font-semibold text-white/72">
            {rightLabel}
          </div>
        ) : null}
      </Section>
    </header>
  )
}
