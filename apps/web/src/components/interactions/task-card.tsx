"use client"

import {
  Camera,
  CheckCircle2,
  Droplets,
  Leaf,
  NotebookPen,
  Share2,
} from "lucide-react"
import type { ChangeEvent } from "react"

import type { InteractionTaskGroup } from "@web/lib/interaction-dashboard-model"

const icons = {
  watering: Droplets,
  fertilizing: Leaf,
  photo_upload: Camera,
  diary: NotebookPen,
  share: Share2,
}

export function InteractionTaskCard({
  group,
  actionLabel,
  noteLabel,
  completedLabel,
  savingLabel,
  note,
  busy,
  onNoteChange,
  onComplete,
}: {
  group: InteractionTaskGroup
  actionLabel: string
  noteLabel: string
  completedLabel: string
  savingLabel: string
  note: string
  busy: boolean
  onNoteChange: (value: string) => void
  onComplete: (file?: File) => void
}) {
  const Icon = icons[group.taskType]
  const completed = group.status === "completed"
  const disabled = busy || completed || !group.nextTaskId

  function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (file) onComplete(file)
    event.target.value = ""
  }

  return (
    <article className="rounded-xl border border-line bg-surface p-4">
      <div className="flex min-w-0 items-start gap-3">
        <div
          className={
            completed
              ? "rounded-lg bg-moss/10 p-2 text-moss"
              : "rounded-lg bg-water/10 p-2 text-water"
          }
        >
          <Icon aria-hidden="true" className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="break-words text-base font-extrabold text-ink">
                {group.title}
              </h3>
              {group.description ? (
                <p className="mt-1 break-words text-sm leading-6 text-ink/62">
                  {group.description}
                </p>
              ) : null}
            </div>
            <div className="shrink-0 text-right">
              <div className="text-sm font-extrabold text-moss">
                +{group.pointsPerCompletion}
              </div>
              <div className="mt-1 text-xs font-semibold text-ink/48">
                {group.completionCount}/{group.maxCompletions}
              </div>
            </div>
          </div>

          <div
            className="mt-4 grid gap-1.5"
            style={{
              gridTemplateColumns: `repeat(${group.maxCompletions}, minmax(0, 1fr))`,
            }}
            aria-hidden="true"
          >
            {Array.from({ length: group.maxCompletions }).map((_, index) => (
              <span
                className={
                  index < group.completionCount
                    ? "h-2 rounded-full bg-moss"
                    : "h-2 rounded-full bg-stone/70"
                }
                key={index}
              />
            ))}
          </div>

          {["watering", "fertilizing", "diary"].includes(group.taskType) &&
          !completed ? (
            <label className="mt-4 grid gap-2 text-sm font-bold text-ink">
              <span>{noteLabel}</span>
              <textarea
                className="textarea-control min-h-20"
                onChange={(event) => onNoteChange(event.target.value)}
                value={note}
              />
            </label>
          ) : null}

          <div className="mt-4 flex flex-wrap items-center gap-3">
            {group.taskType === "photo_upload" && !completed ? (
              <label
                className={
                  disabled
                    ? "btn-primary btn-sm cursor-not-allowed opacity-60"
                    : "btn-primary btn-sm cursor-pointer"
                }
              >
                <input
                  accept="image/*"
                  className="sr-only"
                  disabled={disabled}
                  onChange={handleFile}
                  type="file"
                />
                {busy ? savingLabel : actionLabel}
              </label>
            ) : (
              <button
                className={
                  completed ? "btn-secondary btn-sm" : "btn-primary btn-sm"
                }
                disabled={disabled}
                onClick={() => onComplete()}
                type="button"
              >
                {completed ? (
                  <>
                    <CheckCircle2 aria-hidden="true" className="h-4 w-4" />
                    {completedLabel}
                  </>
                ) : busy ? (
                  savingLabel
                ) : (
                  actionLabel
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </article>
  )
}
