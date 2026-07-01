"use client"

import { CalendarDays, Sparkles } from "lucide-react"

import { PanelTitle, SurfacePanel } from "@web/components/subpage-ui"

export interface SeasonEventView {
  id: string
  solarTerm: string
  title: string
  description?: string
  bonusPoints: number
  endDate: string
}

export function SeasonBanner({
  event,
  tagLabel,
  bonusLabel,
  endsLabel,
}: {
  event?: SeasonEventView
  tagLabel: string
  bonusLabel: (points: number) => string
  endsLabel: (days: number) => string
}) {
  if (!event) return null

  const daysLeft = Math.max(
    0,
    Math.ceil((new Date(event.endDate).getTime() - Date.now()) / 86_400_000),
  )

  return (
    <SurfacePanel tone="info">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <PanelTitle
            icon={<Sparkles aria-hidden="true" className="h-4 w-4" />}
            tone="water"
          >
            {tagLabel}
          </PanelTitle>
          <h2 className="mt-2 break-words text-xl font-extrabold text-ink">
            {event.title}
          </h2>
          {event.description ? (
            <p className="mt-2 break-words text-sm leading-6 text-ink/64">
              {event.description}
            </p>
          ) : null}
        </div>
        <div className="grid shrink-0 gap-2 text-sm font-bold">
          <span className="inline-flex items-center gap-2 rounded-full border border-water/20 bg-white/70 px-3 py-1.5 text-water">
            <Sparkles aria-hidden="true" className="h-4 w-4" />
            {bonusLabel(event.bonusPoints)}
          </span>
          <span className="inline-flex items-center gap-2 rounded-full border border-line bg-white/70 px-3 py-1.5 text-ink/62">
            <CalendarDays aria-hidden="true" className="h-4 w-4" />
            {endsLabel(daysLeft)}
          </span>
        </div>
      </div>
    </SurfacePanel>
  )
}
