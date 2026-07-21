import { prisma } from "@zouma/database"
import type { FulfillmentTaskAction, TaskStatus } from "@zouma/contracts"

import { WorkflowConflictError } from "@web/lib/workflow-errors"

const transitions: Record<
  FulfillmentTaskAction,
  Partial<Record<TaskStatus, TaskStatus>>
> = {
  accept: { pending: "accepted" },
  start: { accepted: "in_progress" },
  submit_evidence: { in_progress: "submitted" },
  resubmit: { rejected: "resubmitted" },
  report_exception: {
    accepted: "exception_reported",
    in_progress: "exception_reported",
  },
  approve: { submitted: "approved", resubmitted: "approved" },
  reject: { submitted: "rejected", resubmitted: "rejected" },
  settle: { approved: "settled" },
  mark_overdue: { accepted: "overdue", in_progress: "overdue" },
}

export const fulfillmentActions = Object.keys(
  transitions,
) as FulfillmentTaskAction[]

export function isFulfillmentTaskAction(
  value: unknown,
): value is FulfillmentTaskAction {
  return (
    typeof value === "string" &&
    fulfillmentActions.includes(value as FulfillmentTaskAction)
  )
}

export function nextFulfillmentStatus(
  current: string,
  action: FulfillmentTaskAction,
) {
  return transitions[action][current as TaskStatus] ?? null
}

export async function transitionFulfillmentTask(input: {
  taskId: string
  action: FulfillmentTaskAction
  expectedVersion: number
  actorId: string
  actorType: "operator" | "villager"
  reason?: string
  correlationId?: string
}) {
  return prisma.$transaction(async (tx) => {
    const current = await tx.task.findUnique({ where: { id: input.taskId } })
    if (!current?.adoptionId)
      throw new WorkflowConflictError("Adoption task not found")
    const next = nextFulfillmentStatus(current.status, input.action)
    if (!next)
      throw new WorkflowConflictError(
        `Cannot ${input.action} from ${current.status}`,
      )
    const now = new Date()
    const changed = await tx.task.updateMany({
      where: {
        id: current.id,
        status: current.status,
        version: input.expectedVersion,
      },
      data: {
        status: next,
        version: { increment: 1 },
        ...(input.action === "accept" ? { acceptedAt: now } : {}),
        ...(input.action === "submit_evidence" || input.action === "resubmit"
          ? { submittedAt: now }
          : {}),
        ...(input.action === "approve" || input.action === "settle"
          ? { completedAt: now }
          : {}),
      },
    })
    if (changed.count !== 1) {
      throw new WorkflowConflictError(
        "Task version changed",
        "VERSION_CONFLICT",
      )
    }
    await tx.auditLog.create({
      data: {
        actorId: input.actorId,
        actorType: input.actorType,
        action: `fulfillment.${input.action}`,
        targetType: "task",
        targetId: current.id,
        adoptionId: current.adoptionId,
        correlationId: input.correlationId,
        detail: {
          beforeState: current.status,
          afterState: next,
          reason: input.reason ?? null,
        },
      },
    })
    return tx.task.findUniqueOrThrow({ where: { id: current.id } })
  })
}
