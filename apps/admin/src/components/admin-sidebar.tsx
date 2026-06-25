"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { ChevronDown, RefreshCw } from "lucide-react"
import { useEffect, useMemo, useState } from "react"

import { adminCopy } from "@admin/lib/admin-copy"
import {
  adminNavGroups,
  getAdminNavGroup,
  getAdminNavItemsForGroup,
  isAdminNavItemActive,
  type AdminNavGroupKey,
} from "@admin/lib/admin-navigation"

const defaultOpenGroups: AdminNavGroupKey[] = ["command", "fieldOps"]

export function AdminSidebar({ onRefresh }: { onRefresh?: () => void }) {
  const pathname = usePathname()
  const activeGroup = getAdminNavGroup(pathname)
  const [openGroups, setOpenGroups] = useState<AdminNavGroupKey[]>(() => [
    ...defaultOpenGroups,
    activeGroup.key,
  ])

  useEffect(() => {
    setOpenGroups((current) => (current.includes(activeGroup.key) ? current : [...current, activeGroup.key]))
  }, [activeGroup.key])

  const mobileGroupItems = useMemo(
    () => adminNavGroups.map((group) => ({ group, items: getAdminNavItemsForGroup(group.key) })),
    [],
  )

  function toggleGroup(groupKey: AdminNavGroupKey) {
    setOpenGroups((current) =>
      current.includes(groupKey) && groupKey !== activeGroup.key
        ? current.filter((key) => key !== groupKey)
        : current.includes(groupKey)
          ? current
          : [...current, groupKey],
    )
  }

  return (
    <aside className="border-b border-white/10 bg-[#111b18] p-4 text-white lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col lg:border-b-0 lg:border-r lg:p-5">
      <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.045] p-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-lychee text-lg font-extrabold shadow-[0_10px_24px_rgba(185,56,53,0.26)]">走</div>
        <div className="min-w-0">
          <div className="truncate text-sm font-extrabold">{adminCopy.shell.brand}</div>
          <div className="text-xs font-semibold text-white/52">{adminCopy.shell.subtitle}</div>
        </div>
      </div>

      <div className="mt-4 grid gap-2 lg:hidden">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {mobileGroupItems.map(({ group }) => {
            const isActive = group.key === activeGroup.key

            return (
              <button
                className={
                  isActive
                    ? "shrink-0 rounded-full bg-white px-3 py-2 text-xs font-extrabold text-ink"
                    : "shrink-0 rounded-full border border-white/10 px-3 py-2 text-xs font-bold text-white/58 transition hover:bg-white/8 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-white/70"
                }
                key={group.key}
                onClick={() => toggleGroup(group.key)}
                type="button"
              >
                {group.label}
              </button>
            )
          })}
        </div>
        <div className="text-xs font-semibold text-white/46">{activeGroup.description}</div>
      </div>

      <nav className="mt-5 grid gap-3 lg:min-h-0 lg:flex-1 lg:overflow-y-auto lg:pr-1">
        {adminNavGroups.map((group) => {
          const isOpen = openGroups.includes(group.key)
          const items = getAdminNavItemsForGroup(group.key)
          const isGroupActive = group.key === activeGroup.key

          return (
            <section className="rounded-xl border border-white/8 bg-white/[0.025] p-2" key={group.key}>
              <button
                aria-expanded={isOpen}
                className="flex w-full items-center justify-between gap-3 rounded-lg px-2 py-2 text-left transition hover:bg-white/6 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white/70"
                onClick={() => toggleGroup(group.key)}
                type="button"
              >
                <span className="min-w-0">
                  <span className={isGroupActive ? "block text-xs font-extrabold text-white" : "block text-xs font-extrabold text-white/66"}>
                    {group.label}
                  </span>
                  <span className="mt-0.5 block truncate text-[11px] font-semibold text-white/38">{group.description}</span>
                </span>
                <ChevronDown
                  aria-hidden="true"
                  className={`h-4 w-4 shrink-0 text-white/42 transition ${isOpen ? "rotate-180" : ""}`}
                />
              </button>

              {isOpen ? (
                <div className="mt-1 grid gap-1">
                  {items.map((item) => {
                    const Icon = item.icon
                    const isActive = isAdminNavItemActive(pathname, item)

                    return (
                      <Link
                        className={
                          isActive
                            ? "flex min-h-10 items-center gap-2 rounded-lg bg-white px-3 py-2 text-sm font-bold text-ink"
                            : "flex min-h-10 items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-white/58 transition hover:bg-white/8 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-white/70"
                        }
                        href={item.href}
                        key={item.key}
                        title={item.description}
                      >
                        <Icon aria-hidden="true" className="h-4 w-4 shrink-0" />
                        <span className="min-w-0 truncate">{item.label}</span>
                      </Link>
                    )
                  })}
                </div>
              ) : null}
            </section>
          )
        })}
      </nav>

      {onRefresh ? (
        <button
          className="mt-5 flex h-10 w-full items-center justify-center gap-2 rounded-full border border-white/15 px-4 text-sm font-bold text-white/72 transition hover:border-white/30 hover:bg-white/8 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-white/70"
          onClick={onRefresh}
          type="button"
        >
          <RefreshCw aria-hidden="true" className="h-4 w-4" />
          {adminCopy.shell.refresh}
        </button>
      ) : null}
    </aside>
  )
}
