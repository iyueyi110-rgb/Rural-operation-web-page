import type { Locale } from "@web/i18n/routing"
import { getVillagerPageMetadata } from "@web/lib/villager-page-metadata"

import { VillagerDashboardClient } from "./villager-dashboard-client"

export function generateMetadata({ params }: { params: { locale: Locale } }) {
  return getVillagerPageMetadata(params.locale, "dashboard")
}

export default function VillagerDashboardPage() {
  return <VillagerDashboardClient />
}
