import "server-only"

import { prisma } from "@zouma/database"
import { computeControlSuggestions, ModelProviderAdapter, type ControlSuggestion } from "@zouma/utils"
import type { ControlCommandData, SensorReadingData } from "@zouma/contracts"

import { getWeatherSummary } from "@web/lib/weather"

type GeneratedControlSuggestion = Omit<ControlSuggestion, "triggeredBy"> & {
  triggeredBy: "ai" | "rule_engine"
}

function extractJsonArray(content: string): unknown {
  const trimmed = content.trim()
  try {
    return JSON.parse(trimmed)
  } catch {
    const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i)
    if (fenced?.[1]) return JSON.parse(fenced[1])
    const firstBracket = trimmed.indexOf("[")
    const lastBracket = trimmed.lastIndexOf("]")
    if (firstBracket >= 0 && lastBracket > firstBracket) {
      return JSON.parse(trimmed.slice(firstBracket, lastBracket + 1))
    }
    throw new Error("Control command JSON could not be parsed")
  }
}

function normalizeAiSuggestions(value: unknown): GeneratedControlSuggestion[] {
  if (!Array.isArray(value)) return []

  return value
    .filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null)
    .map((item) => ({
      type:
        item.type === "flood_alert" || item.type === "fire_alert" || item.type === "rain_delay"
          ? item.type
          : "irrigation",
      priority:
        item.priority === "critical" || item.priority === "high" || item.priority === "low"
          ? item.priority
          : "medium",
      reason: typeof item.reason === "string" ? item.reason : "AI 建议需要运营复核。",
      targetNodeId: typeof item.targetNodeId === "string" ? item.targetNodeId : undefined,
      payload: typeof item.payload === "object" && item.payload !== null ? item.payload as Record<string, unknown> : undefined,
      triggeredBy: "ai",
    }))
}

export function mapSensorReading(record: {
  id: string
  sensorId: string
  type: string
  value: number
  unit: string
  nodeId: string | null
  source?: string
  createdAt: Date
}): SensorReadingData {
  return {
    id: record.id,
    sensorId: record.sensorId,
    type: record.type,
    value: record.value,
    unit: record.unit,
    nodeId: record.nodeId ?? undefined,
    source: record.source,
    createdAt: record.createdAt.toISOString(),
  }
}

export function mapControlCommand(record: {
  id: string
  commandType: string
  targetNodeId: string | null
  priority: string
  reason: string
  payload: unknown
  status: string
  triggeredBy: string
  createdAt: Date
  updatedAt: Date
}): ControlCommandData {
  return {
    id: record.id,
    type: record.commandType as ControlCommandData["type"],
    priority: record.priority as ControlCommandData["priority"],
    reason: record.reason,
    targetNodeId: record.targetNodeId ?? undefined,
    payload: typeof record.payload === "object" && record.payload !== null ? record.payload as Record<string, unknown> : undefined,
    status: record.status as ControlCommandData["status"],
    triggeredBy: record.triggeredBy === "ai" ? "ai" : "rule_engine",
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  }
}

export async function getLatestSensorReadings(nodeId?: string) {
  const readings = await prisma.sensorReading.findMany({
    where: nodeId ? { nodeId } : undefined,
    orderBy: { createdAt: "desc" },
    take: 200,
  })
  const latest = new Map<string, (typeof readings)[number]>()

  for (const reading of readings) {
    const key = `${reading.sensorId}:${reading.type}`
    if (!latest.has(key)) latest.set(key, reading)
  }

  return [...latest.values()].map(mapSensorReading)
}

export async function generateControlCommands() {
  const [latest, weather] = await Promise.all([getLatestSensorReadings(), getWeatherSummary()])
  const ruleSuggestions = computeControlSuggestions({
    sensors: latest,
    forecastText: weather.summary,
  })

  let suggestions: GeneratedControlSuggestion[] = ruleSuggestions

  try {
    const result = await ModelProviderAdapter.complete(
      JSON.stringify({ sensors: latest, weather, ruleSuggestions }),
      {
        systemPrompt:
          "你是走马村水脉设施调度助手。根据传感器读数、天气和规则层建议，输出 JSON 数组。每项包含 type、priority、reason、targetNodeId、payload。不要输出解释文字。",
        temperature: 0.2,
      },
    )
    const aiSuggestions = normalizeAiSuggestions(extractJsonArray(result.content))
    if (aiSuggestions.length > 0) suggestions = aiSuggestions
  } catch (caughtError) {
    console.error("Infrastructure AI decision fell back to rules:", caughtError)
  }

  const commands = await Promise.all(
    suggestions.map((suggestion) =>
      prisma.controlCommand.create({
        data: {
          commandType: suggestion.type,
          targetNodeId: suggestion.targetNodeId ?? null,
          priority: suggestion.priority,
          reason: suggestion.reason,
          payload: suggestion.payload ? (suggestion.payload as never) : undefined,
          status: "pending",
          triggeredBy: suggestion.triggeredBy,
        },
      }),
    ),
  )

  return commands.map(mapControlCommand)
}
