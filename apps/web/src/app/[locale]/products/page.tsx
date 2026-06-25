import type { Metadata } from "next"
import { ArrowLeft, Store } from "lucide-react"
import { getTranslations, setRequestLocale } from "next-intl/server"

import type { Locale } from "@web/i18n/routing"
import { SubpageHero } from "@web/components/subpage-ui"
import { getSiteUrl } from "@web/lib/site-url"
import { PageHeader, Section } from "@ui/index"
import { ProductFlow } from "./product-flow"

export async function generateMetadata({ params }: { params: { locale: Locale } }): Promise<Metadata> {
  const t = await getTranslations({ locale: params.locale, namespace: "metadata.products" })

  return {
    metadataBase: getSiteUrl(),
    title: t("title"),
    description: t("description"),
  }
}

export default async function ProductsPage({ params }: { params: { locale: Locale } }) {
  setRequestLocale(params.locale)
  const t = await getTranslations("products")

  return (
    <main className="min-h-screen bg-rice pb-16 text-ink">
      <PageHeader backHref={`/${params.locale}`} backLabel={t("nav.backHome")} icon={<ArrowLeft aria-hidden="true" className="h-4 w-4" />} rightLabel={t("nav.phase")} />
      <SubpageHero
        body={t("hero.body")}
        eyebrow={t("hero.eyebrow")}
        icon={<Store aria-hidden="true" className="h-4 w-4" />}
        title={t("hero.title")}
      />
      <Section>
        <div className="mt-8">
          <ProductFlow />
        </div>
      </Section>
    </main>
  )
}
