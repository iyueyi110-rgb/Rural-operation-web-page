import Link from "next/link"
import { MoveRight, UserRound } from "lucide-react"
import { getTranslations } from "next-intl/server"

import { HomeMoreMenu } from "@web/components/home-more-menu"
import { HomeMobileMenu } from "@web/components/home-mobile-menu"
import type { Locale } from "@web/i18n/routing"
import { buildExploreHref } from "@web/lib/home-navigation"
import { Section } from "@ui/index"

export async function HomeHeader({ locale }: { locale: Locale }) {
  const t = await getTranslations({ locale, namespace: "home" })
  const coreNavItems = [
    { href: buildExploreHref(locale, "realms"), label: t("nav.realms") },
    { href: `/${locale}/routes`, label: t("nav.routes") },
    { href: `/${locale}/booking`, label: t("nav.booking") },
    { href: `/${locale}/trees`, label: t("nav.adoption") },
  ]
  const moreNavItems = [
    { href: `/${locale}/tickets`, label: t("quickActions.tickets") },
    { href: `/${locale}/products`, label: t("nav.products") },
    { href: `/${locale}/calendar`, label: t("nav.calendar") },
    { href: `/${locale}/activities`, label: t("nav.activities") },
    { href: buildExploreHref(locale, "weather"), label: t("nav.weather") },
  ]
  const accountItems = [
    { href: `/${locale}/me`, label: t("quickActions.me") },
    { href: `/${locale}/villager/login`, label: t("quickActions.villager") },
    { href: `/${locale}/privacy`, label: t("quickActions.privacy") },
  ]
  const mobileItems = [...coreNavItems, ...moreNavItems, ...accountItems]

  return (
    <header className="fixed left-0 right-0 top-0 z-40 border-b border-white/10 bg-ink/75 text-white backdrop-blur-xl">
      <Section className="flex h-16 items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-4">
          <Link
            aria-label={t("nav.homeAria")}
            className="flex shrink-0 items-center gap-3"
            href={`/${locale}#top`}
          >
            <span className="grid h-9 w-9 place-items-center rounded-md bg-lychee text-sm font-extrabold">
              {t("nav.mark")}
            </span>
            <span className="text-sm font-semibold tracking-normal">
              {t("nav.brand")}
            </span>
          </Link>
          <div className="hidden items-center gap-3 text-xs font-semibold text-white/62 md:flex">
            <Link className="transition hover:text-white" href={`/${locale}/me`}>
              {t("quickActions.me")}
            </Link>
            <span aria-hidden="true" className="h-3 w-px bg-white/18" />
            <Link
              className="transition hover:text-white"
              href={`/${locale}/villager/login`}
            >
              {t("quickActions.villager")}
            </Link>
            <span aria-hidden="true" className="h-3 w-px bg-white/18" />
            <Link
              className="transition hover:text-white"
              href={`/${locale}/privacy`}
            >
              {t("quickActions.privacy")}
            </Link>
          </div>
        </div>

        <nav
          aria-label={t("nav.aria")}
          className="hidden items-center gap-5 text-sm text-white/78 md:flex"
        >
          {coreNavItems.map((item) => (
            <Link
              className="transition hover:text-white"
              href={item.href}
              key={item.href}
            >
              {item.label}
            </Link>
          ))}
          <HomeMoreMenu items={moreNavItems} label={t("nav.more")} />
        </nav>

        <div className="flex items-center gap-2">
          <Link
            className="inline-flex h-10 items-center gap-2 rounded-full border border-white/18 px-3 text-sm font-semibold text-white transition hover:bg-white/10 sm:px-4"
            href={`/${locale}#top`}
          >
            <UserRound aria-hidden="true" className="h-4 w-4" />
            {t("nav.login")}
          </Link>
          <Link
            className="hidden h-10 items-center gap-2 rounded-full bg-white px-4 text-sm font-semibold text-ink transition hover:bg-rice sm:inline-flex"
            href={buildExploreHref(locale)}
          >
            {t("nav.start")}
            <MoveRight aria-hidden="true" className="h-4 w-4" />
          </Link>
          <HomeMobileMenu
            closeLabel={t("nav.closeMenu")}
            items={mobileItems}
            menuLabel={t("nav.menu")}
          />
        </div>
      </Section>
    </header>
  )
}
