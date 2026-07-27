"use client"

import { ClipboardList } from "lucide-react"

import {
  EmptyState,
  PanelTitle,
  SurfacePanel,
} from "@web/components/subpage-ui"
import type { InteractionTaskGroup } from "@web/lib/interaction-dashboard-model"

import { InteractionTaskCard } from "./task-card"

export function InteractionTaskList({
  title,
  emptyTitle,
  noteLabel,
  completedLabel,
  savingLabel,
  groups,
  notes,
  busyId,
  actionFor,
  onNoteChange,
  onComplete,
}: {
  title: string
  emptyTitle: string
  noteLabel: string
  completedLabel: string
  savingLabel: string
  groups: InteractionTaskGroup[]
  notes: Record<string, string>
  busyId: string
  actionFor: (group: InteractionTaskGroup) => string
  onNoteChange: (groupId: string, value: string) => void
  onComplete: (group: InteractionTaskGroup, file?: File) => void
}) {
  return (
    <SurfacePanel>
      <PanelTitle
        icon={<ClipboardList aria-hidden="true" className="h-4 w-4" />}
        tone="moss"
      >
        {title}
      </PanelTitle>
      <div className="mt-5 grid gap-3">
        {groups.length === 0 ? (
          <EmptyState title={emptyTitle} />
        ) : (
          groups.map((group) => (
            <InteractionTaskCard
              actionLabel={actionFor(group)}
              busy={busyId === group.id}
              completedLabel={completedLabel}
              group={group}
              key={`${group.periodKey ?? "legacy"}-${group.taskType}`}
              note={notes[group.id] ?? ""}
              noteLabel={noteLabel}
              onComplete={(file) => onComplete(group, file)}
              onNoteChange={(value) => onNoteChange(group.id, value)}
              savingLabel={savingLabel}
            />
          ))
        )}
      </div>
    </SurfacePanel>
  )
}
