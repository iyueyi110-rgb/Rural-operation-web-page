import type { Metadata } from "next"
import { getTranslations, setRequestLocale } from "next-intl/server"

import { FullscreenPageDeck } from "@web/components/fullscreen-page-deck"
import { HeroScreen } from "@web/components/hero-screen"
import { HomeAdoptionFeature } from "@web/components/home-adoption-feature"
import { HomeHeader } from "@web/components/home-header"
import { RealmMapGateway } from "@web/components/realm-map-gateway"
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
    namespace: "metadata.home",
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

export default async function HomePage({
  params,
}: {
  params: { locale: Locale }
}) {
  setRequestLocale(params.locale)
  const weather = await getWeatherSummary()

  return (
    <main className="overflow-hidden text-ink">
      <HomeHeader locale={params.locale} />
      <FullscreenPageDeck>
        <HeroScreen locale={params.locale} weather={weather} />
        <RealmMapGateway />
        <HomeAdoptionFeature locale={params.locale} />
      </FullscreenPageDeck>
    </main>
  )
}
