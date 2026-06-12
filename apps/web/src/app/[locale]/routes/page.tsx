import type { Metadata } from "next"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { getTranslations, setRequestLocale } from "next-intl/server"

import { RouteGenerator } from "./route-generator"
import type { Locale } from "@web/i18n/routing"
import { Section } from "@ui/index"

export async function generateMetadata({
  params,
}: {
  params: { locale: Locale }
}): Promise<Metadata> {
  const t = await getTranslations({ locale: params.locale, namespace: "metadata.routes" })

  return {
    metadataBase: new URL("http://localhost:3000"),
    title: t("title"),
    description: t("description"),
    openGraph: {
      title: t("title"),
      description: t("description"),
      images: ["/images/routes/zouma-scope-map.png"],
    },
  }
}

export default async function RoutesPage({ params }: { params: { locale: Locale } }) {
  setRequestLocale(params.locale)
  const t = await getTranslations("routes")

  return (
    <main className="min-h-screen overflow-x-hidden bg-rice pb-16 text-ink">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-ink/80 text-white backdrop-blur-xl">
        <Section className="flex h-16 items-center justify-between gap-4">
          <Link
            className="flex shrink-0 items-center gap-2 text-sm font-semibold text-white/86"
            href={`/${params.locale}`}
          >
            <ArrowLeft aria-hidden="true" className="h-4 w-4" />
            {t("nav.backHome")}
          </Link>
          <div className="min-w-0 truncate text-right text-sm font-semibold text-white/72">{t("nav.phase")}</div>
        </Section>
      </header>

      <Section className="pt-12">
        <div className="max-w-3xl min-w-0">
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-lychee">{t("hero.eyebrow")}</p>
          <h1 className="mt-3 break-all text-3xl font-extrabold leading-tight tracking-normal sm:text-5xl">
            {t("hero.title")}
          </h1>
          <p className="mt-5 break-all text-base leading-8 text-ink/68">{t("hero.body")}</p>
        </div>
      </Section>

      <Section className="pt-9">
        <RouteGenerator locale={params.locale} />
      </Section>
    </main>
  )
}
