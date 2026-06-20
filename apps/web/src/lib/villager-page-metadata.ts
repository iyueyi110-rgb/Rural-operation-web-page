import "server-only"

import type { Metadata } from "next"
import { getTranslations } from "next-intl/server"

import type { Locale } from "@web/i18n/routing"

export async function getVillagerPageMetadata(
  locale: Locale,
  page: "login" | "dashboard" | "tasks" | "earnings" | "notifications",
): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: "villagerSystem.metadata" })
  return {
    title: t(`${page}.title`),
    description: t(`${page}.description`),
  }
}
