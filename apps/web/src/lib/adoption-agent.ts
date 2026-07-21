import { prisma, type Prisma } from "@zouma/database"
import type {
  AdoptionAgentSuggestion,
  AdoptionRecommendationType,
} from "@zouma/contracts"
import { ModelProviderAdapter } from "@zouma/utils"

import { extractJsonContent } from "@web/lib/ai-json"
import { getWeatherSummary } from "@web/lib/weather"
import { normalizeAdoptionSuggestion } from "@web/lib/adoption-agent-schema"

const recommendationTypeByRisk: Record<
  AdoptionAgentSuggestion["riskType"],
  AdoptionRecommendationType
> = {
  deadline: "adoption_deadline_risk",
  unclaimed: "adoption_unclaimed_task",
  evidence: "adoption_evidence_incomplete",
  weather: "adoption_weather_delay",
  repeated_exception: "adoption_repeated_exception",
}

export async function runAdoptionAgent(input: {
  triggerType: "manual" | "daily" | "deadline"
  adoptionId?: string
  taskId?: string
  limit?: number
}) {
  const startedAt = Date.now()
  const tasks = await prisma.task.findMany({
    where: {
      adoptionId: input.adoptionId ? input.adoptionId : { not: null },
      ...(input.taskId ? { id: input.taskId } : {}),
      status: {
        in: [
          "pending",
          "accepted",
          "in_progress",
          "submitted",
          "rejected",
          "exception_reported",
          "overdue",
        ],
      },
    },
    orderBy: [{ deadlineAt: "asc" }, { createdAt: "asc" }],
    take: Math.max(1, Math.min(input.limit ?? 10, 20)),
  })
  const results = []
  for (const task of tasks) {
    if (Date.now() - startedAt > 45_000) break
    const run = await prisma.agentRun.create({
      data: {
        adoptionId: task.adoptionId,
        taskId: task.id,
        triggerType: input.triggerType,
        status: "running",
        promptVersion: "adoption-agent-v1",
      },
    })
    const toolResults: Record<string, unknown> = {}
    try {
      toolResults.adoption = await callTool(
        run.id,
        "get_adoption_summary",
        { adoptionId: task.adoptionId },
        () =>
          prisma.treeAdoption.findUnique({
            where: { id: task.adoptionId! },
            select: {
              id: true,
              plan: true,
              status: true,
              treeId: true,
              rightsJson: true,
            },
          }),
      )
      toolResults.tasks = await callTool(
        run.id,
        "list_fulfillment_tasks",
        { adoptionId: task.adoptionId },
        () =>
          prisma.task.findMany({
            where: { adoptionId: task.adoptionId },
            select: {
              id: true,
              status: true,
              taskType: true,
              deadlineAt: true,
              villagerId: true,
              version: true,
            },
            take: 20,
          }),
      )
      toolResults.evidence = await callTool(
        run.id,
        "get_fulfillment_evidence",
        { taskId: task.id },
        () =>
          prisma.fulfillmentEvidence.findMany({
            where: { taskId: task.id },
            select: {
              id: true,
              version: true,
              status: true,
              submittedAt: true,
              mediaJson: true,
            },
            orderBy: { version: "desc" },
            take: 5,
          }),
      )
      if (task.villagerId) {
        toolResults.workload = await callTool(
          run.id,
          "get_villager_workload",
          { villagerId: task.villagerId },
          async () => ({
            villagerId: task.villagerId,
            activeTaskCount: await prisma.task.count({
              where: {
                villagerId: task.villagerId,
                status: { in: ["accepted", "in_progress"] },
              },
            }),
          }),
        )
      }
      toolResults.weather = await callTool(
        run.id,
        "get_weather_risk",
        { scope: "zouma-village" },
        getWeatherSummary,
      )
      const result = await ModelProviderAdapter.complete(
        JSON.stringify({ task, toolResults, outputSchema: agentOutputSchema }),
        {
          systemPrompt:
            "你是认养履约协调 Agent。只根据工具结果识别一项风险并生成 JSON 建议。不得退款、判责、结算、修改状态或发送消息。所有建议必须人工审批。",
          temperature: 0.1,
          timeout: Math.max(1_000, 45_000 - (Date.now() - startedAt)),
        },
      )
      if (!result.content.trim()) throw new Error("MODEL_UNAVAILABLE")
      const suggestion = normalizeAdoptionSuggestion(
        extractJsonContent(result.content),
        run.id,
      )
      if (
        suggestion.taskId !== task.id ||
        suggestion.adoptionId !== task.adoptionId
      )
        throw new Error("EVIDENCE_SCOPE_MISMATCH")
      const successfulTools = await prisma.agentToolCall.count({
        where: { runId: run.id, resultStatus: "success" },
      })
      if (successfulTools < 2) throw new Error("INSUFFICIENT_TOOL_EVIDENCE")
      const recommendation = await prisma.recommendation.create({
        data: {
          bizDate: new Date().toISOString().slice(0, 10),
          type: recommendationTypeByRisk[suggestion.riskType],
          targetObject: task.id,
          evidenceJson: {
            adoptionId: suggestion.adoptionId,
            taskId: suggestion.taskId,
            refs: suggestion.evidenceRefs,
            riskLevel: suggestion.riskLevel,
            runId: run.id,
          },
          message: suggestion.summary,
          actionSteps: [
            {
              action: suggestion.recommendedAction,
              reason: suggestion.reason,
              requires_human_approval: true,
            },
          ],
          ownerRole: "operator",
          expectedImpact: "供运营人员复核，不自动执行任何业务动作。",
          confidence: suggestion.confidence,
          status: "draft",
          agentRunId: run.id,
        },
      })
      await prisma.agentRun.update({
        where: { id: run.id },
        data: {
          status: "completed",
          modelProvider: result.provider,
          modelName: result.model,
          stepCount: successfulTools + 1,
          latencyMs: Date.now() - startedAt,
          finishedAt: new Date(),
        },
      })
      results.push({
        runId: run.id,
        recommendationId: recommendation.id,
        status: "completed",
      })
    } catch (error) {
      const code =
        error instanceof Error ? error.message.slice(0, 80) : "UNKNOWN_ERROR"
      const stepCount = await prisma.agentToolCall.count({
        where: { runId: run.id },
      })
      await prisma.agentRun.update({
        where: { id: run.id },
        data: {
          status: "failed",
          errorCode: code,
          stepCount,
          latencyMs: Date.now() - startedAt,
          finishedAt: new Date(),
        },
      })
      results.push({
        runId: run.id,
        recommendationId: null,
        status: "failed",
        errorCode: code,
      })
    }
  }
  return results
}

async function callTool<T>(
  runId: string,
  toolName: string,
  argumentsRedacted: Record<string, unknown>,
  execute: () => Promise<T>,
) {
  const startedAt = Date.now()
  try {
    const result = await execute()
    await prisma.agentToolCall.create({
      data: {
        runId,
        toolName,
        argumentsRedacted: argumentsRedacted as Prisma.InputJsonValue,
        permissionDecision: "allowed_read_only",
        resultStatus: "success",
        latencyMs: Date.now() - startedAt,
      },
    })
    return result
  } catch (error) {
    await prisma.agentToolCall.create({
      data: {
        runId,
        toolName,
        argumentsRedacted: argumentsRedacted as Prisma.InputJsonValue,
        permissionDecision: "allowed_read_only",
        resultStatus: "failed",
        latencyMs: Date.now() - startedAt,
      },
    })
    throw error
  }
}

const agentOutputSchema = {
  risk_level: "low | medium | high",
  adoption_id: "string",
  task_id: "string",
  risk_type: "deadline | unclaimed | evidence | weather | repeated_exception",
  evidence_refs: ["string"],
  summary: "string",
  recommended_action: "remind | reassign | extend | manual_review | no_action",
  reason: "string",
  confidence: "0..1",
  requires_human_approval: true,
}
