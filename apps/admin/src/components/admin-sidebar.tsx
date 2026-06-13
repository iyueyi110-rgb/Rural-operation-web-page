"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  ClipboardList,
  Cpu,
  FileText,
  LayoutDashboard,
  MapPin,
  RefreshCw,
  Settings,
  ShoppingCart,
  Sprout,
  Trees,
} from "lucide-react"
import type { ComponentType } from "react"

import { adminCopy } from "@admin/lib/admin-copy"

const menuIcons: Record<string, ComponentType<{ className?: string }>> = {
  dashboard: LayoutDashboard,
  feedback: ClipboardList,
  nodes: MapPin,
  orders: ShoppingCart,
  trees: Trees,
  harvest: Sprout,
  reports: FileText,
  infrastructure: Cpu,
  settings: Settings,
}

const menuHrefs: Record<string, string> = {
  dashboard: "/dashboard",
  feedback: "/feedback",
  nodes: "/nodes",
  orders: "/orders",
  trees: "/trees",
  harvest: "/harvest",
  reports: "/reports",
  infrastructure: "/infrastructure",
  settings: "/settings",
}

export function AdminSidebar({ onRefresh }: { onRefresh?: () => void }) {
  const pathname = usePathname()

  return (
    <aside className="border-b border-stone bg-ink p-4 text-white lg:border-b-0 lg:border-r lg:border-white/10">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-md bg-lychee text-lg font-extrabold">走</div>
        <div className="min-w-0">
          <div className="truncate text-sm font-extrabold">{adminCopy.shell.brand}</div>
          <div className="text-xs font-semibold text-white/52">{adminCopy.shell.subtitle}</div>
        </div>
      </div>

      <nav className="mt-6 grid gap-2">
        {adminCopy.menu.map((item) => {
          const Icon = menuIcons[item.key]
          const href = menuHrefs[item.key]
          const isActive =
            item.key === "dashboard" ? pathname === "/" || pathname === href : pathname.startsWith(href)

          return (
            <Link
              className={
                isActive
                  ? "flex h-11 items-center justify-between rounded-md bg-white px-3 text-sm font-bold text-ink"
                  : "flex h-11 items-center justify-between rounded-md px-3 text-sm font-semibold text-white/62 transition hover:bg-white/10 hover:text-white"
              }
              href={href}
              key={item.key}
            >
              <span className="flex items-center gap-2">
                <Icon aria-hidden="true" className="h-4 w-4" />
                {item.label}
              </span>
            </Link>
          )
        })}
      </nav>

      {onRefresh ? (
        <button
          className="mt-6 flex h-10 w-full items-center justify-center gap-2 rounded-full border border-white/15 px-4 text-sm font-bold text-white/72 transition hover:border-white/30 hover:text-white"
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
