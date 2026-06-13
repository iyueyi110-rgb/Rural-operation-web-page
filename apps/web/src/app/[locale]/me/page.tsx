import type { Metadata } from "next"
import { ArrowLeft, UserRound } from "lucide-react"
import { getTranslations, setRequestLocale } from "next-intl/server"

import type { Locale } from "@web/i18n/routing"
import { getSiteUrl } from "@web/lib/site-url"
import { memberOrders } from "@web/lib/me-data"
import { PageHeader, Section } from "@ui/index"
import { AdoptionLookup } from "./adoption-lookup"

export async function generateMetadata({ params }: { params: { locale: Locale } }): Promise<Metadata> {
  const t = await getTranslations({ locale: params.locale, namespace: "metadata.me" })

  return {
    metadataBase: getSiteUrl(),
    title: t("title"),
    description: t("description"),
  }
}

export default async function MePage({ params }: { params: { locale: Locale } }) {
  setRequestLocale(params.locale)
  const t = await getTranslations("me")

  return (
    <main className="min-h-screen bg-rice pb-16 text-ink">
      <PageHeader backHref={`/${params.locale}`} backLabel={t("nav.backHome")} icon={<ArrowLeft aria-hidden="true" className="h-4 w-4" />} rightLabel={t("nav.phase")} />
      <Section className="pt-12">
        <p className="flex items-center gap-2 text-sm font-bold uppercase tracking-[0.18em] text-water">
          <UserRound aria-hidden="true" className="h-4 w-4" />
          {t("hero.eyebrow")}
        </p>
        <h1 className="mt-3 max-w-3xl break-all text-3xl font-extrabold leading-tight sm:text-5xl">{t("hero.title")}</h1>
        <p className="mt-5 max-w-3xl text-base leading-8 text-ink/68">{t("hero.body")}</p>

        <div className="mt-8 grid gap-4">
          {memberOrders.map((order) => (
            <article className="grid gap-3 rounded-lg border border-stone bg-white p-5 shadow-soft md:grid-cols-[1fr_auto]" key={order.id}>
              <div>
                <div className="text-xs font-bold uppercase tracking-[0.16em] text-water">{t(order.typeKey)}</div>
                <h2 className="mt-2 text-xl font-extrabold">{t(order.titleKey)}</h2>
                <p className="mt-2 text-sm text-ink/58">{order.id}</p>
              </div>
              <div className="grid gap-2 text-sm md:text-right">
                <span className="font-bold text-moss">{t(order.statusKey)}</span>
                <span className="text-ink/58">{t(order.dateKey)}</span>
              </div>
            </article>
          ))}
        </div>
        <AdoptionLookup />
      </Section>
    </main>
  )
}
