import type { Metadata } from "next"
import { ArrowLeft, MessageSquareText, ShieldCheck } from "lucide-react"
import { getTranslations, setRequestLocale } from "next-intl/server"

import { FeedbackForm } from "./feedback-form"
import type { Locale } from "@web/i18n/routing"
import { PanelTitle, SubpageHero, SurfacePanel } from "@web/components/subpage-ui"
import { getSiteUrl } from "@web/lib/site-url"
import { PageHeader, Section } from "@ui/index"

export async function generateMetadata({
  params,
}: {
  params: { locale: Locale }
}): Promise<Metadata> {
  const t = await getTranslations({ locale: params.locale, namespace: "metadata.feedback" })

  return {
    metadataBase: getSiteUrl(),
    title: t("title"),
    description: t("description"),
    openGraph: {
      title: t("title"),
      description: t("description"),
      images: ["/images/home/resilience-valley.webp"],
    },
  }
}

export default async function FeedbackPage({ params }: { params: { locale: Locale } }) {
  setRequestLocale(params.locale)
  const t = await getTranslations("feedback")

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
        icon={<MessageSquareText aria-hidden="true" className="h-4 w-4" />}
        title={t("hero.title")}
      />

      <Section className="pt-9">
        <FeedbackForm />
      </Section>
    </main>
  )
}
