import type { Metadata } from "next"
import { ArrowLeft, Sprout } from "lucide-react"
import { getTranslations, setRequestLocale } from "next-intl/server"

import { BackButton } from "@web/components/back-button"
import { InteractionDashboard } from "@web/components/interactions/interaction-dashboard"
import { SubpageHero } from "@web/components/subpage-ui"
import { VisitorHeaderActions } from "@web/components/visitor-header-actions"
import type { Locale } from "@web/i18n/routing"
import { getSiteUrl } from "@web/lib/site-url"
import { PageHeader, Section } from "@ui/index"

export async function generateMetadata({
  params,
}: {
  params: { locale: Locale }
}): Promise<Metadata> {
  const t = await getTranslations({
    locale: params.locale,
    namespace: "villagerSystem.interactions.dashboard",
  })

  return {
    metadataBase: getSiteUrl(),
    title: t("metaTitle"),
    description: t("metaDescription"),
  }
}

export default async function InteractionsPage({
  params,
}: {
  params: { locale: Locale }
}) {
  setRequestLocale(params.locale)
  const t = await getTranslations("villagerSystem.interactions")
  const common = await getTranslations("common")

  return (
    <main className="min-h-screen bg-rice pb-16 text-ink">
      <PageHeader
        backElement={
          <BackButton
            fallbackHref={`/${params.locale}/me`}
            label={common("back")}
          />
        }
        backHref={`/${params.locale}/me`}
        backLabel={common("back")}
        icon={<ArrowLeft aria-hidden="true" className="h-4 w-4" />}
        rightElement={
          <VisitorHeaderActions
            locale={params.locale}
            rightLabel={t("dashboard.phase")}
          />
        }
      />
      <SubpageHero
        body={t("dashboard.body")}
        eyebrow={t("eyebrow")}
        icon={<Sprout aria-hidden="true" className="h-4 w-4" />}
        title={t("dashboard.title")}
      />
      <Section className="pt-9">
        <InteractionDashboard />
      </Section>
    </main>
  )
}
