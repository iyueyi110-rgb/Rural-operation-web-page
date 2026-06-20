import type { Locale } from "@web/i18n/routing"
import { getVillagerPageMetadata } from "@web/lib/villager-page-metadata"

import { VillagerLoginClient } from "./villager-login-client"

export function generateMetadata({ params }: { params: { locale: Locale } }) {
  return getVillagerPageMetadata(params.locale, "login")
}

export default function VillagerLoginPage() {
  return <VillagerLoginClient />
}
