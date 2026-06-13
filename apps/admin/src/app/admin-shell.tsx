"use client"

import { useRouter } from "next/navigation"
import { useState, type ReactNode } from "react"

import { AdminSidebar } from "@admin/components/admin-sidebar"

export function AdminShell({ children }: { children: ReactNode }) {
  const router = useRouter()
  const [refreshKey, setRefreshKey] = useState(0)

  function refresh() {
    setRefreshKey((current) => current + 1)
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-rice text-ink">
      <div className="grid min-h-screen lg:grid-cols-[260px_minmax(0,1fr)]">
        <AdminSidebar onRefresh={refresh} />
        <section className="min-w-0 p-4 sm:p-6" key={refreshKey}>
          {children}
        </section>
      </div>
    </div>
  )
}
