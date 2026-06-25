"use client"

import { useState } from "react"
import { Flower2, PackageCheck, Sprout, SunMedium } from "lucide-react"
import { useTranslations } from "next-intl"

import { PanelTitle, SurfacePanel } from "@web/components/subpage-ui"
import { growthStages, type GrowthStage } from "@web/lib/tree-experience"

const stageIcons = {
  flowering: Flower2,
  fruiting: Sprout,
  ripening: SunMedium,
  harvest: PackageCheck,
}

export function GrowthAnimation({
  stage,
  onComplete,
}: {
  stage: GrowthStage
  onComplete?: (stage: GrowthStage) => void
}) {
  const t = useTranslations("trees.experience.growth")
  const [selectedStage, setSelectedStage] = useState<GrowthStage>(stage)
  const [animationKey, setAnimationKey] = useState(0)
  const SelectedIcon = stageIcons[selectedStage]

  const selectStage = (nextStage: GrowthStage) => {
    setSelectedStage(nextStage)
    setAnimationKey((value) => value + 1)
  }

  return (
    <SurfacePanel className="overflow-hidden sm:p-6">
      <PanelTitle tone="lychee">{t("eyebrow")}</PanelTitle>
      <h2 className="mt-2 text-2xl font-extrabold">{t("title")}</h2>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-ink/58">
        {t("description")}
      </p>

      <div
        aria-label={t("timelineAria")}
        className="mt-6 flex snap-x gap-3 overflow-x-auto pb-3"
        role="group"
      >
        {growthStages.map((item, index) => {
          const Icon = stageIcons[item]
          const selected = item === selectedStage
          return (
            <button
              aria-pressed={selected}
              className={`min-w-[180px] snap-start rounded-md border p-4 text-left transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-water ${
                selected
                  ? "border-moss bg-moss text-white"
                  : "border-stone bg-rice text-ink hover:border-moss/50"
              }`}
              key={item}
              onClick={() => selectStage(item)}
              type="button"
            >
              <div className="flex items-center justify-between gap-3">
                <Icon aria-hidden="true" className="h-5 w-5" />
                <span className="text-xs font-bold opacity-55">
                  {String(index + 1).padStart(2, "0")}
                </span>
              </div>
              <h3 className="mt-4 text-sm font-extrabold">
                {t(`stages.${item}.label`)}
              </h3>
              <p className="mt-2 text-xs leading-5 opacity-70">
                {t(`stages.${item}.body`)}
              </p>
            </button>
          )
        })}
      </div>

      <div className="mt-4 grid min-h-56 place-items-center rounded-lg bg-gradient-to-b from-rice to-[#e5eddc] p-7 text-center">
        <div>
          <div
            aria-hidden="true"
            className="tree-growth-pulse mx-auto grid h-24 w-24 place-items-center rounded-full border border-moss/18 bg-white text-moss shadow-soft"
            key={`${selectedStage}-${animationKey}`}
            onAnimationEnd={() => onComplete?.(selectedStage)}
          >
            <SelectedIcon className="h-11 w-11" />
          </div>
          <p aria-live="polite" className="mt-5 text-lg font-extrabold">
            {t(`stages.${selectedStage}.label`)}
          </p>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-ink/58">
            {t(`stages.${selectedStage}.detail`)}
          </p>
        </div>
      </div>
    </SurfacePanel>
  )
}
