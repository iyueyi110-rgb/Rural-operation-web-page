"use client"

import { ArrowLeft } from "lucide-react"
import { useRouter } from "next/navigation"
import { useEffect, useRef, type ReactNode } from "react"

export function BackButton({
  fallbackHref,
  label,
  className,
  icon,
}: {
  fallbackHref: string
  label: string
  className?: string
  icon?: ReactNode
}) {
  const router = useRouter()
  const canGoBack = useRef(false)

  useEffect(() => {
    canGoBack.current = document.referrer !== "" || window.history.length > 2
  }, [])

  function handleBack() {
    if (canGoBack.current) {
      router.back()
    } else {
      router.push(fallbackHref)
    }
  }

  return (
    <button
      className={
        className ??
        "flex shrink-0 cursor-pointer items-center gap-2 rounded-full border-none bg-transparent px-2 py-1 text-sm font-semibold text-white/86 transition hover:bg-white/10 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
      }
      onClick={handleBack}
      type="button"
    >
      {icon ?? <ArrowLeft aria-hidden="true" className="h-4 w-4" />}
      {label}
    </button>
  )
}
