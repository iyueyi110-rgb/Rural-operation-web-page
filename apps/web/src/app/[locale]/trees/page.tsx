import type { Metadata } from "next"
import { ArrowLeft, MapPinned, ShieldCheck } from "lucide-react"
import { getTranslations, setRequestLocale } from "next-intl/server"

import { AdoptionFlow } from "./adoption-flow"
import { BackButton } from "@web/components/back-button"
import type { Locale } from "@web/i18n/routing"
import {
  PanelTitle,
  SubpageHero,
  SurfacePanel,
} from "@web/components/subpage-ui"
import { getSiteUrl } from "@web/lib/site-url"
import { listTreeProfiles } from "@web/lib/tree-records"
import { PageHeader, Section } from "@ui/index"

export async function generateMetadata({
  params,
}: {
  params: { locale: Locale }
}): Promise<Metadata> {
  const t = await getTranslations({
    locale: params.locale,
    namespace: "metadata.trees",
  })

  return {
    metadataBase: getSiteUrl(),
    title: t("title"),
    description: t("description"),
    openGraph: {
      title: t("title"),
      description: t("description"),
      images: ["/images/trees/lz018.webp"],
    },
  }
}

export default async function TreesPage({
  params,
}: {
  params: { locale: Locale }
}) {
  setRequestLocale(params.locale)
  const t = await getTranslations("trees")
  const common = await getTranslations("common")
  const trees = await listTreeProfiles()

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
          <div className="grid gap-3">
            <SurfacePanel>
              <PanelTitle
                icon={<MapPinned aria-hidden="true" className="h-4 w-4" />}
                tone="moss"
              >
                {t("guardrail.locationTitle")}
              </PanelTitle>
              <p className="mt-3 break-words text-sm leading-6 text-ink/68">
                {t("guardrail.locationBody")}
              </p>
            </SurfacePanel>
            <SurfacePanel>
              <PanelTitle
                icon={<ShieldCheck aria-hidden="true" className="h-4 w-4" />}
              >
                {t("guardrail.paymentTitle")}
              </PanelTitle>
              <p className="mt-3 break-words text-sm leading-6 text-ink/68">
                {t("guardrail.paymentBody")}
              </p>
            </SurfacePanel>
          </div>
        }
        body={t("hero.body")}
        eyebrow={t("hero.eyebrow")}
        title={t("hero.title")}
      />

      <Section className="pt-9">
        <AdoptionFlow trees={trees} />
      </Section>
    </main>
  )
}
