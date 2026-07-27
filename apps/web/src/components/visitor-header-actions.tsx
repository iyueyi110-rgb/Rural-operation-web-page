import { getTranslations } from "next-intl/server"

import { HomeMobileMenu } from "@web/components/home-mobile-menu"
import type { Locale } from "@web/i18n/routing"
import { buildVisitorNavItems } from "@web/lib/visitor-navigation"

export async function VisitorHeaderActions({
  locale,
  rightLabel,
}: {
  locale: Locale
  rightLabel?: string
}) {
  const t = await getTranslations({ locale, namespace: "home" })
  const { mobileItems } = buildVisitorNavItems(locale, {
    activities: t("nav.activities"),
    adoption: t("nav.adoption"),
    booking: t("nav.booking"),
    calendar: t("nav.calendar"),
    interactions: t("nav.interactions"),
    me: t("quickActions.me"),
    privacy: t("quickActions.privacy"),
    realms: t("nav.realms"),
    routes: t("nav.routes"),
    tickets: t("quickActions.tickets"),
    villager: t("quickActions.villager"),
    weather: t("nav.weather"),
  })

  return (
    <div className="flex min-w-0 shrink-0 items-center gap-2">
      {rightLabel ? (
        <div className="hidden min-w-0 max-w-[13rem] truncate rounded-full border border-white/12 bg-white/8 px-3 py-1 text-right text-sm font-semibold text-white/72 sm:block">
          {rightLabel}
        </div>
      ) : null}
      <HomeMobileMenu
        closeLabel={t("nav.closeMenu")}
        items={mobileItems}
        menuLabel={t("nav.menu")}
      />
    </div>
  )
}
