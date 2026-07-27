import type { Metadata } from "next"
import { ArrowLeft, CalendarDays, Ticket } from "lucide-react"
import { getTranslations, setRequestLocale } from "next-intl/server"

import type { Locale } from "@web/i18n/routing"
import { BackButton } from "@web/components/back-button"
import { VisitorHeaderActions } from "@web/components/visitor-header-actions"
import {
  PanelTitle,
  SubpageHero,
  SurfacePanel,
} from "@web/components/subpage-ui"
import { getSiteUrl } from "@web/lib/site-url"
import { PageHeader, Section } from "@ui/index"
import { TicketFlow } from "./ticket-flow"

export async function generateMetadata({
  params,
}: {
  params: { locale: Locale }
}): Promise<Metadata> {
  const t = await getTranslations({
    locale: params.locale,
    namespace: "metadata.tickets",
  })

  return {
    metadataBase: getSiteUrl(),
    title: t("title"),
    description: t("description"),
  }
}

export default async function TicketsPage({
  params,
}: {
  params: { locale: Locale }
}) {
  setRequestLocale(params.locale)
  const t = await getTranslations("tickets")
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
        rightElement={
          <VisitorHeaderActions
            locale={params.locale}
            rightLabel={t("nav.phase")}
          />
        }
      />
      <SubpageHero
        body={t("hero.body")}
        eyebrow={t("hero.eyebrow")}
        icon={<Ticket aria-hidden="true" className="h-4 w-4" />}
        title={t("hero.title")}
      />
      <Section>
        <div className="mt-8">
          <TicketFlow />
        </div>

        <SurfacePanel className="mt-6">
          <PanelTitle
            icon={<CalendarDays aria-hidden="true" className="h-4 w-4" />}
            tone="moss"
          >
            {t("notice.title")}
          </PanelTitle>
          <p className="mt-3 text-sm leading-7 text-ink/66">
            {t("notice.body")}
          </p>
        </SurfacePanel>
      </Section>
    </main>
  )
}
