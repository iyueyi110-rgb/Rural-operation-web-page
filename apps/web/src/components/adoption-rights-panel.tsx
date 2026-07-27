import {
  BadgeCheck,
  CalendarCheck,
  CheckCircle2,
  LockKeyhole,
  PackageCheck,
  Truck,
} from "lucide-react"
import { getTranslations } from "next-intl/server"

import {
  getRightsVisualState,
  normalizeAdoptionRights,
} from "@web/lib/tree-experience"

export async function AdoptionRightsPanel({
  rightsJson,
  plan,
  status,
}: {
  rightsJson: unknown
  plan: string
  status: string
}) {
  const t = await getTranslations("trees")
  const rights = normalizeAdoptionRights(rightsJson, plan)
  const visualState = getRightsVisualState(status)
  const normalizedPlan = plan === "seasonal" ? "seasonal" : "annual"
  const cards = [
    {
      id: "harvestQuota",
      icon: PackageCheck,
      enabled: true,
      value: rights.harvestQuota,
    },
    { id: "onsiteBooking", icon: CalendarCheck, enabled: rights.onsiteBooking },
    { id: "nameplate", icon: BadgeCheck, enabled: rights.nameplate },
    { id: "coldChain", icon: Truck, enabled: rights.coldChain },
  ] as const

  return (
    <article className="rounded-xl border border-white/10 bg-ink p-5 text-white shadow-[0_12px_28px_rgba(25,32,27,0.18)] sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-bold text-white/55">
            {t("experience.rights.eyebrow")}
          </p>
          <h2 className="mt-2 text-2xl font-extrabold">
            {t("experience.rights.title")}
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-white/60">
            {t("experience.rights.description")}
          </p>
        </div>
        <div className="rounded-full border border-white/14 bg-white/8 px-3 py-1.5 text-xs font-bold text-white/72">
          {t(`plans.${normalizedPlan}.label`)} /{" "}
          {t(`experience.rights.state.${visualState}`)}
        </div>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => {
          const Icon = card.icon
          const available = visualState === "unlocked" && card.enabled
          return (
            <div
              className={`rounded-md border p-4 ${
                available
                  ? "border-moss/80 bg-moss/[0.22]"
                  : "border-white/10 bg-white/[0.045] text-white/52"
              }`}
              key={card.id}
            >
              <div className="flex items-center justify-between gap-3">
                <Icon aria-hidden="true" className="h-5 w-5" />
                {available ? (
                  <CheckCircle2
                    aria-hidden="true"
                    className="h-4 w-4 text-[#9bcf9d]"
                  />
                ) : (
                  <LockKeyhole
                    aria-hidden="true"
                    className="h-4 w-4 text-white/35"
                  />
                )}
              </div>
              <h3 className="mt-4 text-sm font-extrabold">
                {t(`experience.rights.cards.${card.id}.title`)}
              </h3>
              <p className="mt-2 text-xs leading-5 opacity-75">
                {card.id === "harvestQuota"
                  ? t("experience.rights.cards.harvestQuota.body", {
                      quota: card.value,
                    })
                  : t(`experience.rights.cards.${card.id}.body`)}
              </p>
            </div>
          )
        })}
      </div>

      {visualState !== "unlocked" ? (
        <p className="mt-4 text-xs font-semibold text-white/45">
          {t(
            visualState === "locked"
              ? "experience.rights.lockedNote"
              : "experience.rights.previewNote",
          )}
        </p>
      ) : null}
    </article>
  )
}
