import {
  BrainCircuit,
  CalendarCheck,
  ClipboardList,
  Home,
  Route,
  Sprout,
} from "lucide-react"
import { getTranslations } from "next-intl/server"

import type { Locale } from "@web/i18n/routing"
import { buildAdoptionHref } from "@web/lib/home-navigation"
import { OperationDashboardPreview } from "@web/components/operation-dashboard-preview"
import { SectionHeader } from "@web/components/section-header"
import { SystemModuleCard } from "@web/components/system-module-card"
import { Section } from "@ui/index"

const moduleIcons = [Sprout, Route, Home, ClipboardList, BrainCircuit, CalendarCheck] as const

export async function SystemModulesSection({ locale }: { locale: Locale }) {
  const t = await getTranslations("home")
  const hrefs = [
    buildAdoptionHref(locale),
    `/${locale}/routes`,
    `/${locale}/booking`,
    `/${locale}/villager/login`,
    `/${locale}/feedback`,
    `/${locale}/explore#realms`,
  ]

  return (
    <section className="bg-rice py-16 sm:py-24" id="system-modules">
      <Section>
        <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-end">
          <SectionHeader
            body={t("systemModules.body")}
            kicker={t("systemModules.kicker")}
            title={t("systemModules.title")}
          />
          <OperationDashboardPreview />
        </div>

        <div className="mt-10 grid auto-rows-fr gap-4 md:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2, 3, 4, 5].map((index) => {
            const Icon = moduleIcons[index]
            return (
              <SystemModuleCard
                body={t(`systemModules.items.${index}.body`)}
                href={hrefs[index]}
                icon={Icon}
                key={index}
                status={t(`systemModules.items.${index}.status`)}
                tag={t(`systemModules.items.${index}.tag`)}
                title={t(`systemModules.items.${index}.title`)}
                tone={index === 4 ? "dark" : "light"}
              />
            )
          })}
        </div>
      </Section>
    </section>
  )
}
