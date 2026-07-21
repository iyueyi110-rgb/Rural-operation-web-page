import { prisma } from "@zouma/database"
import type { AdoptionWorkflowStatus } from "@zouma/contracts"

import { WorkflowConflictError } from "@web/lib/workflow-errors"

export const adoptionActions = [
  "activate",
  "cancel",
  "prepare_benefit",
  "fulfill",
  "request_refund",
  "start_refund_review",
  "approve_refund",
  "reject_refund",
  "start_renewal",
  "renew",
  "expire",
] as const

export type AdoptionAction = (typeof adoptionActions)[number]

const transitions: Record<
  AdoptionAction,
  Partial<Record<AdoptionWorkflowStatus, AdoptionWorkflowStatus>>
> = {
  activate: { pending_payment: "active" },
  cancel: { pending_payment: "cancelled" },
  prepare_benefit: { active: "benefit_pending" },
  fulfill: { benefit_pending: "fulfilled" },
  request_refund: { active: "refund_requested" },
  start_refund_review: { refund_requested: "refund_reviewing" },
  approve_refund: { refund_reviewing: "refunded" },
  reject_refund: { refund_reviewing: "refund_rejected" },
  start_renewal: { fulfilled: "renewal_pending" },
  renew: { renewal_pending: "renewed" },
  expire: { renewal_pending: "expired" },
}

export function isAdoptionAction(value: unknown): value is AdoptionAction {
  return (
    typeof value === "string" &&
    adoptionActions.includes(value as AdoptionAction)
  )
}

export function nextAdoptionStatus(current: string, action: AdoptionAction) {
  return transitions[action][current as AdoptionWorkflowStatus] ?? null
}

export async function transitionAdoption(input: {
  adoptionId: string
  action: AdoptionAction
  expectedVersion: number
  actorId: string
  actorType: "operator" | "user"
  reason?: string
  correlationId?: string
}) {
  return prisma.$transaction(async (tx) => {
    const current = await tx.treeAdoption.findUnique({
      where: { id: input.adoptionId },
    })
    if (!current) throw new WorkflowConflictError("Adoption not found")
    const next = nextAdoptionStatus(current.status, input.action)
    if (!next)
      throw new WorkflowConflictError(
        `Cannot ${input.action} from ${current.status}`,
      )

    const changed = await tx.treeAdoption.updateMany({
      where: {
        id: current.id,
        status: current.status,
        version: input.expectedVersion,
      },
      data: { status: next, version: { increment: 1 } },
    })
    if (changed.count !== 1) {
      throw new WorkflowConflictError(
        "Adoption version changed",
        "VERSION_CONFLICT",
      )
    }

    await tx.auditLog.create({
      data: {
        actorId: input.actorId,
        actorType: input.actorType,
        action: `adoption.${input.action}`,
        targetType: "tree_adoption",
        targetId: current.id,
        adoptionId: current.id,
        correlationId: input.correlationId,
        detail: {
          beforeState: current.status,
          afterState: next,
          reason: input.reason ?? null,
        },
      },
    })
    return tx.treeAdoption.findUniqueOrThrow({ where: { id: current.id } })
  })
}
