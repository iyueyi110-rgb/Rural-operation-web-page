"use client"

import { Bell, ClipboardList, LayoutDashboard, LogOut, WalletCards } from "lucide-react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useLocale, useTranslations } from "next-intl"
import { useEffect, useState, type ReactNode } from "react"

import {
  clearVillagerToken,
  fetchWithVillagerAuth,
  getVillagerSession,
} from "@web/lib/villager-auth-client"

const tabs = [
  { key: "dashboard", href: "dashboard", icon: LayoutDashboard },
  { key: "tasks", href: "tasks", icon: ClipboardList },
  { key: "earnings", href: "earnings", icon: WalletCards },
  { key: "notifications", href: "notifications", icon: Bell },
] as const

export default function VillagerLayout({ children }: { children: ReactNode }) {
  const t = useTranslations("villagerSystem")
  const locale = useLocale()
  const pathname = usePathname()
  const router = useRouter()
  const isLogin = pathname.endsWith("/villager/login")
  const [validatedVillagerId, setValidatedVillagerId] = useState<string | null>(null)

  useEffect(() => {
    if (isLogin) {
      setValidatedVillagerId(null)
      return
    }
    const session = getVillagerSession()
    if (!session) {
      clearVillagerToken()
      router.replace(`/${locale}/villager/login`)
      return
    }

    let cancelled = false
    setValidatedVillagerId(null)
    void fetchWithVillagerAuth("/api/v1/villager/me")
      .then((response) => {
        if (cancelled) return
        if (!response.ok) {
          clearVillagerToken()
          router.replace(`/${locale}/villager/login`)
          return
        }
        setValidatedVillagerId(session.id)
      })
      .catch(() => {
        if (!cancelled) setValidatedVillagerId(session.id)
      })
    return () => {
      cancelled = true
    }
  }, [isLogin, locale, router])

  if (isLogin) return children
  if (!validatedVillagerId) {
    return <main className="min-h-screen bg-rice p-6 text-ink">{t("common.loading")}</main>
  }

  return (
    <div className="min-h-screen bg-rice pb-24 text-ink">
      {children}
      <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-stone bg-white/95 backdrop-blur-xl">
        <div className="mx-auto flex max-w-2xl items-center justify-around px-2 py-2">
          {tabs.map((tab) => {
            const href = `/${locale}/villager/${tab.href}`
            const active = pathname === href
            const Icon = tab.icon
            return (
              <Link
                className={`flex min-w-16 flex-col items-center gap-1 rounded-md px-3 py-2 text-xs font-bold ${active ? "bg-moss/10 text-moss" : "text-ink/55"}`}
                href={href}
                key={tab.key}
              >
                <Icon aria-hidden="true" className="h-5 w-5" />
                {t(`nav.${tab.key}`)}
              </Link>
            )
          })}
          <button
            className="flex min-w-16 flex-col items-center gap-1 rounded-md px-3 py-2 text-xs font-bold text-ink/55"
            onClick={() => {
              clearVillagerToken()
              router.replace(`/${locale}/villager/login`)
            }}
            type="button"
          >
            <LogOut aria-hidden="true" className="h-5 w-5" />
            {t("nav.logout")}
          </button>
        </div>
      </nav>
    </div>
  )
}
