import {
  Bot,
  ClipboardCheck,
  GitBranch,
  Hammer,
  Sprout,
  Users,
} from "lucide-react"
import { getTranslations } from "next-intl/server"

import { Section } from "@ui/index"
import { SectionHeader } from "@web/components/section-header"

const flowIcons = [Sprout, Users, ClipboardCheck, Bot, Hammer] as const

export async function VillageFlowSection() {
  const t = await getTranslations("home")
  const steps = [0, 1, 2, 3, 4].map((index) => ({
    title: t(`operationFlow.steps.${index}.title`),
    body: t(`operationFlow.steps.${index}.body`),
    label: t(`operationFlow.steps.${index}.label`),
    Icon: flowIcons[index],
  }))

  return (
    <section className="relative overflow-hidden bg-[#ede6d8] py-16 text-ink sm:py-24">
      <div className="terrain-grid absolute inset-0 opacity-55" />
      <Section className="relative">
        <SectionHeader
          body={t("operationFlow.body")}
          kicker={t("operationFlow.kicker")}
          title={t("operationFlow.title")}
        />

        <div className="relative mt-10 overflow-hidden rounded-xl border border-line bg-surface/86 p-4 shadow-panel sm:p-6">
          <div className="data-path absolute inset-x-0 top-1/2 h-16 -translate-y-1/2 opacity-50" />
          <div className="relative grid gap-3 lg:grid-cols-5">
            {steps.map(({ title, body, label, Icon }, index) => (
              <article
                className="min-h-52 rounded-lg border border-line/70 bg-white/72 p-5 backdrop-blur"
                key={title}
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="grid h-10 w-10 place-items-center rounded-lg bg-moss/10 text-moss">
                    <Icon aria-hidden="true" className="h-5 w-5" />
                  </span>
                  <span className="text-xs font-bold tabular-nums text-ink/34">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                </div>
                <p className="mt-6 text-xs font-semibold text-lychee">{label}</p>
                <h3 className="mt-2 text-lg font-extrabold leading-tight">
                  {title}
                </h3>
                <p className="mt-3 text-sm leading-6 text-ink/58">{body}</p>
              </article>
            ))}
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-3 rounded-xl border border-ink/10 bg-ink p-5 text-white sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-lg bg-white/10 text-[#d7b56d]">
              <GitBranch aria-hidden="true" className="h-5 w-5" />
            </span>
            <p className="max-w-3xl text-sm leading-6 text-white/68">
              {t("operationFlow.result")}
            </p>
          </div>
        </div>
      </Section>
    </section>
  )
}
