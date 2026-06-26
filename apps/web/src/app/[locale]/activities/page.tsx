import type { Metadata } from "next"
import { ArrowLeft, CalendarDays, Clock, MapPin, Sprout } from "lucide-react"
import { getTranslations, setRequestLocale } from "next-intl/server"

import { ActivitiesClient } from "./activities-client"
import { BackButton } from "@web/components/back-button"
import type { Locale } from "@web/i18n/routing"
import {
  HeroMeta,
  PanelTitle,
  SubpageHero,
  SurfacePanel,
} from "@web/components/subpage-ui"
import { getSiteUrl } from "@web/lib/site-url"
import { PageHeader, Section } from "@ui/index"

export async function generateMetadata({
  params,
}: {
  params: { locale: Locale }
}): Promise<Metadata> {
  const t = await getTranslations({
    locale: params.locale,
    namespace: "metadata.activities",
  })

  return {
    metadataBase: getSiteUrl(),
    title: t("title"),
    description: t("description"),
    openGraph: {
      title: t("title"),
      description: t("description"),
      images: ["/images/home/lychee-field.webp"],
    },
  }
}

export default async function ActivitiesPage({
  params,
}: {
  params: { locale: Locale }
}) {
  setRequestLocale(params.locale)
  const t = await getTranslations("activities")
  const common = await getTranslations("common")

  return (
    <main className="min-h-screen bg-rice pb-16 text-ink">
      <PageHeader
        backHref={`/${params.locale}`}
        backLabel={t("nav.backHome")}
        backElement={
          <BackButton
            fallbackHref={`/${params.locale}`}
            label={common("back")}
          />
        }
        icon={<ArrowLeft aria-hidden="true" className="h-4 w-4" />}
        rightLabel={t("nav.phase")}
      />

      <SubpageHero
        aside={
          <SurfacePanel className="overflow-hidden p-0">
            <div className="relative min-h-72 bg-ink text-white">
              <div className="absolute inset-0 bg-[url('/images/home/lychee-field.webp')] bg-cover bg-center opacity-85" />
              <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(25,32,27,0.08),rgba(25,32,27,0.78))]" />
              <div className="contour-field absolute inset-0 opacity-45" />
              <div className="absolute right-4 top-4 max-w-[13rem] rounded-lg border border-white/18 bg-ink/62 px-4 py-3 text-right shadow-[0_12px_28px_rgba(0,0,0,0.2)] backdrop-blur">
                <div className="text-xs font-bold text-white/56">
                  {t("showcase.label")}
                </div>
                <div className="mt-1 text-lg font-extrabold leading-6">
                  {t("showcase.name")}
                </div>
              </div>
              <div className="absolute bottom-5 left-5 right-5">
                <PanelTitle
                  icon={<CalendarDays aria-hidden="true" className="h-4 w-4" />}
                  tone="white"
                >
                  {t("showcase.date")}
                </PanelTitle>
                <p className="mt-3 max-w-md text-sm leading-6 text-white/78">
                  {t("showcase.body")}
                </p>
              </div>
            </div>
          </SurfacePanel>
        }
        body={t("hero.body")}
        eyebrow={t("hero.eyebrow")}
        icon={<Sprout aria-hidden="true" className="h-4 w-4" />}
        meta={
          <>
            <HeroMeta icon={<Clock aria-hidden="true" className="h-3 w-3" />}>
              {t("hero.summaryTime")}
            </HeroMeta>
            <HeroMeta icon={<MapPin aria-hidden="true" className="h-3 w-3" />}>
              {t("hero.summaryLocation")}
            </HeroMeta>
          </>
        }
        title={t("hero.title")}
      />

      <Section className="pt-9">
        <ActivitiesClient />
      </Section>
    </main>
  )
}
