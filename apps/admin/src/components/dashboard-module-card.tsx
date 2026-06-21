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
    <section className="relative min-w-0 overflow-hidden rounded-xl bg-[#14211d] p-5 text-white shadow-[0_24px_70px_rgba(0,0,0,0.22)]">
      <div className="relative flex items-center justify-between gap-4 pr-16">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-300/10 text-emerald-300">
            {icon}
          </span>
          <h2 className="truncate text-base font-extrabold tracking-wide">
            {title}
          </h2>
        </div>
        <span
          aria-label="模块在线"
          className="absolute right-10 h-2 w-2 rounded-full bg-orange-300 shadow-[0_0_12px_rgba(253,186,116,0.72)]"
          role="status"
        />
        <button
          aria-label={`刷新${title}`}
          className="absolute right-0 flex h-8 w-8 items-center justify-center rounded-full bg-white/5 text-white/55 transition hover:bg-white/10 hover:text-white disabled:cursor-wait disabled:opacity-40"
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
