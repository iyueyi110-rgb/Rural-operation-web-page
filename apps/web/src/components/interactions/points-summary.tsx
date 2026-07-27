"use client"

import { Gauge, Trophy, WalletCards } from "lucide-react"

import {
  MetricTile,
  PanelTitle,
  SurfacePanel,
} from "@web/components/subpage-ui"
import type { InteractionProgressSummary } from "@web/lib/interaction-dashboard-model"

export function PointsSummary({
  title,
  totalPointsLabel,
  availablePointsLabel,
  monthlyProgressLabel,
  points,
  summary,
}: {
  title: string
  totalPointsLabel: string
  availablePointsLabel: string
  monthlyProgressLabel: string
  points: {
    totalPoints: number
    availablePoints: number
    redeemedPoints: number
  }
  summary: InteractionProgressSummary
}) {
  const circumference = 2 * Math.PI * 42
  const offset = circumference - (summary.completionRate / 100) * circumference

  return (
    <SurfacePanel tone="dark">
      <PanelTitle
        icon={<Trophy aria-hidden="true" className="h-4 w-4" />}
        tone="white"
      >
        {title}
      </PanelTitle>
      <div className="mt-5 grid gap-5 sm:grid-cols-[auto_1fr] sm:items-center">
        <div className="relative h-28 w-28">
          <svg
            className="h-28 w-28 -rotate-90"
            viewBox="0 0 100 100"
            aria-hidden="true"
          >
            <circle
              cx="50"
              cy="50"
              r="42"
              fill="none"
              stroke="rgba(255,255,255,0.12)"
              strokeWidth="9"
            />
            <circle
              cx="50"
              cy="50"
              r="42"
              fill="none"
              stroke="#ded5c4"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              strokeLinecap="round"
              strokeWidth="9"
            />
          </svg>
          <div className="absolute inset-0 grid place-items-center text-center">
            <div>
              <div className="text-2xl font-extrabold tabular-nums">
                {summary.completionRate}%
              </div>
              <div className="text-[11px] font-semibold text-white/50">
                {monthlyProgressLabel}
              </div>
            </div>
          </div>
        </div>
        <div className="grid gap-3">
          <MetricTile
            icon={<WalletCards aria-hidden="true" className="h-5 w-5" />}
            label={availablePointsLabel}
            tone="dark"
            value={points.availablePoints}
          />
          <MetricTile
            icon={<Gauge aria-hidden="true" className="h-5 w-5" />}
            label={totalPointsLabel}
            tone="dark"
            value={points.totalPoints}
          />
        </div>
      </div>
    </SurfacePanel>
  )
}
