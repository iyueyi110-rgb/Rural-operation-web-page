import type { Metadata } from "next"
import { ArrowLeft, UserRound } from "lucide-react"
import { getTranslations, setRequestLocale } from "next-intl/server"

import type { Locale } from "@web/i18n/routing"
import { BackButton } from "@web/components/back-button"
import { VisitorHeaderActions } from "@web/components/visitor-header-actions"
import {
  PanelTitle,
  SubpageHero,
  SurfacePanel,
} from "@web/components/subpage-ui"
import { getSiteUrl } from "@web/lib/site-url"
import { PageHeader, Section } from "@ui/index"
import { AdoptionLookup } from "./adoption-lookup"
import { MeDashboardClient } from "./me-dashboard-client"

export async function generateMetadata({
  params,
}: {
  params: { locale: Locale }
}): Promise<Metadata> {
  const t = await getTranslations({
    locale: params.locale,
    namespace: "metadata.me",
  })

  return {
    metadataBase: getSiteUrl(),
    title: t("title"),
    description: t("description"),
  }
}

export default async function MePage({
  params,
}: {
  params: { locale: Locale }
}) {
  setRequestLocale(params.locale)
  const t = await getTranslations("me")
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
        icon={<UserRound aria-hidden="true" className="h-4 w-4" />}
        title={t("hero.title")}
      />

      <Section>
        <SurfacePanel className="mt-8" tone="success">
          <PanelTitle tone="moss">{t("reminder.title")}</PanelTitle>
          <p className="mt-2 text-sm leading-7 text-ink/68">
            {t("reminder.body")}
          </p>
        </SurfacePanel>

        <MeDashboardClient />
        <AdoptionLookup />
      </Section>
    </main>
  )
}
