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
import { SafeImage, Section } from "@ui/index"

const moduleIcons = [
  Sprout,
  Route,
  Home,
  ClipboardList,
  BrainCircuit,
  CalendarCheck,
] as const

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
        <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
          <div>
            <SectionHeader
              body={t("systemModules.body")}
              kicker={t("systemModules.kicker")}
              title={t("systemModules.title")}
            />
            <div className="relative mt-8 overflow-hidden rounded-xl border border-line/80 bg-ink shadow-soft">
              <div className="relative aspect-[16/10] min-h-[260px]">
                <SafeImage
                  alt="走马村村民与运营人员在荔枝古道旁协作查看任务地图"
                  className="object-cover"
                  fill
                  priority={false}
                  sizes="(min-width: 1024px) 40vw, 100vw"
                  src="/images/home/village-operations-ai.jpg"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-ink/80 via-ink/12 to-transparent" />
                <div className="absolute bottom-5 left-5 right-5 flex items-end justify-between gap-4 text-white sm:bottom-6 sm:left-6 sm:right-6">
                  <div>
                    <p className="text-xs font-bold tracking-[0.12em] text-[#d7b56d]">
                      {t("systemModules.kicker")}
                    </p>
                    <p className="mt-2 max-w-sm text-sm font-semibold leading-6 text-white/90 sm:text-base">
                      关系、任务和空间决策从同一条村路上发生。
                    </p>
                  </div>
                  <span className="hidden shrink-0 rounded-full border border-white/30 bg-ink/45 px-3 py-1.5 text-xs font-bold backdrop-blur sm:inline-flex">
                    现场协作
                  </span>
                </div>
              </div>
            </div>
          </div>
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
