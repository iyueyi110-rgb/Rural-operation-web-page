import type { Metadata } from "next"
import { getTranslations, setRequestLocale } from "next-intl/server"

import { ExploreExperience } from "@web/components/explore-experience"
import { HomeHeader } from "@web/components/home-header"
import type { Locale } from "@web/i18n/routing"
import { getSiteUrl } from "@web/lib/site-url"
import { getWeatherSummary } from "@web/lib/weather"

export const dynamic = "force-dynamic"

export async function generateMetadata({
  params,
}: {
  params: { locale: string }
}): Promise<Metadata> {
  const t = await getTranslations({
    locale: params.locale,
    namespace: "metadata.explore",
  })

  return {
    metadataBase: getSiteUrl(),
    title: t("title"),
    description: t("description"),
    openGraph: {
      title: t("title"),
      description: t("description"),
      images: ["/images/home/hero-village.webp"],
    },
  }
}

export default async function ExplorePage({
  params,
}: {
  params: { locale: Locale }
}) {
  setRequestLocale(params.locale)
  const weather = await getWeatherSummary()

  return (
    <main className="overflow-hidden bg-rice pb-16 text-ink" id="top">
      <HomeHeader locale={params.locale} />
      <ExploreExperience locale={params.locale} weather={weather} />
    </main>
  )
}
