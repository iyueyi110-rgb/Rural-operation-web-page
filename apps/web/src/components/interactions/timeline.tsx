"use client"

import { Clock3 } from "lucide-react"

import {
  EmptyState,
  PanelTitle,
  SurfacePanel,
} from "@web/components/subpage-ui"

export interface TimelineTransaction {
  id: string
  amount: number
  source: string
  note?: string
  createdAt: string
}

export function InteractionTimeline({
  title,
  emptyTitle,
  transactions,
}: {
  title: string
  emptyTitle: string
  transactions: TimelineTransaction[]
}) {
  return (
    <SurfacePanel>
      <PanelTitle icon={<Clock3 aria-hidden="true" className="h-4 w-4" />}>
        {title}
      </PanelTitle>
      <div className="mt-5 grid gap-3">
        {transactions.length === 0 ? (
          <EmptyState className="min-h-28" title={emptyTitle} />
        ) : (
          transactions.slice(0, 8).map((transaction) => (
            <article
              className="grid gap-1 rounded-lg bg-rice p-3 text-sm"
              key={transaction.id}
            >
              <div className="flex min-w-0 items-center justify-between gap-3">
                <div className="min-w-0 truncate font-extrabold text-ink">
                  {transaction.note || transaction.source}
                </div>
                <div
                  className={
                    transaction.amount >= 0
                      ? "shrink-0 font-extrabold text-moss"
                      : "shrink-0 font-extrabold text-lychee"
                  }
                >
                  {transaction.amount >= 0 ? "+" : ""}
                  {transaction.amount}
                </div>
              </div>
              <time
                className="text-xs font-semibold text-ink/48"
                dateTime={transaction.createdAt}
              >
                {new Date(transaction.createdAt).toLocaleString()}
              </time>
            </article>
          ))
        )}
      </div>
    </SurfacePanel>
  )
}
