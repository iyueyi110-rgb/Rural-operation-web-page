import type { Metadata } from "next"
import { ArrowLeft, ShieldCheck } from "lucide-react"
import { getTranslations, setRequestLocale } from "next-intl/server"

import { BookingFlow } from "./booking-flow"
import { PanelTitle, SubpageHero, SurfacePanel } from "@web/components/subpage-ui"
import { getSiteUrl } from "@web/lib/site-url"
import type { Locale } from "@web/i18n/routing"
import { PageHeader, Section } from "@ui/index"

export async function generateMetadata({
  params,
}: {
  params: { locale: Locale }
}): Promise<Metadata> {
  const t = await getTranslations({ locale: params.locale, namespace: "metadata.booking" })

  return {
    metadataBase: getSiteUrl(),
    title: t("title"),
    description: t("description"),
    openGraph: {
      title: t("title"),
      description: t("description"),
      images: ["/images/home/courtyard-booking-generated.webp"],
    },
  }
}

export default async function BookingPage({ params }: { params: { locale: Locale } }) {
  setRequestLocale(params.locale)
  const t = await getTranslations("booking")

  return (
    <main className="min-h-screen overflow-x-hidden bg-rice pb-16 text-ink">
      <PageHeader
        backHref={`/${params.locale}`}
        backLabel={t("nav.backHome")}
        icon={<ArrowLeft aria-hidden="true" className="h-4 w-4" />}
        rightLabel={t("nav.phase")}
      />

      <SubpageHero
        aside={
          <SurfacePanel>
            <PanelTitle icon={<ShieldCheck aria-hidden="true" className="h-4 w-4" />} tone="moss">
              {t("guardrail.title")}
            </PanelTitle>
            <p className="mt-3 break-words text-sm leading-6 text-ink/68">{t("guardrail.body")}</p>
          </SurfacePanel>
        }
        body={t("hero.body")}
        eyebrow={t("hero.eyebrow")}
        title={t("hero.title")}
      />

      <Section className="pt-9">
        <BookingFlow />
      </Section>
    </main>
  )
}
