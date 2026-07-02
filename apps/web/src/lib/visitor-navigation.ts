import type { Locale } from "@web/i18n/routing"

import { buildExploreHref } from "./home-navigation"

export interface VisitorNavLabels {
  tickets: string
  calendar: string
  activities: string
  routes: string
  booking: string
  realms: string
  adoption: string
  weather: string
  interactions: string
  me: string
  villager: string
  privacy: string
}

export interface VisitorNavItem {
  href: string
  label: string
}

export function buildVisitorNavItems(locale: Locale, labels: VisitorNavLabels) {
  const coreNavItems: VisitorNavItem[] = [
    { href: `/${locale}/tickets`, label: labels.tickets },
    { href: `/${locale}/calendar`, label: labels.calendar },
    { href: `/${locale}/activities`, label: labels.activities },
    { href: `/${locale}/routes`, label: labels.routes },
    { href: `/${locale}/booking`, label: labels.booking },
  ]
  const moreNavItems: VisitorNavItem[] = [
    { href: buildExploreHref(locale, "realms"), label: labels.realms },
    { href: `/${locale}/trees`, label: labels.adoption },
    { href: buildExploreHref(locale, "weather"), label: labels.weather },
    { href: `/${locale}/me/interactions`, label: labels.interactions },
  ]
  const accountItems: VisitorNavItem[] = [
    { href: `/${locale}/me`, label: labels.me },
    { href: `/${locale}/villager/login`, label: labels.villager },
    { href: `/${locale}/privacy`, label: labels.privacy },
  ]

  return {
    accountItems,
    coreNavItems,
    mobileItems: [...coreNavItems, ...moreNavItems, ...accountItems],
    moreNavItems,
  }
}
