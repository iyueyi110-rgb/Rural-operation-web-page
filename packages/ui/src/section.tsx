import type { ReactNode } from "react"

type SectionBackground = "none" | "rice" | "white" | "ink"

const backgroundClasses: Record<SectionBackground, string> = {
  none: "",
  rice: "bg-rice",
  white: "bg-white",
  ink: "bg-ink text-white",
}

export function Section({
  children,
  id,
  className = "",
  background = "none",
}: {
  children: ReactNode
  id?: string
  className?: string
  background?: SectionBackground
}) {
  return (
    <section
      id={id}
      className={`mx-auto w-full max-w-7xl px-5 sm:px-8 ${backgroundClasses[background]} ${className}`}
    >
      {children}
    </section>
  )
}
