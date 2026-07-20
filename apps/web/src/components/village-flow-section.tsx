import {
  Bot,
  ClipboardCheck,
  GitBranch,
  Hammer,
  Sprout,
  Users,
} from "lucide-react"
import { getTranslations } from "next-intl/server"

import { SafeImage, Section } from "@ui/index"
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
                <p className="mt-6 text-xs font-semibold text-lychee">
                  {label}
                </p>
                <h3 className="mt-2 text-lg font-extrabold leading-tight">
                  {title}
                </h3>
                <p className="mt-3 text-sm leading-6 text-ink/58">{body}</p>
              </article>
            ))}
          </div>
        </div>

        <div className="mt-6 grid gap-3 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="relative min-h-[220px] overflow-hidden rounded-xl border border-ink/10 bg-ink shadow-soft">
            <SafeImage
              alt="村民与建筑协作者在老院落旁讨论空间更新方案"
              className="object-cover"
              fill
              sizes="(min-width: 1024px) 55vw, 100vw"
              src="/images/home/village-renovation-ai.jpg"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-ink/86 via-ink/22 to-transparent" />
            <div className="absolute bottom-5 left-5 right-5 text-white sm:bottom-6 sm:left-6 sm:right-6">
              <p className="text-xs font-bold tracking-[0.12em] text-[#d7b56d]">
                空间更新现场
              </p>
              <p className="mt-2 max-w-md text-sm font-semibold leading-6 text-white/90">
                数据最后要回到一块石墙、一条水沟和一间可以继续使用的院落。
              </p>
            </div>
          </div>
          <div className="flex flex-col justify-center gap-3 rounded-xl border border-ink/10 bg-ink p-5 text-white sm:p-6">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-lg bg-white/10 text-[#d7b56d]">
                <GitBranch aria-hidden="true" className="h-5 w-5" />
              </span>
              <span className="text-xs font-bold tracking-[0.12em] text-white/48">
                运营结果
              </span>
            </div>
            <p className="max-w-3xl text-sm leading-7 text-white/72">
              {t("operationFlow.result")}
            </p>
          </div>
        </div>
      </Section>
    </section>
  )
}
