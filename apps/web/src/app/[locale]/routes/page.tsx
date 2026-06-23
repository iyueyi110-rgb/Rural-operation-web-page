import type { Metadata } from "next"
import { ArrowLeft, Clock, MapPin } from "lucide-react"
import { getTranslations, setRequestLocale } from "next-intl/server"

import { RouteGenerator } from "./route-generator"
import { getSiteUrl } from "@web/lib/site-url"
import type { Locale } from "@web/i18n/routing"
import { PageHeader, Section } from "@ui/index"

export async function generateMetadata({
  params,
}: {
  params: { locale: Locale }
}): Promise<Metadata> {
  const t = await getTranslations({ locale: params.locale, namespace: "metadata.routes" })

  return {
    metadataBase: getSiteUrl(),
    title: t("title"),
    description: t("description"),
    openGraph: {
      title: t("title"),
      description: t("description"),
      images: ["/images/routes/zouma-route-scope-user.jpg"],
    },
  }
}

export default async function RoutesPage({ params }: { params: { locale: Locale } }) {
  setRequestLocale(params.locale)
  const t = await getTranslations("routes")

  return (
    <main className="min-h-screen overflow-x-hidden bg-rice pb-16 text-ink">
      <PageHeader
        backHref={`/${params.locale}`}
        backLabel={t("nav.backHome")}
        icon={<ArrowLeft aria-hidden="true" className="h-4 w-4" />}
        rightLabel={t("nav.phase")}
      />

      <Section className="pt-12">
        <div className="max-w-3xl min-w-0">
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-lychee">{t("hero.eyebrow")}</p>
          <h1 className="mt-3 break-words text-3xl font-extrabold leading-tight tracking-normal sm:text-5xl">
            {t("hero.title")}
          </h1>
          <p className="mt-5 break-words text-base leading-8 text-ink/68">{t("hero.body")}</p>
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
        </div>
      </Section>

      <Section className="pt-9">
        <RouteGenerator locale={params.locale} />
      </Section>
    </main>
  )
}
