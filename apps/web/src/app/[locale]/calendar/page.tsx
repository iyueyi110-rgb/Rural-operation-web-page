import type { Metadata } from "next"
import { ArrowLeft, CalendarDays, Clock, MapPin } from "lucide-react"
import { getTranslations, setRequestLocale } from "next-intl/server"

import type { Locale } from "@web/i18n/routing"
import { getSiteUrl } from "@web/lib/site-url"
import { PageHeader, Section } from "@ui/index"
import { FarmingCalendar } from "./farming-calendar"

export async function generateMetadata({ params }: { params: { locale: Locale } }): Promise<Metadata> {
  const t = await getTranslations({ locale: params.locale, namespace: "metadata.calendar" })

  return {
    metadataBase: getSiteUrl(),
    title: t("title"),
    description: t("description"),
  }
}

export default async function CalendarPage({ params }: { params: { locale: Locale } }) {
  setRequestLocale(params.locale)
  const t = await getTranslations("calendar")

  return (
    <main className="min-h-screen bg-rice pb-16 text-ink">
      <PageHeader backHref={`/${params.locale}`} backLabel={t("nav.backHome")} icon={<ArrowLeft aria-hidden="true" className="h-4 w-4" />} rightLabel={t("nav.phase")} />
      <Section className="pt-12">
        <p className="flex items-center gap-2 text-sm font-bold uppercase tracking-[0.18em] text-water">
          <CalendarDays aria-hidden="true" className="h-4 w-4" />
          {t("hero.eyebrow")}
        </p>
        <h1 className="mt-3 max-w-3xl break-words text-3xl font-extrabold leading-tight sm:text-5xl">{t("hero.title")}</h1>
        <p className="mt-5 max-w-3xl text-base leading-8 text-ink/68">{t("hero.body")}</p>
        <div className="mt-5 flex flex-wrap items-center gap-3 text-xs font-semibold text-ink/45">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/60 px-3 py-1.5">
            <Clock aria-hidden="true" className="h-3 w-3" />
            {t("hero.summaryTime")}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/60 px-3 py-1.5">
            <MapPin aria-hidden="true" className="h-3 w-3" />
            {t("hero.summaryLocation")}
          </span>
        </div>

        <div className="mt-8">
          <FarmingCalendar />
        </div>
      </Section>
    </main>
  )
}
