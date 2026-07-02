import type { Metadata } from "next"
import { ArrowLeft, Clock, MapPin } from "lucide-react"
import { getTranslations, setRequestLocale } from "next-intl/server"

import { RouteGenerator } from "./route-generator"
import { BackButton } from "@web/components/back-button"
import { VisitorHeaderActions } from "@web/components/visitor-header-actions"
import { HeroMeta, SubpageHero } from "@web/components/subpage-ui"
import { getSiteUrl } from "@web/lib/site-url"
import type { Locale } from "@web/i18n/routing"
import { PageHeader, Section } from "@ui/index"

export async function generateMetadata({
  params,
}: {
  params: { locale: Locale }
}): Promise<Metadata> {
  const t = await getTranslations({
    locale: params.locale,
    namespace: "metadata.routes",
  })

  return {
    metadataBase: getSiteUrl(),
    title: t("title"),
    description: t("description"),
    openGraph: {
      title: t("title"),
      description: t("description"),
      images: ["/images/routes/zouma-route-scope-clean.png"],
    },
  }
}

export default async function RoutesPage({
  params,
}: {
  params: { locale: Locale }
}) {
  setRequestLocale(params.locale)
  const t = await getTranslations("routes")
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
        rightElement={
          <VisitorHeaderActions
            locale={params.locale}
            rightLabel={t("nav.phase")}
          />
        }
      />

      <SubpageHero
        body={t("hero.body")}
        eyebrow={t("hero.eyebrow")}
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
        <RouteGenerator locale={params.locale} />
      </Section>
    </main>
  )
}
