"use client"

import { RefreshCw } from "lucide-react"
import type { ReactNode } from "react"

interface DashboardModuleCardProps {
  title: string
  icon: ReactNode
  loading: boolean
  onRefresh: () => void
  children: ReactNode
}

export function DashboardModuleCard({
  title,
  icon,
  loading,
  onRefresh,
  children,
}: DashboardModuleCardProps) {
  return (
    <section className="relative min-w-0 overflow-hidden rounded-xl border border-white/10 bg-[#14211d] p-5 text-white shadow-panel">
      <div className="admin-console-grid pointer-events-none absolute inset-0 opacity-40" />
      <div className="relative flex items-center justify-between gap-4 pr-16">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#d7b56d]/10 text-[#d7b56d]">
            {icon}
          </span>
          <h2 className="truncate text-base font-extrabold tracking-wide">
            {title}
          </h2>
        </div>
        <span
          aria-label="模块在线"
          className="absolute right-10 h-2 w-2 rounded-full bg-[#d7b56d]"
          role="status"
        />
        <button
          aria-label={`刷新${title}`}
          className="absolute right-0 flex h-8 w-8 items-center justify-center rounded-full bg-white/6 text-white/55 transition hover:bg-white/12 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-white/70 disabled:cursor-wait disabled:opacity-40"
          disabled={loading}
          onClick={onRefresh}
          type="button"
        >
          <RefreshCw
            aria-hidden="true"
            className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
          />
        </button>
      </div>

      <div
        className={`relative mt-5 transition-opacity ${loading ? "opacity-55" : "opacity-100"}`}
      >
        {children}
      </div>
    </section>
  )
}
