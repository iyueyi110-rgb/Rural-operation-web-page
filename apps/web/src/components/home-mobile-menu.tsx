"use client"

import Link from "next/link"
import { AnimatePresence, motion } from "framer-motion"
import { Menu, X } from "lucide-react"
import { useState } from "react"

interface MobileMenuItem {
  href: string
  label: string
}

export function HomeMobileMenu({
  closeLabel,
  items,
  menuLabel,
}: {
  closeLabel: string
  items: MobileMenuItem[]
  menuLabel: string
}) {
  const [open, setOpen] = useState(false)

  return (
    <div className="lg:hidden">
      <button
        aria-expanded={open}
        aria-label={menuLabel}
        className="grid h-10 w-10 place-items-center rounded-full border border-white/18 text-white transition hover:bg-white/10"
        onClick={() => setOpen(true)}
        type="button"
      >
        <Menu aria-hidden="true" className="h-5 w-5" />
      </button>

      <AnimatePresence>
        {open ? (
          <motion.div
            className="fixed inset-0 z-50 bg-ink/82 backdrop-blur-xl"
            exit={{ opacity: 0 }}
            initial={{ opacity: 0 }}
            onClick={() => setOpen(false)}
            transition={{ duration: 0.18 }}
          >
            <motion.div
              className="ml-auto flex h-full w-full max-w-sm flex-col border-l border-white/10 bg-ink p-5 text-white shadow-soft"
              exit={{ x: 24, opacity: 0 }}
              initial={{ x: 24, opacity: 0 }}
              onClick={(event) => event.stopPropagation()}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              animate={{ x: 0, opacity: 1 }}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-white/62">
                  {menuLabel}
                </span>
                <button
                  aria-label={closeLabel}
                  className="grid h-10 w-10 place-items-center rounded-full border border-white/14 text-white/72 transition hover:bg-white/10 hover:text-white"
                  onClick={() => setOpen(false)}
                  type="button"
                >
                  <X aria-hidden="true" className="h-5 w-5" />
                </button>
              </div>

              <nav className="mt-8 grid gap-2" aria-label={menuLabel}>
                {items.map((item) => (
                  <Link
                    className="rounded-lg border border-white/10 bg-white/[0.04] px-4 py-3 text-base font-semibold text-white/86 transition hover:bg-white/10"
                    href={item.href}
                    key={`${item.href}-${item.label}`}
                    onClick={() => setOpen(false)}
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  )
}
