import type { Metadata } from "next"
import { ArrowLeft, UserRound } from "lucide-react"
import { getTranslations, setRequestLocale } from "next-intl/server"

import type { Locale } from "@web/i18n/routing"
import { PanelTitle, SubpageHero, SurfacePanel } from "@web/components/subpage-ui"
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
      <SubpageHero
        body={t("hero.body")}
        eyebrow={t("hero.eyebrow")}
        icon={<UserRound aria-hidden="true" className="h-4 w-4" />}
        title={t("hero.title")}
      />

      <Section>
        <SurfacePanel className="mt-8" tone="success">
          <PanelTitle tone="moss">{t("reminder.title")}</PanelTitle>
          <p className="mt-2 text-sm leading-7 text-ink/68">{t("reminder.body")}</p>
        </SurfacePanel>

        <div className="mt-8 grid gap-4">
          {memberOrders.map((order) => (
            <article className="choice-card grid gap-3 md:grid-cols-[1fr_auto]" key={order.id}>
              <div>
                <div className="text-sm font-bold text-water">{t(order.typeKey)}</div>
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
