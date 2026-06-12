import type { ReactNode } from "react"

export function Section({
  children,
  id,
  className = "",
}: {
  children: ReactNode
  id?: string
  className?: string
}) {
  return (
    <section id={id} className={`mx-auto w-full max-w-7xl px-5 sm:px-8 ${className}`}>
      {children}
    </section>
  )
}
