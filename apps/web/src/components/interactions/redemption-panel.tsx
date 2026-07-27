"use client"

import { Gift, PackageCheck } from "lucide-react"

import {
  EmptyState,
  PanelTitle,
  SurfacePanel,
} from "@web/components/subpage-ui"

export interface RedemptionOptionView {
  id: string
  title: string
  description?: string
  pointsCost: number
  type: string
  stock: number
  redeemedCount: number
  status: string
}

export function RedemptionPanel({
  title,
  emptyTitle,
  redeemLabel,
  insufficientLabel,
  options,
  availablePoints,
  busyId,
  onRedeem,
}: {
  title: string
  emptyTitle: string
  redeemLabel: string
  insufficientLabel: string
  options: RedemptionOptionView[]
  availablePoints: number
  busyId: string
  onRedeem: (option: RedemptionOptionView) => void
}) {
  return (
    <SurfacePanel>
      <PanelTitle
        icon={<Gift aria-hidden="true" className="h-4 w-4" />}
        tone="lychee"
      >
        {title}
      </PanelTitle>
      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
        {options.length === 0 ? (
          <EmptyState className="min-h-28" title={emptyTitle} />
        ) : (
          options.map((option) => {
            const canRedeem =
              availablePoints >= option.pointsCost &&
              (option.stock < 0 || option.redeemedCount < option.stock)
            return (
              <article
                className="rounded-xl border border-line bg-rice p-4"
                key={option.id}
              >
                <div className="flex items-start gap-3">
                  <div className="rounded-lg bg-lychee/10 p-2 text-lychee">
                    <PackageCheck aria-hidden="true" className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="break-words font-extrabold text-ink">
                      {option.title}
                    </h3>
                    {option.description ? (
                      <p className="mt-1 break-words text-sm leading-6 text-ink/58">
                        {option.description}
                      </p>
                    ) : null}
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                      <span className="text-sm font-extrabold text-lychee">
                        {option.pointsCost}
                      </span>
                      <button
                        className="btn-secondary btn-sm data-[ready=true]:border-ink data-[ready=true]:bg-ink data-[ready=true]:text-white"
                        data-ready={canRedeem}
                        disabled={!canRedeem || busyId === option.id}
                        onClick={() => onRedeem(option)}
                        type="button"
                      >
                        {canRedeem ? redeemLabel : insufficientLabel}
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            )
          })
        )}
      </div>
    </SurfacePanel>
  )
}
