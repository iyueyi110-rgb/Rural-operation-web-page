import type { Locale } from "@web/i18n/routing"
import { getVillagerPageMetadata } from "@web/lib/villager-page-metadata"

import { VillagerNotificationsClient } from "./villager-notifications-client"

export function generateMetadata({ params }: { params: { locale: Locale } }) {
  return getVillagerPageMetadata(params.locale, "notifications")
}

export default function VillagerNotificationsPage() {
  return <VillagerNotificationsClient />
}
