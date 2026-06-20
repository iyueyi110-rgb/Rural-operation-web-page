import type { Locale } from "@web/i18n/routing"
import { getVillagerPageMetadata } from "@web/lib/villager-page-metadata"

import { VillagerTasksClient } from "./villager-tasks-client"

export function generateMetadata({ params }: { params: { locale: Locale } }) {
  return getVillagerPageMetadata(params.locale, "tasks")
}

export default function VillagerTasksPage() {
  return <VillagerTasksClient />
}
