import type { Metadata } from "next"
import { ArrowLeft, CalendarDays, CreditCard, Ticket } from "lucide-react"
import { getTranslations, setRequestLocale } from "next-intl/server"

import type { Locale } from "@web/i18n/routing"
import { getSiteUrl } from "@web/lib/site-url"
import { ticketProducts } from "@web/lib/tickets-data"
import { PageHeader, Section } from "@ui/index"

export async function generateMetadata({ params }: { params: { locale: Locale } }): Promise<Metadata> {
  const t = await getTranslations({ locale: params.locale, namespace: "metadata.tickets" })

  return {
    metadataBase: getSiteUrl(),
    title: t("title"),
    description: t("description"),
  }
}

export default async function TicketsPage({ params }: { params: { locale: Locale } }) {
  setRequestLocale(params.locale)
  const t = await getTranslations("tickets")

  return (
    <main className="min-h-screen bg-rice pb-16 text-ink">
      <PageHeader backHref={`/${params.locale}`} backLabel={t("nav.backHome")} icon={<ArrowLeft aria-hidden="true" className="h-4 w-4" />} rightLabel={t("nav.phase")} />
      <Section className="pt-12">
        <p className="flex items-center gap-2 text-sm font-bold uppercase tracking-[0.18em] text-water">
          <Ticket aria-hidden="true" className="h-4 w-4" />
          {t("hero.eyebrow")}
        </p>
        <h1 className="mt-3 max-w-3xl break-all text-3xl font-extrabold leading-tight sm:text-5xl">{t("hero.title")}</h1>
        <p className="mt-5 max-w-3xl text-base leading-8 text-ink/68">{t("hero.body")}</p>

        <div className="mt-8 grid gap-4 lg:grid-cols-3">
          {ticketProducts.map((product) => (
            <article className="rounded-lg border border-stone bg-white p-5 shadow-soft" key={product.id}>
              <div className="text-xs font-bold uppercase tracking-[0.16em] text-water">{t(product.sceneKey)}</div>
              <h2 className="mt-3 text-2xl font-extrabold">{t(product.nameKey)}</h2>
              <p className="mt-3 text-sm leading-7 text-ink/66">{t(product.summaryKey)}</p>
              <div className="mt-5 grid gap-3">
                <div className="rounded-md bg-rice p-3">
                  <div className="text-xl font-extrabold text-lychee">{t(product.priceKey)}</div>
                  <div className="mt-1 text-xs text-ink/52">{t("card.price")}</div>
                </div>
                <div className="rounded-md bg-rice p-3">
                  <div className="text-sm font-bold">{t(product.stockKey)}</div>
                  <div className="mt-1 text-xs text-ink/52">{t("card.stock")}</div>
                </div>
              </div>
              <button className="mt-5 flex h-11 w-full items-center justify-center gap-2 rounded-full border border-stone bg-rice px-4 text-sm font-bold text-ink/62" disabled type="button">
                <CreditCard aria-hidden="true" className="h-4 w-4" />
                {t("card.pendingPayment")}
              </button>
            </article>
          ))}
        </div>

        <div className="mt-6 rounded-lg border border-stone bg-white p-5 shadow-soft">
          <div className="flex items-center gap-2 text-sm font-bold text-moss">
            <CalendarDays aria-hidden="true" className="h-4 w-4" />
            {t("notice.title")}
          </div>
          <p className="mt-3 text-sm leading-7 text-ink/66">{t("notice.body")}</p>
        </div>
      </Section>
    </main>
  )
}
