"use client"

import Link from "next/link"
import { ChevronDown, Ticket } from "lucide-react"
import { useEffect, useRef, useState } from "react"

interface MoreMenuItem {
  href: string
  label: string
}

export function HomeMoreMenu({
  items,
  label,
}: {
  items: MoreMenuItem[]
  label: string
}) {
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return

    function closeOnOutsideClick(event: PointerEvent | MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false)
    }

    // pointerdown 统一处理鼠标和触摸，避免移动端 mousedown 时序问题
    document.addEventListener("pointerdown", closeOnOutsideClick)
    document.addEventListener("keydown", closeOnEscape)

    return () => {
      document.removeEventListener("pointerdown", closeOnOutsideClick)
      document.removeEventListener("keydown", closeOnEscape)
    }
  }, [open])

  return (
    <div className="relative" ref={menuRef}>
      <button
        aria-expanded={open}
        aria-haspopup="menu"
        className="inline-flex items-center gap-1.5 transition hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white/70"
        onClick={() => setOpen((current) => !current)}
        onPointerDown={(event) => event.stopPropagation()}
        type="button"
      >
        {label}
        <ChevronDown
          aria-hidden="true"
          className={`h-3.5 w-3.5 transition ${open ? "rotate-180" : ""}`}
        />
      </button>

      <div
        className={`absolute right-0 top-full z-50 min-w-44 pt-3 transition ${
          open
            ? "visible translate-y-0 opacity-100"
            : "invisible -translate-y-1 opacity-0"
        }`}
      >
        <div
          className="grid gap-1 rounded-lg border border-white/12 bg-ink/95 p-2 shadow-soft backdrop-blur-xl"
          role="menu"
        >
          {items.map((item) => (
            <Link
              className="rounded-md px-3 py-2 text-sm font-semibold text-white/72 transition hover:bg-white/10 hover:text-white focus-visible:bg-white/10 focus-visible:text-white focus-visible:outline-none"
              href={item.href}
              key={item.href}
              onClick={() => setOpen(false)}
              role="menuitem"
            >
              {item.href.includes("/tickets") ? (
                <Ticket aria-hidden="true" className="mr-2 inline h-3.5 w-3.5" />
              ) : null}
              {item.label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
