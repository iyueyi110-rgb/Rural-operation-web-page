import type { Metadata } from "next"
import { ArrowLeft, ShieldCheck } from "lucide-react"
import { getTranslations, setRequestLocale } from "next-intl/server"

import type { Locale } from "@web/i18n/routing"
import { getSiteUrl } from "@web/lib/site-url"
import { consentItems } from "@web/lib/tickets-data"
import { PageHeader, Section } from "@ui/index"

export async function generateMetadata({ params }: { params: { locale: Locale } }): Promise<Metadata> {
  const t = await getTranslations({ locale: params.locale, namespace: "metadata.privacy" })

  return {
    metadataBase: getSiteUrl(),
    title: t("title"),
    description: t("description"),
  }
}

export default async function PrivacyPage({ params }: { params: { locale: Locale } }) {
  setRequestLocale(params.locale)
  const t = await getTranslations("privacy")

  return (
    <main className="min-h-screen bg-rice pb-16 text-ink">
      <PageHeader backHref={`/${params.locale}`} backLabel={t("nav.backHome")} icon={<ArrowLeft aria-hidden="true" className="h-4 w-4" />} rightLabel={t("nav.phase")} />
      <Section className="pt-12">
        <p className="flex items-center gap-2 text-sm font-bold uppercase tracking-[0.18em] text-water">
          <ShieldCheck aria-hidden="true" className="h-4 w-4" />
          {t("hero.eyebrow")}
        </p>
        <h1 className="mt-3 max-w-3xl break-all text-3xl font-extrabold leading-tight sm:text-5xl">{t("hero.title")}</h1>
        <p className="mt-5 max-w-3xl text-base leading-8 text-ink/68">{t("hero.body")}</p>

        <div className="mt-8 grid gap-4 lg:grid-cols-3">
          {consentItems.map((item) => (
            <article className="rounded-lg border border-stone bg-white p-5 shadow-soft" key={item.id}>
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-xl font-extrabold">{t(item.titleKey)}</h2>
                <span className="rounded-full border border-moss/20 bg-moss/10 px-3 py-1 text-xs font-bold text-moss">
                  {t(item.statusKey)}
                </span>
              </div>
              <p className="mt-4 text-sm leading-7 text-ink/66">{t(item.bodyKey)}</p>
            </article>
          ))}
        </div>
      </Section>
    </main>
  )
}
