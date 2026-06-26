import type { Metadata } from "next"
import { ArrowLeft, CalendarDays, Clock, MapPin } from "lucide-react"
import { getTranslations, setRequestLocale } from "next-intl/server"

import type { Locale } from "@web/i18n/routing"
import { BackButton } from "@web/components/back-button"
import { HeroMeta, SubpageHero } from "@web/components/subpage-ui"
import { getSiteUrl } from "@web/lib/site-url"
import { PageHeader, Section } from "@ui/index"
import { FarmingCalendar } from "./farming-calendar"

export async function generateMetadata({
  params,
}: {
  params: { locale: Locale }
}): Promise<Metadata> {
  const t = await getTranslations({
    locale: params.locale,
    namespace: "metadata.calendar",
  })

  return {
    metadataBase: getSiteUrl(),
    title: t("title"),
    description: t("description"),
  }
}

export default async function CalendarPage({
  params,
}: {
  params: { locale: Locale }
}) {
  setRequestLocale(params.locale)
  const t = await getTranslations("calendar")
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
        body={t("hero.body")}
        eyebrow={t("hero.eyebrow")}
        icon={<CalendarDays aria-hidden="true" className="h-4 w-4" />}
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
      <Section>
        <div className="mt-8">
          <FarmingCalendar />
        </div>
      </Section>
    </main>
  )
}
