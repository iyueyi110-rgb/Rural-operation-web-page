"use client"

import type { ReactNode } from "react"

import { adminCopy } from "@admin/lib/admin-copy"

export interface TableColumn<T extends Record<string, unknown>> {
  key: keyof T & string
  label: string
  render?: (value: unknown, row: T) => ReactNode
}

export function AdminDataTable<T extends Record<string, unknown>>({
  columns,
  rows,
  onRowClick,
  selectedId,
  isLoading,
  emptyLabel,
}: {
  columns: Array<TableColumn<T>>
  rows: T[]
  onRowClick?: (row: T) => void
  selectedId?: string
  isLoading?: boolean
  emptyLabel?: string
}) {
  const gridTemplateColumns = columns.map(() => "minmax(0,1fr)").join(" ")

  if (isLoading) {
    return <div className="rounded-xl border border-line bg-surface p-5 text-sm font-semibold text-ink/54 shadow-soft">{adminCopy.common.loading}</div>
  }

  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-line bg-surface p-5 text-sm font-semibold text-ink/54 shadow-soft">
        {emptyLabel ?? adminCopy.common.noSelection}
      </div>
    )
  }

  return (
    <div className="min-w-0 overflow-hidden rounded-xl border border-line bg-surface shadow-soft">
      <div className="relative">
        <div className="overflow-x-auto">
          <div className="min-w-[640px] md:min-w-[720px]">
            <div
              className="grid gap-3 border-b border-line bg-canopy px-4 py-3 text-xs font-bold text-white/72"
              style={{ gridTemplateColumns }}
            >
              {columns.map((column) => (
                <div key={column.key}>{column.label}</div>
              ))}
            </div>

            <div className="divide-y divide-line/80">
              {rows.map((row, index) => {
                const id = String(row.id ?? index)
                const isSelected = selectedId === id

                return (
                  <button
                    className={
                      isSelected
                        ? "grid w-full gap-3 bg-rice px-4 py-4 text-left"
                        : onRowClick
                          ? "grid w-full gap-3 px-4 py-4 text-left transition hover:bg-rice focus-visible:outline focus-visible:outline-2 focus-visible:outline-water"
                          : "grid w-full cursor-default gap-3 px-4 py-4 text-left"
                    }
                    key={id}
                    onClick={() => onRowClick?.(row)}
                    style={{ gridTemplateColumns }}
                    type="button"
                  >
                    {columns.map((column) => (
                      <div className="min-w-0 truncate text-xs font-semibold text-ink/62" key={column.key}>
                        {column.render ? column.render(row[column.key], row) : String(row[column.key] ?? "")}
                      </div>
                    ))}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
        <div className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-surface to-transparent md:hidden" />
      </div>
    </div>
  )
}
