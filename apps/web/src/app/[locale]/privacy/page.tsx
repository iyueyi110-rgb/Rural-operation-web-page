import type { Metadata } from "next"
import { ArrowLeft, ShieldCheck } from "lucide-react"
import { getTranslations, setRequestLocale } from "next-intl/server"

import type { Locale } from "@web/i18n/routing"
import { BackButton } from "@web/components/back-button"
import { SubpageHero, SurfacePanel } from "@web/components/subpage-ui"
import { getSiteUrl } from "@web/lib/site-url"
import { consentItems } from "@web/lib/privacy-data"
import { PageHeader, Section } from "@ui/index"

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
        <div className="mt-8 grid gap-4 lg:grid-cols-3">
          {consentItems.map((item) => (
            <SurfacePanel key={item.id}>
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-xl font-extrabold">{t(item.titleKey)}</h2>
                <span className="rounded-full border border-moss/20 bg-moss/10 px-3 py-1 text-xs font-bold text-moss">
                  {t(item.statusKey)}
                </span>
              </div>
              <p className="mt-4 text-sm leading-7 text-ink/66">
                {t(item.bodyKey)}
              </p>
            </SurfacePanel>
          ))}
        </div>
      </Section>
    </main>
  )
}
