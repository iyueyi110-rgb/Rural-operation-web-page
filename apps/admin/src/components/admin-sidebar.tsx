"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  ClipboardList,
  Cpu,
  FileText,
  Bell,
  Bot,
  BarChart3,
  CalendarDays,
  LayoutDashboard,
  Lightbulb,
  ListChecks,
  Map,
  MapPin,
  RadioTower,
  RefreshCw,
  Settings,
  ShoppingCart,
  Store,
  Sprout,
  Sunrise,
  Trees,
  Users,
  WandSparkles,
} from "lucide-react"
import type { ComponentType } from "react"

import { adminCopy } from "@admin/lib/admin-copy"

const menuIcons: Record<string, ComponentType<{ className?: string }>> = {
  dashboard: LayoutDashboard,
  recommendations: Lightbulb,
  map: Map,
  feedback: ClipboardList,
  nodes: MapPin,
  orders: ShoppingCart,
  trees: Trees,
  harvest: Sprout,
  activities: CalendarDays,
  alerts: Bell,
  analytics: BarChart3,
  villagers: Users,
  farming: Sunrise,
  tasks: ListChecks,
  contentFactory: WandSparkles,
  aiAssistant: Bot,
  devices: RadioTower,
  products: Store,
  reports: FileText,
  infrastructure: Cpu,
  settings: Settings,
}

const menuHrefs: Record<string, string> = {
  dashboard: "/dashboard",
  recommendations: "/admin/recommendations",
  map: "/map",
  feedback: "/feedback",
  nodes: "/nodes",
  orders: "/orders",
  trees: "/trees",
  harvest: "/harvest",
  activities: "/activities",
  alerts: "/alerts",
  analytics: "/analytics",
  villagers: "/villagers",
  farming: "/farming",
  tasks: "/tasks",
  contentFactory: "/content-factory",
  aiAssistant: "/ai-assistant",
  devices: "/devices",
  products: "/products",
  reports: "/reports",
  infrastructure: "/infrastructure",
  settings: "/settings",
}

export function AdminSidebar({ onRefresh }: { onRefresh?: () => void }) {
  const pathname = usePathname()

  return (
    <aside className="border-b border-white/10 bg-[#111b18] p-4 text-white lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col lg:border-b-0 lg:border-r lg:p-5">
      <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.045] p-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-lychee text-lg font-extrabold shadow-[0_10px_24px_rgba(185,56,53,0.26)]">走</div>
        <div className="min-w-0">
          <div className="truncate text-sm font-extrabold">{adminCopy.shell.brand}</div>
          <div className="text-xs font-semibold text-white/52">{adminCopy.shell.subtitle}</div>
        </div>
      </div>

      <nav className="mt-5 grid gap-1.5 lg:min-h-0 lg:flex-1 lg:overflow-y-auto lg:pr-1">
        {adminCopy.menu.map((item) => {
          const Icon = menuIcons[item.key]
          const href = menuHrefs[item.key]
          const isActive =
            item.key === "dashboard" ? pathname === "/" || pathname === href : pathname.startsWith(href)

          return (
            <Link
              className={
                isActive
                  ? "flex h-10 items-center justify-between rounded-lg bg-white px-3 text-sm font-bold text-ink"
                  : "flex h-10 items-center justify-between rounded-lg px-3 text-sm font-semibold text-white/58 transition hover:bg-white/8 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-white/70"
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
