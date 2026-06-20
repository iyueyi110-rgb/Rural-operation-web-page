import type { Locale } from "@web/i18n/routing"
import { getVillagerPageMetadata } from "@web/lib/villager-page-metadata"

import { VillagerEarningsClient } from "./villager-earnings-client"

export function generateMetadata({ params }: { params: { locale: Locale } }) {
  return getVillagerPageMetadata(params.locale, "earnings")
}

export default function VillagerEarningsPage() {
  return <VillagerEarningsClient />
}
