import type {
  SimulationAdoptionStatus,
  SimulationAssignment,
  SimulationTaskStatus,
} from "@zouma/contracts"

export type TransitionMap<State extends string> = Readonly<
  Record<State, readonly State[]>
>

export const ADOPTION_TRANSITIONS: TransitionMap<SimulationAdoptionStatus> = {
  created: ["pending_payment", "cancelled"],
  pending_payment: ["paid", "cancelled"],
  paid: ["active", "refunded", "disputed"],
  active: ["harvest_ready", "cancelled", "refunded", "disputed"],
  harvest_ready: ["fulfillment_pending", "disputed"],
  fulfillment_pending: ["completed", "disputed"],
  completed: [],
  cancelled: [],
  refunded: [],
  disputed: ["refunded", "completed"],
}

export const TASK_TRANSITIONS: TransitionMap<SimulationTaskStatus> = {
  created: ["assigned", "cancelled"],
  assigned: ["accepted", "rejected", "reassigned", "cancelled"],
  accepted: ["in_progress", "overdue", "cancelled"],
  in_progress: ["submitted", "overdue", "cancelled"],
  submitted: ["approved", "returned"],
  approved: ["completed"],
  completed: [],
  rejected: ["reassigned", "cancelled"],
  returned: ["overdue", "submitted", "cancelled"],
  overdue: ["reassigned", "submitted", "cancelled"],
  reassigned: ["assigned", "accepted", "rejected", "reassigned", "cancelled"],
  cancelled: [],
}

export const ASSIGNMENT_TRANSITIONS: TransitionMap<
  SimulationAssignment["status"]
> = {
  assigned: ["accepted", "rejected", "expired", "escalated"],
  accepted: [],
  rejected: ["escalated"],
  expired: ["escalated"],
  escalated: [],
}

export function isValidTransition<State extends string>(
  map: TransitionMap<State>,
  from: State,
  to: State,
): boolean {
  return map[from]?.includes(to) ?? false
}

export function assertValidTransition<State extends string>(
  map: TransitionMap<State>,
  from: State,
  to: State,
): void {
  if (!isValidTransition(map, from, to))
    throw new Error(`Illegal state transition: ${from} -> ${to}`)
}
