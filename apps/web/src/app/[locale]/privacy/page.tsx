import type { Metadata } from "next"
import { ArrowLeft, ShieldCheck } from "lucide-react"
import { getTranslations, setRequestLocale } from "next-intl/server"

import type { Locale } from "@web/i18n/routing"
import { BackButton } from "@web/components/back-button"
import { SubpageHero } from "@web/components/subpage-ui"
import { getSiteUrl } from "@web/lib/site-url"
import { consentItems } from "@web/lib/privacy-data"
import { PageHeader, Section } from "@ui/index"
import { PrivacyConsentsClient } from "./privacy-consents-client"

export async function generateMetadata({
  params,
}: {
  params: { locale: Locale }
}): Promise<Metadata> {
  const t = await getTranslations({
    locale: params.locale,
    namespace: "metadata.privacy",
  })

  return {
    metadataBase: getSiteUrl(),
    title: t("title"),
    description: t("description"),
  }
}

export default async function PrivacyPage({
  params,
}: {
  params: { locale: Locale }
}) {
  setRequestLocale(params.locale)
  const t = await getTranslations("privacy")
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
        icon={<ShieldCheck aria-hidden="true" className="h-4 w-4" />}
        title={t("hero.title")}
      />
      <Section>
        <PrivacyConsentsClient
          labels={Object.fromEntries(
            consentItems.map((item) => [
              item.id,
              { title: t(item.titleKey), body: t(item.bodyKey) },
            ]),
          )}
        />
      </Section>
    </main>
  )
}
