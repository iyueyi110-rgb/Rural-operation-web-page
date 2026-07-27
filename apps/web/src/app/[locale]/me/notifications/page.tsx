import type { Metadata } from "next"
import { getTranslations } from "next-intl/server"

import type { Locale } from "@web/i18n/routing"

import { TouristNotificationCenter } from "./tourist-notification-center"

export async function generateMetadata({ params }: { params: { locale: Locale } }): Promise<Metadata> {
  const t = await getTranslations({ locale: params.locale, namespace: "villagerSystem.metadata.touristNotifications" })
  return { title: t("title"), description: t("description") }
}

export default function TouristNotificationsPage() {
  return <TouristNotificationCenter />
}
