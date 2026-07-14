import type {
  PolicyVersion,
  SimulationAssignment,
  SimulationBadCase,
  SimulationEvent,
  SimulationEventType,
  SimulationFulfillment,
  SimulationProvenance,
  SimulationReview,
  SimulationRun,
  SimulationSubmission,
  SimulationTaskResult,
  SimulationTaskSeed,
  SimulationVillager,
  SimulationWorld,
} from "@zouma/contracts"

import { addHours, deterministicId, keyedRandom } from "./deterministic.ts"
import { CausalEventQueue } from "./event-queue.ts"
import { calculateMetrics } from "./metrics.ts"
import {
  ADOPTION_TRANSITIONS,
  ASSIGNMENT_TRANSITIONS,
  TASK_TRANSITIONS,
  assertValidTransition,
} from "./state-machine.ts"
import type { RunSimulationOptions } from "./run.ts"

const RIGHTS = new Set(["harvest", "packing", "shipping", "onsite_reception"])
type TaskContext = {
  seed: SimulationTaskSeed
  result?: SimulationTaskResult
  tried: Set<string>
  currentAssignment?: SimulationAssignment
  currentSubmission?: SimulationSubmission
  firstReviewed: boolean
}
type ReviewJob = {
  task: TaskContext
  submission: SimulationSubmission
  readyAt: string
  sequence: number
}

export function runCausalSimulation(
  world: SimulationWorld,
  policyVersion: PolicyVersion,
  options: RunSimulationOptions = {},
): SimulationRun {
  const policyRevision = options.policyRevision ?? `${policyVersion}-2026.07.13`
  const simulationRunId =
    options.simulationRunId ??
    deterministicId("run", [world.worldHash, policyVersion, policyRevision])
  const provenance: SimulationProvenance = {
    dataOrigin: "simulation",
    simulationRunId,
    policyVersion,
    policyRevision,
  }
  const observationEnd = addHours(
    world.config.startAt,
    world.config.durationDays * 24,
  )
  const queue = new CausalEventQueue()
  const events: SimulationEvent[] = [],
    tasks: SimulationTaskResult[] = [],
    assignments: SimulationAssignment[] = []
  const submissions: SimulationSubmission[] = [],
    reviews: SimulationReview[] = [],
    fulfillments: SimulationFulfillment[] = [],
    badCases: SimulationBadCase[] = []
  const dailyAccepted = new Map<string, number>(),
    pendingReviews: ReviewJob[] = [],
    exceptional = new Map<string, "cancelled" | "refunded" | "disputed">()
  const adoptionStatus = new Map<string, string>(),
    adoptionAdvanceScheduled = new Set<string>()
  const taskContexts = new Map<string, TaskContext>()
  const reviewerState = new Map(
    world.reviewers.map((reviewer) => [
      reviewer.id,
      {
        reviewer,
        busyUntil: undefined as string | undefined,
        daily: new Map<string, number>(),
      },
    ]),
  )
  const villagerAvailability = new Map(
    world.villagerAvailability.map((snapshot) => [
      `${snapshot.villagerId}:${snapshot.date}`,
      snapshot,
    ]),
  )
  const dispatchTimes = new Set<string>()
  const badCaseKeys = new Set<string>()
  const overdueTaskIds = new Set<string>()
  let eventSequence = 0,
    reviewSequence = 0,
    rosterCursor = 0
  const scheduleReviewDispatch = (at: string) => {
    if (dispatchTimes.has(at)) return
    dispatchTimes.add(at)
    queue.schedule(at, 0, ({ now }) => {
      dispatchTimes.delete(at)
      dispatchReviews(now)
    })
  }

  const emit = (
    eventType: SimulationEventType,
    now: string,
    entityType: SimulationEvent["entityType"],
    entityId: string,
    fields: Partial<SimulationEvent> = {},
  ) => {
    const event: SimulationEvent = {
      ...provenance,
      id: `event_${simulationRunId}_${String(++eventSequence).padStart(6, "0")}`,
      eventType,
      scenarioId: world.config.scenario,
      randomSeed: world.seed,
      entityType,
      entityId,
      occurredAt: now,
      actorType: "system",
      payload: {},
      ...fields,
    }
    if (event.fromStatus && event.toStatus && event.entityType === "adoption")
      assertValidTransition(
        ADOPTION_TRANSITIONS,
        event.fromStatus as keyof typeof ADOPTION_TRANSITIONS,
        event.toStatus as keyof typeof ADOPTION_TRANSITIONS,
      )
    if (
      event.fromStatus &&
      event.toStatus &&
      event.eventType.startsWith("ASSIGNMENT_")
    )
      assertValidTransition(
        ASSIGNMENT_TRANSITIONS,
        event.fromStatus as keyof typeof ASSIGNMENT_TRANSITIONS,
        event.toStatus as keyof typeof ASSIGNMENT_TRANSITIONS,
      )
    else if (event.fromStatus && event.toStatus && event.taskId)
      assertValidTransition(
        TASK_TRANSITIONS,
        event.fromStatus as keyof typeof TASK_TRANSITIONS,
        event.toStatus as keyof typeof TASK_TRANSITIONS,
      )
    events.push(event)
    return event
  }
  const trace = (taskId: string) =>
    events.filter((event) => event.taskId === taskId).map((event) => event.id)
  const bad = (
    ctx: TaskContext,
    category: SimulationBadCase["category"],
    now: string,
    title: string,
    description: string,
    severity: SimulationBadCase["severity"] = "medium",
  ) => {
    const key = `${ctx.seed.id}:${category}`
    if (badCaseKeys.has(key)) return
    const evidence = trace(ctx.seed.id)
    if (evidence.length) {
      badCaseKeys.add(key)
      badCases.push({
        ...provenance,
        id: deterministicId("bad", [
          simulationRunId,
          ctx.seed.id,
          category,
          now,
        ]),
        category,
        severity,
        adoptionId: ctx.seed.adoptionId,
        taskId: ctx.seed.id,
        title,
        description,
        eventIds: evidence,
      })
    }
  }
  const adoptionTasks = (adoptionId: string) =>
    [...taskContexts.values()].filter(
      (ctx) => ctx.seed.adoptionId === adoptionId,
    )
  const markOverdue = (ctx: TaskContext, now: string) => {
    const result = ctx.result!
    if (overdueTaskIds.has(result.id)) return
    const fromStatus = result.status
    result.status = "overdue"
    overdueTaskIds.add(result.id)
    emit("TASK_OVERDUE", now, "task", result.id, {
      adoptionId: result.adoptionId,
      taskId: result.id,
      fromStatus,
      toStatus: "overdue",
    })
    bad(
      ctx,
      "overdue",
      now,
      "任务逾期",
      "超过 effectiveDueAt 仍未形成最终有效提交。",
    )
  }
  const checkAdoption = (adoptionId: string, now: string) => {
    if (
      exceptional.has(adoptionId) ||
      adoptionStatus.get(adoptionId) !== "active" ||
      adoptionAdvanceScheduled.has(adoptionId)
    )
      return
    const required = adoptionTasks(adoptionId)
    if (
      !required.length ||
      !required.every(
        (ctx) =>
          ctx.result?.status === "completed" &&
          (!RIGHTS.has(ctx.seed.taskType) ||
            ctx.result.rightsFulfilledOnTime === true),
      )
    )
      return
    adoptionAdvanceScheduled.add(adoptionId)
    queue.schedule(addHours(now, 0.01), 1, ({ now: at }) => {
      adoptionStatus.set(adoptionId, "harvest_ready")
      emit("ADOPTION_STATUS_CHANGED", at, "adoption", adoptionId, {
        adoptionId,
        fromStatus: "active",
        toStatus: "harvest_ready",
      })
    })
    queue.schedule(addHours(now, 0.02), 1, ({ now: at }) => {
      adoptionStatus.set(adoptionId, "fulfillment_pending")
      emit("ADOPTION_FULFILLING", at, "adoption", adoptionId, {
        adoptionId,
      })
      emit("ADOPTION_STATUS_CHANGED", at, "adoption", adoptionId, {
        adoptionId,
        fromStatus: "harvest_ready",
        toStatus: "fulfillment_pending",
      })
    })
    queue.schedule(addHours(now, 0.03), 1, ({ now: at }) => {
      adoptionStatus.set(adoptionId, "completed")
      emit("ADOPTION_COMPLETED", at, "adoption", adoptionId, {
        adoptionId,
      })
      emit("ADOPTION_STATUS_CHANGED", at, "adoption", adoptionId, {
        adoptionId,
        fromStatus: "fulfillment_pending",
        toStatus: "completed",
      })
    })
  }
  const completeTask = (ctx: TaskContext, now: string) => {
    const result = ctx.result!
    if (result.status === "completed") return
    result.status = "completed"
    result.completedAt = now
    emit("TASK_COMPLETED", now, "task", result.id, {
      adoptionId: result.adoptionId,
      taskId: result.id,
      fromStatus: "approved",
      toStatus: "completed",
    })
    queue.schedule(addHours(now, 0.001), 0, ({ now: at }) =>
      emit("TASK_SETTLED", at, "task", result.id, {
        adoptionId: result.adoptionId,
        taskId: result.id,
        actorType: "operator",
        payload: { settlementType: "simulation" },
      }),
    )
    if (!RIGHTS.has(result.taskType))
      queue.schedule(addHours(now, 0.002), 0, ({ now: at }) =>
        emit("GROWTH_UPDATE_SENT", at, "task", result.id, {
          adoptionId: result.adoptionId,
          taskId: result.id,
        }),
      )
    checkAdoption(result.adoptionId, now)
  }

  const dispatchReviews = (now: string) => {
    const ready = pendingReviews.filter((job) => job.readyAt <= now)
    if (!ready.length) return
    ready.sort((a, b) =>
      policyVersion === "V0"
        ? a.readyAt.localeCompare(b.readyAt) || a.sequence - b.sequence
        : (RIGHTS.has(b.task.seed.taskType) ? 100 : 0) +
            b.task.seed.priority * 10 -
            ((RIGHTS.has(a.task.seed.taskType) ? 100 : 0) +
              a.task.seed.priority * 10) ||
          a.readyAt.localeCompare(b.readyAt) ||
          a.sequence - b.sequence,
    )
    for (const state of reviewerState.values()) {
      if (
        !state.reviewer.available ||
        (state.busyUntil && state.busyUntil > now)
      )
        continue
      const day = now.slice(0, 10),
        used = state.daily.get(day) ?? 0
      if (used >= state.reviewer.dailyCapacity) continue
      const job = ready.shift()
      if (!job) break
      pendingReviews.splice(pendingReviews.indexOf(job), 1)
      state.daily.set(day, used + 1)
      const reviewId = `review_${job.task.seed.id}_${job.submission.attempt}`
      emit("REVIEW_STARTED", now, "review", reviewId, {
        adoptionId: job.task.seed.adoptionId,
        taskId: job.task.seed.id,
        actorId: state.reviewer.id,
        actorType: "reviewer",
      })
      const multiplier =
        world.scenarioSnapshot.reviewDelayMultiplier *
        (policyVersion === "V1"
          ? job.task.seed.priority === 3
            ? 0.45
            : 0.7
          : 1)
      const completedAt = addHours(now, job.task.seed.reviewHours * multiplier)
      state.busyUntil = completedAt
      queue.schedule(
        completedAt,
        job.task.seed.priority,
        ({ now: at, schedule }) => {
          state.busyUntil = undefined
          const q = job.submission.quality,
            passed =
              q.taskResultValid &&
              q.photoClarity >= 0.4 &&
              q.duplicatePhotoRisk < 0.82
          const review: SimulationReview = {
            ...provenance,
            id: reviewId,
            taskId: job.task.seed.id,
            submissionId: job.submission.id,
            reviewerId: state.reviewer.id,
            attempt: job.submission.attempt,
            status: passed ? "approved" : "returned",
            startedAt: now,
            completedAt: at,
            reasons: passed ? [] : ["模拟提交质量未达到规则阈值"],
          }
          reviews.push(review)
          emit(
            passed ? "REVIEW_APPROVED" : "REVIEW_RETURNED",
            at,
            "review",
            review.id,
            {
              adoptionId: job.task.seed.adoptionId,
              taskId: job.task.seed.id,
              actorId: state.reviewer.id,
              actorType: "reviewer",
              fromStatus: "submitted",
              toStatus: passed ? "approved" : "returned",
              payload: { reasons: review.reasons },
            },
          )
          const result = job.task.result!
          if (!job.task.firstReviewed) {
            result.firstReviewPassed = passed
            if (!passed)
              bad(
                job.task,
                "quality_return",
                at,
                "首次审核退回",
                "首次有效提交未通过模拟质量规则。",
              )
            job.task.firstReviewed = true
          }
          if (passed) {
            result.finalReviewPassed = true
            result.approvedAt = at
            result.status = "approved"
            if (RIGHTS.has(result.taskType)) {
              const promisedAt = addHours(result.effectiveDueAt, 72),
                delay =
                  12 +
                  keyedRandom(world.seed, result.id, "logistics-delay") *
                    (world.config.scenario === "HARVEST_PEAK" ? 96 : 48)
              schedule(
                addHours(at, delay),
                result.taskType === "shipping" ? 3 : 2,
                ({ now: fulfilledAt }) => {
                  const fulfillment: SimulationFulfillment = {
                    ...provenance,
                    id: `fulfillment_${result.id}`,
                    adoptionId: result.adoptionId,
                    taskId: result.id,
                    type: result.taskType as SimulationFulfillment["type"],
                    promisedAt,
                    completedAt: fulfilledAt,
                    onTime: fulfilledAt <= promisedAt,
                  }
                  fulfillments.push(fulfillment)
                  result.rightsFulfilledOnTime = fulfillment.onTime
                  emit(
                    result.taskType === "harvest"
                      ? "HARVEST_COMPLETED"
                      : result.taskType === "shipping"
                        ? "PACKAGE_SHIPPED"
                        : "BENEFIT_FULFILLED",
                    fulfilledAt,
                    "fulfillment",
                    fulfillment.id,
                    {
                      adoptionId: result.adoptionId,
                      taskId: result.id,
                      payload: { promisedAt, onTime: fulfillment.onTime },
                    },
                  )
                  completeTask(job.task, fulfilledAt)
                  if (!fulfillment.onTime)
                    bad(
                      job.task,
                      "rights_delay",
                      fulfilledAt,
                      "权益履约延迟",
                      "权益完成时间超过模拟约定时间。",
                      "high",
                    )
                },
              )
            } else completeTask(job.task, at)
          } else {
            result.finalReviewPassed = false
            result.status = "returned"
            if (at > result.effectiveDueAt) markOverdue(job.task, at)
            schedule(
              addHours(at, policyVersion === "V1" ? 5 : 12),
              1,
              ({ now: correctedAt }) => {
                const previous = job.submission,
                  attempt = previous.attempt + 1
                const corrected: SimulationSubmission = {
                  ...previous,
                  id: `submission_${result.id}_${attempt}`,
                  attempt,
                  submittedAt: correctedAt,
                  precheckPassed: policyVersion === "V1" ? true : undefined,
                  quality: {
                    ...previous.quality,
                    taskResultValid: true,
                    photoClarity: Math.max(0.65, previous.quality.photoClarity),
                    fieldCompleteness: 1,
                    duplicatePhotoRisk: Math.min(
                      0.4,
                      previous.quality.duplicatePhotoRisk,
                    ),
                  },
                }
                submissions.push(corrected)
                job.task.currentSubmission = corrected
                result.submittedAt = correctedAt
                const correctionFromStatus = result.status
                result.status = "submitted"
                emit(
                  "TASK_SUBMITTED",
                  correctedAt,
                  "submission",
                  corrected.id,
                  {
                    adoptionId: result.adoptionId,
                    taskId: result.id,
                    actorId: result.assignedVillagerId,
                    actorType: "villager",
                    fromStatus: correctionFromStatus,
                    toStatus: "submitted",
                  },
                )
                pendingReviews.push({
                  task: job.task,
                  submission: corrected,
                  readyAt: correctedAt,
                  sequence: reviewSequence++,
                })
                scheduleReviewDispatch(correctedAt)
              },
            )
          }
          scheduleReviewDispatch(at)
        },
      )
    }
    if (pendingReviews.length > 0) {
      const nextTimes: string[] = []
      for (const state of reviewerState.values()) {
        if (!state.reviewer.available) continue
        if (state.busyUntil && state.busyUntil > now)
          nextTimes.push(state.busyUntil)
        const used = state.daily.get(now.slice(0, 10)) ?? 0
        if (used >= state.reviewer.dailyCapacity) {
          const next = new Date(now)
          next.setUTCDate(next.getUTCDate() + 1)
          next.setUTCHours(0, 0, 0, 0)
          nextTimes.push(next.toISOString())
        }
      }
      if (nextTimes.length) scheduleReviewDispatch(nextTimes.sort()[0]!)
    }
  }

  const validSubmit = (
    ctx: TaskContext,
    submission: SimulationSubmission,
    now: string,
    fromStatus: "in_progress" | "overdue" | "returned",
  ) => {
    submissions.push(submission)
    ctx.currentSubmission = submission
    const result = ctx.result!
    result.submittedAt = now
    result.status = "submitted"
    emit("TASK_SUBMITTED", now, "submission", submission.id, {
      adoptionId: result.adoptionId,
      taskId: result.id,
      actorId: result.assignedVillagerId,
      actorType: "villager",
      fromStatus,
      toStatus: "submitted",
    })
    if (
      result.anomalyExpected &&
      ctx.seed.anomalyRoll < (policyVersion === "V1" ? 0.14 : 0.08)
    ) {
      result.anomalyDetected = true
      emit("ANOMALY_DETECTED", now, "submission", submission.id, {
        adoptionId: result.adoptionId,
        taskId: result.id,
      })
    }
    pendingReviews.push({
      task: ctx,
      submission,
      readyAt: now,
      sequence: reviewSequence++,
    })
    scheduleReviewDispatch(now)
  }

  const executeComplete = (ctx: TaskContext, now: string) => {
    const result = ctx.result!,
      penalty = world.scenarioSnapshot.qualityPenalty,
      bonus = policyVersion === "V1" ? 0.18 : 0
    const score = Math.max(
      0,
      Math.min(1, ctx.seed.qualityRoll - penalty + bonus),
    )
    const quality = {
      photoClarity: Number(
        Math.max(0, ctx.seed.clarityRoll - penalty / 2).toFixed(4),
      ),
      fieldCompleteness: Number(
        Math.min(1, score + (policyVersion === "V1" ? 0.15 : 0)).toFixed(4),
      ),
      evidenceConsistency: Number(
        Math.min(1, (score + ctx.seed.clarityRoll) / 2).toFixed(4),
      ),
      descriptionQuality: Number(score.toFixed(4)),
      duplicatePhotoRisk: Number(
        Math.max(
          0,
          ctx.seed.duplicateRoll - (policyVersion === "V1" ? 0.2 : 0),
        ).toFixed(4),
      ),
      taskResultValid: score >= 0.45,
    }
    const precheck =
      policyVersion === "V0" ||
      (quality.photoClarity >= 0.35 &&
        quality.fieldCompleteness >= 0.5 &&
        quality.duplicatePhotoRisk < 0.8)
    const initial: SimulationSubmission = {
      ...provenance,
      id: `submission_${result.id}_1`,
      taskId: result.id,
      villagerId: result.assignedVillagerId!,
      attempt: 1,
      submittedAt: now,
      structured: policyVersion === "V1",
      quality,
      precheckPassed: precheck,
    }
    if (!precheck) {
      submissions.push(initial)
      emit("SUBMISSION_PRECHECK_FAILED", now, "submission", initial.id, {
        adoptionId: result.adoptionId,
        taskId: result.id,
        payload: {
          checkName: "基于规则的模拟凭证检查",
          checks: {
            photoCount: quality.fieldCompleteness >= 0.5,
            clarity: quality.photoClarity >= 0.35,
            duplicate: quality.duplicatePhotoRisk < 0.8,
            fieldCompleteness: quality.fieldCompleteness >= 0.5,
            treeCode: quality.evidenceConsistency >= 0.4,
            executionTime: ctx.seed.executionHours <= 120,
            descriptionLength: quality.descriptionQuality >= 0.45,
          },
        },
      })
      queue.schedule(addHours(now, 3), 1, ({ now: correctedAt }) =>
        validSubmit(
          ctx,
          {
            ...initial,
            id: `submission_${result.id}_2`,
            attempt: 2,
            submittedAt: correctedAt,
            precheckPassed: true,
            quality: {
              ...quality,
              photoClarity: Math.max(0.55, quality.photoClarity),
              fieldCompleteness: Math.max(0.7, quality.fieldCompleteness),
              duplicatePhotoRisk: Math.min(0.4, quality.duplicatePhotoRisk),
              taskResultValid: true,
            },
          },
          correctedAt,
          correctedAt > result.effectiveDueAt ? "overdue" : "in_progress",
        ),
      )
    } else
      validSubmit(
        ctx,
        initial,
        now,
        now > result.effectiveDueAt ? "overdue" : "in_progress",
      )
  }

  const assign = (ctx: TaskContext, now: string) => {
    const result = ctx.result!,
      attempt =
        assignments.filter((item) => item.taskId === result.id).length + 1,
      max = policyVersion === "V1" ? 3 : 4
    const activeLoad = (villagerId: string) =>
      tasks.filter(
        (task) =>
          task.assignedVillagerId === villagerId &&
          task.acceptedAt &&
          task.acceptedAt <= now &&
          (!task.completedAt || now < task.completedAt),
      ).length
    const roster = world.villagers
      .filter((villager) => villager.available)
      .sort((a, b) => a.id.localeCompare(b.id))
    const available = roster.filter((villager) => {
      const snapshot = villagerAvailability.get(
        `${villager.id}:${now.slice(0, 10)}`,
      )
      return (
        snapshot?.available === true &&
        !ctx.tried.has(villager.id) &&
        (dailyAccepted.get(`${villager.id}:${now.slice(0, 10)}`) ?? 0) <
          villager.dailyCapacity
      )
    })
    const ranked = available
      .map((villager) => ({
        villager,
        score:
          policyVersion === "V0"
            ? 0
            : (villager.skills.includes(result.taskType) ? 1 : 0.5) * 0.3 +
              (villager.zone === result.zone
                ? 1
                : villager.zone === "mid" || result.zone === "mid"
                  ? 0.6
                  : 0.2) *
                0.2 +
              (1 -
                Math.min(
                  1,
                  activeLoad(villager.id) / Math.max(1, villager.dailyCapacity),
                )) *
                0.2 +
              villager.reliability * 0.2 +
              (villagerAvailability.get(`${villager.id}:${now.slice(0, 10)}`)
                ?.availabilityScore ?? 0) *
                0.1,
      }))
      .sort((a, b) =>
        policyVersion === "V0"
          ? a.villager.id.localeCompare(b.villager.id)
          : b.score - a.score || a.villager.id.localeCompare(b.villager.id),
      )
    let candidate: { villager: SimulationVillager; score: number } | undefined =
      ranked[0]
    if (policyVersion === "V0" && roster.length) {
      candidate = undefined
      for (let offset = 0; offset < roster.length; offset += 1) {
        const index = (rosterCursor + offset) % roster.length,
          villager = roster[index]!
        if (available.includes(villager)) {
          candidate = { villager, score: 0 }
          rosterCursor = (index + 1) % roster.length
          break
        }
      }
    }
    if (!candidate || attempt > max) {
      emit("MANUAL_INTERVENTION", now, "task", result.id, {
        adoptionId: result.adoptionId,
        taskId: result.id,
        actorType: "operator",
        payload: { reason: "assignment_attempts_exhausted" },
      })
      bad(
        ctx,
        "assignment_exhausted",
        now,
        "任务无执行者接单",
        "规则允许的分配尝试已用尽。",
        "high",
      )
      return
    }
    const previousTaskStatus = result.status
    ctx.tried.add(candidate.villager.id)
    result.assignmentAttempts = attempt
    result.assignedAt ??= now
    result.status = attempt === 1 ? "assigned" : "reassigned"
    const deadline = addHours(now, policyVersion === "V1" ? 2 : 12),
      assignment: SimulationAssignment = {
        ...provenance,
        id: `assignment_${result.id}_${attempt}`,
        taskId: result.id,
        villagerId: candidate.villager.id,
        attempt,
        status: "assigned",
        assignedAt: now,
        responseDeadlineAt: deadline,
        score:
          policyVersion === "V1"
            ? Number(candidate.score.toFixed(6))
            : undefined,
      }
    assignments.push(assignment)
    ctx.currentAssignment = assignment
    emit(
      attempt === 1 ? "TASK_ASSIGNED" : "TASK_REASSIGNED",
      now,
      "assignment",
      assignment.id,
      {
        adoptionId: result.adoptionId,
        taskId: result.id,
        actorId: candidate.villager.id,
        fromStatus: previousTaskStatus,
        toStatus: result.status,
        payload: {
          attempt,
          responseDeadlineAt: deadline,
          score: assignment.score,
          loadAtAssignment: activeLoad(candidate.villager.id),
        },
      },
    )
    const noResponse =
      keyedRandom(
        world.seed,
        `${result.id}:${candidate.villager.id}`,
        "response-timeout",
      ) < 0.16
    const willingness = keyedRandom(
      world.seed,
      `${result.id}:${candidate.villager.id}`,
      "accept-willingness",
    )
    const acceptanceThreshold = candidate.villager.reliability * 0.9
    const responseAt = addHours(
      now,
      policyVersion === "V1"
        ? 0.25 + ctx.seed.acceptRoll * 1.5
        : 1 + ctx.seed.acceptRoll * 10,
    )
    if (noResponse)
      queue.schedule(deadline, 2, ({ now: at }) => {
        assignment.status =
          policyVersion === "V1" && attempt === 3 ? "escalated" : "expired"
        emit(
          assignment.status === "escalated"
            ? "ASSIGNMENT_ESCALATED"
            : "ASSIGNMENT_EXPIRED",
          at,
          "assignment",
          assignment.id,
          {
            adoptionId: result.adoptionId,
            taskId: result.id,
            fromStatus: "assigned",
            toStatus: assignment.status,
            payload: { attempt, deadline, responseDeadlineAt: deadline },
          },
        )
        if (assignment.status === "escalated") {
          emit("MANUAL_INTERVENTION", at, "task", result.id, {
            adoptionId: result.adoptionId,
            taskId: result.id,
            actorType: "operator",
            payload: { reason: "three_candidate_timeout" },
          })
          bad(
            ctx,
            "assignment_exhausted",
            at,
            "三次自动转派已耗尽",
            "三名候选人均未在接单窗口响应。",
            "high",
          )
        } else {
          if (policyVersion === "V0")
            emit("MANUAL_INTERVENTION", at, "task", result.id, {
              adoptionId: result.adoptionId,
              taskId: result.id,
              actorType: "operator",
              payload: { reason: "manual_reassignment_after_timeout" },
            })
          queue.schedule(addHours(at, 0.01), 1, ({ now: next }) =>
            assign(ctx, next),
          )
        }
      })
    else
      queue.schedule(responseAt, 2, ({ now: at }) => {
        assignment.respondedAt = at
        const capacityKey = `${candidate.villager.id}:${assignment.assignedAt.slice(0, 10)}`
        const capacityAvailable =
          (dailyAccepted.get(capacityKey) ?? 0) <
          candidate.villager.dailyCapacity
        if (capacityAvailable && willingness < acceptanceThreshold) {
          assignment.status = "accepted"
          result.status = "accepted"
          result.acceptedAt = at
          result.assignedVillagerId = candidate.villager.id
          dailyAccepted.set(
            capacityKey,
            (dailyAccepted.get(capacityKey) ?? 0) + 1,
          )
          emit("TASK_ACCEPTED", at, "assignment", assignment.id, {
            adoptionId: result.adoptionId,
            taskId: result.id,
            actorId: candidate.villager.id,
            actorType: "villager",
            fromStatus: attempt === 1 ? "assigned" : "reassigned",
            toStatus: "accepted",
          })
          let executionStart = addHours(at, 0.5)
          const executionDuration =
            ctx.seed.executionHours * (ctx.seed.zone === "remote" ? 1.15 : 1)
          if (
            policyVersion === "V1" &&
            result.taskType === "watering" &&
            world.config.weatherEnabled
          ) {
            const heavy = world.weather.filter(
              (day) => day.condition === "heavy_rain",
            )
            const overlaps = heavy.some(
              (day) =>
                day.date < addHours(executionStart, executionDuration) &&
                addHours(day.date, 24) > executionStart,
            )
            if (overlaps) {
              const previousDueAt = result.effectiveDueAt
              executionStart = heavy
                .map((day) => addHours(day.date, 24))
                .sort()
                .at(-1)!
              result.effectiveDueAt = [
                previousDueAt,
                addHours(executionStart, executionDuration + 3),
              ]
                .sort()
                .at(-1)!
              emit("WEATHER_DELAY_APPROVED", at, "task", result.id, {
                adoptionId: result.adoptionId,
                taskId: result.id,
                actorType: "operator",
                payload: {
                  previousDueAt,
                  effectiveDueAt: result.effectiveDueAt,
                  weatherResumeAt: executionStart,
                },
              })
            }
          }
          queue.schedule(executionStart, 1, ({ now: started }) => {
            const fromStatus = result.status
            result.status = "in_progress"
            emit("TASK_STARTED", started, "task", result.id, {
              adoptionId: result.adoptionId,
              taskId: result.id,
              actorId: candidate.villager.id,
              actorType: "villager",
              fromStatus,
              toStatus: "in_progress",
              payload: { weatherResumeAt: executionStart },
            })
          })
          for (const hours of policyVersion === "V1" ? [24, 6] : [12]) {
            const reminderAt = addHours(result.effectiveDueAt, -hours)
            if (reminderAt >= at)
              queue.schedule(reminderAt, 0, ({ now: reminder }) => {
                const load = activeLoad(candidate.villager.id),
                  reliabilityRisk = 1 - candidate.villager.reliability,
                  difficultyRisk = ctx.seed.priority / 3,
                  distanceRisk =
                    ctx.seed.zone === "remote"
                      ? 1
                      : ctx.seed.zone === "mid"
                        ? 0.5
                        : 0,
                  loadRisk = Math.min(1, load / 3)
                emit("REMINDER_SENT", reminder, "task", result.id, {
                  adoptionId: result.adoptionId,
                  taskId: result.id,
                  payload: {
                    hoursBeforeDue: hours,
                    difficultyRisk,
                    distanceRisk,
                    loadRisk,
                    reliabilityRisk,
                    isAtRisk:
                      (difficultyRisk +
                        distanceRisk +
                        loadRisk +
                        reliabilityRisk) /
                        4 >=
                      0.5,
                  },
                })
              })
          }
          queue.schedule(result.effectiveDueAt, 0, ({ now: due }) => {
            if (!result.submittedAt || result.status === "returned")
              markOverdue(ctx, due)
          })
          queue.schedule(
            addHours(executionStart, executionDuration),
            1,
            ({ now: completed }) => executeComplete(ctx, completed),
          )
        } else {
          const rejectedFrom = result.status
          assignment.status = "rejected"
          result.status = "rejected"
          emit("TASK_REJECTED", at, "assignment", assignment.id, {
            adoptionId: result.adoptionId,
            taskId: result.id,
            actorId: candidate.villager.id,
            actorType: "villager",
            fromStatus: rejectedFrom,
            toStatus: "rejected",
            payload: { attempt, willingness, acceptanceThreshold },
          })
          if (policyVersion === "V0")
            queue.schedule(addHours(at, 0.001), 2, ({ now: manualAt }) =>
              emit("MANUAL_INTERVENTION", manualAt, "task", result.id, {
                adoptionId: result.adoptionId,
                taskId: result.id,
                actorType: "operator",
                payload: { reason: "manual_reassignment_after_rejection" },
              }),
            )
          if (attempt >= max) {
            queue.schedule(addHours(at, 0.001), 1, ({ now: manualAt }) => {
              emit("MANUAL_INTERVENTION", manualAt, "task", result.id, {
                adoptionId: result.adoptionId,
                taskId: result.id,
                actorType: "operator",
                payload: {
                  reason: "assignment_attempts_exhausted_after_rejection",
                  attempt,
                },
              })
              bad(
                ctx,
                "assignment_exhausted",
                manualAt,
                "任务无执行者接单",
                "规则允许的分配尝试已用尽。",
                "high",
              )
            })
          } else
            queue.schedule(addHours(at, 0.01), 1, ({ now: next }) =>
              assign(ctx, next),
            )
        }
      })
  }

  const seeds = [...world.tasks]
  if (
    policyVersion === "V1" &&
    world.config.weatherEnabled &&
    world.config.scenario === "CONTINUOUS_RAIN"
  )
    for (const source of world.tasks
      .filter(
        (task) =>
          task.taskType === "watering" &&
          world.weather.some(
            (day) =>
              day.condition === "heavy_rain" &&
              day.date < task.dueAt &&
              addHours(day.date, 24) > task.createdAt,
          ),
      )
      .slice(0, 20)) {
      seeds.push({
        ...source,
        id: `${source.id}_drainage`,
        taskType: "drainage",
        priority: 3,
        createdAt: addHours(source.createdAt, 24),
        dueAt: addHours(source.dueAt, 48),
      })
      seeds.push({
        ...source,
        id: `${source.id}_pest`,
        taskType: "pest_inspection",
        priority: 3,
        createdAt: addHours(source.createdAt, 24),
        dueAt: addHours(source.dueAt, 48),
      })
    }
  for (const seed of seeds) {
    const ctx: TaskContext = { seed, tried: new Set(), firstReviewed: false }
    taskContexts.set(seed.id, ctx)
    queue.schedule(seed.createdAt, seed.priority, ({ now }) => {
      const result: SimulationTaskResult = {
        ...provenance,
        id: seed.id,
        adoptionId: seed.adoptionId,
        treeId: seed.treeId,
        taskType: seed.taskType,
        status: "created",
        zone: seed.zone,
        assignmentAttempts: 0,
        createdAt: now,
        dueAt: seed.dueAt,
        effectiveDueAt: seed.dueAt,
        anomalyExpected: world.config.anomalyEnabled && seed.anomalyRoll < 0.15,
      }
      ctx.result = result
      tasks.push(result)
      emit("TASK_CREATED", now, "task", seed.id, {
        adoptionId: seed.adoptionId,
        taskId: seed.id,
        toStatus: "created",
        payload: { taskType: seed.taskType },
      })
      if (exceptional.has(seed.adoptionId)) {
        queue.schedule(addHours(now, 0.001), 1, ({ now: at }) => {
          result.status = "cancelled"
          emit("TASK_CANCELLED", at, "task", seed.id, {
            adoptionId: seed.adoptionId,
            taskId: seed.id,
            fromStatus: "created",
            toStatus: "cancelled",
          })
        })
        return
      }
      assign(ctx, now)
    })
  }
  for (const adoption of world.adoptions)
    queue.schedule(adoption.createdAt, 5, ({ now, schedule }) => {
      adoptionStatus.set(adoption.id, "created")
      emit("ADOPTION_CREATED", now, "adoption", adoption.id, {
        adoptionId: adoption.id,
        toStatus: "created",
      })
      if (!adoption.treeId || adoption.status !== "active") {
        schedule(addHours(now, 1), 5, ({ now: at }) => {
          const event = emit(
            "INVENTORY_SHORTAGE",
            at,
            "adoption",
            adoption.id,
            { adoptionId: adoption.id, actorType: "operator" },
          )
          badCases.push({
            ...provenance,
            id: deterministicId("bad", [
              simulationRunId,
              adoption.id,
              "inventory",
            ]),
            category: "inventory_shortage",
            severity: "high",
            adoptionId: adoption.id,
            title: "认养订单无可用唯一果树",
            description: "订单超过唯一果树库存。",
            eventIds: [event.id],
          })
        })
        return
      }
      schedule(addHours(now, 0.25), 5, ({ now: at }) => {
        adoptionStatus.set(adoption.id, "pending_payment")
        emit("ADOPTION_STATUS_CHANGED", at, "adoption", adoption.id, {
          adoptionId: adoption.id,
          fromStatus: "created",
          toStatus: "pending_payment",
        })
      })
      schedule(addHours(now, 1), 5, ({ now: at }) =>
        emit("TREE_ASSIGNED", at, "tree", adoption.treeId!, {
          adoptionId: adoption.id,
        }),
      )
      schedule(addHours(now, 2), 5, ({ now: at }) => {
        adoptionStatus.set(adoption.id, "paid")
        emit("ADOPTION_PAID", at, "adoption", adoption.id, {
          adoptionId: adoption.id,
        })
        emit("ADOPTION_STATUS_CHANGED", at, "adoption", adoption.id, {
          adoptionId: adoption.id,
          fromStatus: "pending_payment",
          toStatus: "paid",
        })
      })
      schedule(addHours(now, 3), 5, ({ now: at }) => {
        adoptionStatus.set(adoption.id, "active")
        emit("ADOPTION_ACTIVATED", at, "adoption", adoption.id, {
          adoptionId: adoption.id,
        })
        emit("ADOPTION_STATUS_CHANGED", at, "adoption", adoption.id, {
          adoptionId: adoption.id,
          fromStatus: "paid",
          toStatus: "active",
        })
        const ordinal = Number.parseInt(adoption.id.slice(-4), 10),
          status =
            ordinal % 100 === 50
              ? "cancelled"
              : ordinal % 100 === 75
                ? "refunded"
                : ordinal % 100 === 0
                  ? "disputed"
                  : undefined
        if (status) {
          exceptional.set(adoption.id, status)
          schedule(addHours(at, 1), 4, ({ now: exceptionAt }) => {
            adoptionStatus.set(adoption.id, status)
            emit(
              status === "cancelled"
                ? "ADOPTION_CANCELLED"
                : status === "refunded"
                  ? "ADOPTION_REFUNDED"
                  : "ADOPTION_DISPUTED",
              exceptionAt,
              "adoption",
              adoption.id,
              {
                adoptionId: adoption.id,
              },
            )
            emit(
              "ADOPTION_STATUS_CHANGED",
              exceptionAt,
              "adoption",
              adoption.id,
              {
                adoptionId: adoption.id,
                fromStatus: "active",
                toStatus: status,
              },
            )
          })
        } else checkAdoption(adoption.id, at)
      })
    })
  queue.schedule(observationEnd, -100, ({ now }) => {
    const backlogTasks = new Set<string>()
    for (const submission of submissions.filter(
      (item) => item.precheckPassed !== false && item.submittedAt <= now,
    )) {
      const reviewId = `review_${submission.taskId}_${submission.attempt}`
      if (
        !events.some(
          (event) =>
            event.eventType === "REVIEW_STARTED" && event.entityId === reviewId,
        ) &&
        !backlogTasks.has(submission.taskId)
      ) {
        const ctx = taskContexts.get(submission.taskId)
        if (ctx) {
          bad(
            ctx,
            "review_backlog",
            now,
            "模拟审核积压",
            "有效提交已进入审核队列但尚未开始审核。",
          )
          backlogTasks.add(submission.taskId)
        }
      }
    }
    for (const ctx of taskContexts.values())
      if (
        ctx.result?.anomalyExpected &&
        !ctx.result.anomalyDetected &&
        ctx.result.effectiveDueAt <= now
      )
        bad(
          ctx,
          "anomaly_missed",
          now,
          "模拟异常未识别",
          "观察窗口内异常未被规则识别。",
          "high",
        )
    for (const ctx of taskContexts.values())
      if (
        ctx.result &&
        RIGHTS.has(ctx.result.taskType) &&
        addHours(ctx.result.effectiveDueAt, 72) <= now &&
        ctx.result.rightsFulfilledOnTime !== true
      )
        bad(
          ctx,
          "rights_delay",
          now,
          "权益未按期履约",
          "约定权益时间已到但尚未完成按时履约。",
          "high",
        )
    emit("SIMULATION_COMPLETED", now, "simulation", simulationRunId)
  })
  queue.runUntil(observationEnd)
  for (const badCase of badCases)
    if (badCase.taskId) badCase.eventIds = trace(badCase.taskId)
  const metrics = calculateMetrics(
    tasks,
    events,
    world.villagers.filter((v) => v.available).map((v) => v.id),
    provenance,
    { observationEnd, assignments, reviews, submissions },
  )
  return {
    ...provenance,
    pairId: options.pairId,
    worldHash: world.worldHash,
    seed: world.seed,
    scenario: world.config.scenario,
    config: {
      ...world.config,
      tasksPerAdoption: { ...world.config.tasksPerAdoption },
    },
    status: "completed",
    startedAt: world.config.startAt,
    completedAt: observationEnd,
    tasks,
    assignments,
    submissions,
    reviews,
    fulfillments,
    events,
    badCases,
    metrics,
  }
}
