import type {
  SimulationAssignment,
  SimulationEvent,
  SimulationMetric,
  SimulationMetricKey,
  SimulationProvenance,
  SimulationReview,
  SimulationSubmission,
  SimulationTaskResult,
} from "@zouma/contracts"

import { addHours, hoursBetween } from "./deterministic.ts"

export const FINAL_REVIEW_HORIZON_HOURS = 72

const DEFINITIONS: Record<SimulationMetricKey, string> = {
  acceptance_rate:
    "规定接单时间内已接单分配数 ÷ 观察窗口内已发出且执行者明确的有效分配数",
  on_time_submission_rate:
    "在 effectiveDueAt 之前提交的任务数 ÷ 已接单且已经到达 effectiveDueAt 的任务数",
  first_review_pass_rate:
    "第一次提交即审核通过的任务数 ÷ 已经完成首次审核的任务数",
  final_review_pass_rate:
    "最终通过的任务数 ÷ 最终有效提交后已获得至少72小时审核机会的任务数",
  reassignment_rate: "至少发生过一次重新分配的任务数 ÷ 已成功发出的任务数",
  overdue_rate:
    "超过 effectiveDueAt 仍未完成有效提交的任务数 ÷ 已到期且未取消的任务数",
  average_acceptance_hours:
    "所有成功接单任务 acceptedAt - assignedAt 的平均小时数",
  average_review_hours:
    "所有已完成审核任务 reviewCompletedAt - submittedAt 的平均小时数",
  review_return_rate: "首次审核被退回的任务数 ÷ 完成首次审核的任务数",
  rights_on_time_fulfillment_rate:
    "在约定权益时间前完成的权益数 ÷ 已到约定履约时间的权益数",
  anomaly_detection_rate:
    "被规则系统正确识别的异常事件数 ÷ 模拟世界中实际产生的异常事件数",
  assignment_fairness_cv:
    "村民任务数量标准差 ÷ 村民任务数量均值（任务负荷变异系数 CV）",
  manual_intervention_count: "运营人工介入事件总数",
}

function metric(
  provenance: SimulationProvenance,
  key: SimulationMetricKey,
  numerator: number,
  denominator: number,
  unit: SimulationMetric["unit"],
): SimulationMetric {
  return {
    ...provenance,
    key,
    numerator,
    denominator,
    value: denominator === 0 ? null : numerator / denominator,
    unit,
    definition: DEFINITIONS[key],
  }
}

export function calculateMetrics(
  tasks: SimulationTaskResult[],
  events: SimulationEvent[],
  villagerIds: string[],
  provenance: SimulationProvenance,
  context: {
    observationEnd?: string
    assignments?: SimulationAssignment[]
    reviews?: SimulationReview[]
    submissions?: SimulationSubmission[]
  } = {},
): Record<SimulationMetricKey, SimulationMetric> {
  const issued = tasks.filter((task) => task.assignmentAttempts > 0)
  const accepted = issued.filter((task) => task.acceptedAt)
  const validAssignments = (context.assignments ?? []).filter(
    (assignment) =>
      Boolean(assignment.villagerId) &&
      (!context.observationEnd ||
        assignment.assignedAt <= context.observationEnd),
  )
  const acceptedAssignments = validAssignments.filter(
    (assignment) => assignment.status === "accepted",
  )
  const reviewed = tasks.filter((task) => task.firstReviewPassed !== undefined)
  const finalReviewEligible = tasks.filter(
    (task) =>
      task.submittedAt &&
      (!context.observationEnd ||
        addHours(task.submittedAt, FINAL_REVIEW_HORIZON_HOURS) <=
          context.observationEnd),
  )
  const due = accepted.filter(
    (task) =>
      !context.observationEnd || task.effectiveDueAt <= context.observationEnd,
  )
  const firstPassed = reviewed.filter((task) => task.firstReviewPassed)
  const finalPassed = finalReviewEligible.filter(
    (task) => task.finalReviewPassed,
  )
  const reassigned = issued.filter((task) => task.assignmentAttempts > 1)
  const overdue = due.filter(
    (task) =>
      task.status === "overdue" ||
      !task.submittedAt ||
      task.submittedAt > task.effectiveDueAt,
  )
  const acceptanceHours = accepted.reduce(
    (sum, task) => sum + hoursBetween(task.assignedAt!, task.acceptedAt!),
    0,
  )

  const completedReviewEvents = events.filter(
    (event) =>
      event.eventType === "REVIEW_APPROVED" ||
      event.eventType === "REVIEW_RETURNED",
  )
  let reviewHours = 0
  if (context.reviews && context.submissions) {
    for (const review of context.reviews) {
      const submission = context.submissions.find(
        (item) => item.id === review.submissionId,
      )
      if (submission)
        reviewHours += Math.max(
          0,
          hoursBetween(submission.submittedAt, review.completedAt),
        )
    }
  } else {
    for (const event of completedReviewEvents) {
      const start = events.find(
        (candidate) =>
          candidate.eventType === "REVIEW_STARTED" &&
          candidate.entityId === event.entityId,
      )
      if (start)
        reviewHours += Math.max(
          0,
          hoursBetween(start.occurredAt, event.occurredAt),
        )
    }
  }
  const rightsTypes = new Set([
    "harvest",
    "packing",
    "shipping",
    "onsite_reception",
  ])
  const rights = tasks.filter(
    (task) =>
      rightsTypes.has(task.taskType) &&
      (!context.observationEnd ||
        new Date(task.effectiveDueAt).getTime() + 72 * 3_600_000 <=
          new Date(context.observationEnd).getTime()),
  )
  const anomalies = tasks.filter((task) => task.anomalyExpected)
  const detected = anomalies.filter((task) => task.anomalyDetected)
  const assignmentLoads = new Map(villagerIds.map((id) => [id, 0]))
  for (const task of tasks) {
    if (task.assignedVillagerId)
      assignmentLoads.set(
        task.assignedVillagerId,
        (assignmentLoads.get(task.assignedVillagerId) ?? 0) + 1,
      )
  }
  const loads = [...assignmentLoads.values()]
  const mean =
    loads.length === 0
      ? 0
      : loads.reduce((sum, value) => sum + value, 0) / loads.length
  const standardDeviation =
    loads.length === 0
      ? 0
      : Math.sqrt(
          loads.reduce((sum, value) => sum + (value - mean) ** 2, 0) /
            loads.length,
        )
  const manualCount = events.filter(
    (event) => event.eventType === "MANUAL_INTERVENTION",
  ).length

  return {
    acceptance_rate: metric(
      provenance,
      "acceptance_rate",
      acceptedAssignments.length,
      validAssignments.length,
      "ratio",
    ),
    on_time_submission_rate: metric(
      provenance,
      "on_time_submission_rate",
      due.filter(
        (task) =>
          task.status !== "overdue" &&
          task.submittedAt &&
          task.submittedAt <= task.effectiveDueAt,
      ).length,
      due.length,
      "ratio",
    ),
    first_review_pass_rate: metric(
      provenance,
      "first_review_pass_rate",
      firstPassed.length,
      reviewed.length,
      "ratio",
    ),
    final_review_pass_rate: metric(
      provenance,
      "final_review_pass_rate",
      finalPassed.length,
      finalReviewEligible.length,
      "ratio",
    ),
    reassignment_rate: metric(
      provenance,
      "reassignment_rate",
      reassigned.length,
      issued.length,
      "ratio",
    ),
    overdue_rate: metric(
      provenance,
      "overdue_rate",
      overdue.length,
      due.length,
      "ratio",
    ),
    average_acceptance_hours: metric(
      provenance,
      "average_acceptance_hours",
      acceptanceHours,
      accepted.length,
      "hours",
    ),
    average_review_hours: metric(
      provenance,
      "average_review_hours",
      reviewHours,
      context.reviews?.length ?? completedReviewEvents.length,
      "hours",
    ),
    review_return_rate: metric(
      provenance,
      "review_return_rate",
      reviewed.length - firstPassed.length,
      reviewed.length,
      "ratio",
    ),
    rights_on_time_fulfillment_rate: metric(
      provenance,
      "rights_on_time_fulfillment_rate",
      rights.filter((task) => task.rightsFulfilledOnTime).length,
      rights.length,
      "ratio",
    ),
    anomaly_detection_rate: metric(
      provenance,
      "anomaly_detection_rate",
      detected.length,
      anomalies.length,
      "ratio",
    ),
    assignment_fairness_cv: metric(
      provenance,
      "assignment_fairness_cv",
      standardDeviation,
      mean,
      "coefficient",
    ),
    manual_intervention_count: metric(
      provenance,
      "manual_intervention_count",
      manualCount,
      1,
      "count",
    ),
  }
}
