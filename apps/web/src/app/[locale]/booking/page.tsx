import type { Metadata } from "next"
import { ArrowLeft, ShieldCheck } from "lucide-react"
import { getTranslations, setRequestLocale } from "next-intl/server"

import { BookingFlow } from "./booking-flow"
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

      <Section className="pt-12">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,0.78fr)_minmax(280px,0.42fr)] lg:items-end">
          <div className="max-w-3xl min-w-0">
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-lychee">{t("hero.eyebrow")}</p>
            <h1 className="mt-3 break-words text-3xl font-extrabold leading-tight tracking-normal sm:text-5xl">
              {t("hero.title")}
            </h1>
            <p className="mt-5 break-words text-base leading-8 text-ink/68">{t("hero.body")}</p>
          </div>
          <div className="rounded-lg border border-stone bg-white p-5 shadow-soft">
            <div className="flex items-center gap-2 text-sm font-bold text-moss">
              <ShieldCheck aria-hidden="true" className="h-4 w-4" />
              {t("guardrail.title")}
            </div>
            <p className="mt-3 break-words text-sm leading-6 text-ink/68">{t("guardrail.body")}</p>
          </div>
        </div>
      </Section>

      <Section className="pt-9">
        <BookingFlow />
      </Section>
    </main>
  )
}
