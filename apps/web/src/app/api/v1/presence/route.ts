import { prisma } from "@zouma/database"

import {
  getChinaDateString,
  getChinaDayRange,
  jsonResponse,
  optionsResponse,
} from "@web/lib/aigc-api"
import { computeNodeDailyScores } from "@web/lib/node-scoring"

const presenceSources = ["wifi_probe", "camera", "infrared", "manual"] as const

function isPresenceSource(value: unknown): value is (typeof presenceSources)[number] {
  return typeof value === "string" && presenceSources.includes(value as (typeof presenceSources)[number])
}

export function OPTIONS(request: Request) {
  return optionsResponse(request)
}

export async function GET(request: Request) {
  const url = new URL(request.url)
  const latest = url.searchParams.get("latest") === "true"
  const nodeId = url.searchParams.get("nodeId") ?? ""

  if (latest && nodeId) {
    const data = await prisma.presenceLog.findFirst({
      where: { nodeId },
      include: { node: true },
      orderBy: { timestamp: "desc" },
    })

    return jsonResponse(request, { data })
  }

  if (latest) {
    const nodes = await prisma.spaceNode.findMany({
      include: {
        presenceLogs: {
          orderBy: { timestamp: "desc" },
          take: 1,
        },
      },
      orderBy: { slug: "asc" },
    })
    const data = nodes
      .map((node) => ({ node, latest: node.presenceLogs[0] ?? null }))
      .filter((item) => item.latest)

    return jsonResponse(request, {
      data,
      meta: { total: data.length },
    })
  }

  const limit = Math.min(Number(url.searchParams.get("limit") ?? 100) || 100, 500)
  const data = await prisma.presenceLog.findMany({
    where: nodeId ? { nodeId } : undefined,
    include: { node: true },
    orderBy: { timestamp: "desc" },
    take: limit,
  })

  return jsonResponse(request, {
    data,
    meta: {
      total: data.length,
      limit,
    },
  })
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  const nodeId = typeof body?.nodeId === "string" ? body.nodeId.trim() : ""
  const peopleCount = Number(body?.peopleCount)
  const dwellAvgMin =
    body?.dwellAvgMin == null || body.dwellAvgMin === "" ? null : Number(body.dwellAvgMin)
  const timestamp =
    typeof body?.timestamp === "string" && body.timestamp ? new Date(body.timestamp) : new Date()

  if (
    !nodeId ||
    !Number.isInteger(peopleCount) ||
    peopleCount < 0 ||
    (dwellAvgMin !== null && (!Number.isFinite(dwellAvgMin) || dwellAvgMin < 0)) ||
    Number.isNaN(timestamp.getTime())
  ) {
    return jsonResponse(
      request,
      { error: { code: "INVALID_PRESENCE", message: "Presence payload is invalid." } },
      { status: 400 },
    )
  }

  const node = await prisma.spaceNode.findUnique({ where: { id: nodeId } })

  if (!node) {
    return jsonResponse(
      request,
      { error: { code: "INVALID_NODE", message: "Space node was not found." } },
      { status: 400 },
    )
  }

  const data = await prisma.presenceLog.create({
    data: {
      nodeId,
      timestamp,
      peopleCount,
      dwellAvgMin,
      source: isPresenceSource(body?.source) ? body.source : "wifi_probe",
    },
    include: { node: true },
  })

  computeNodeDailyScores(getChinaDateString(timestamp)).catch((error) => {
    console.error("Node scoring failed after presence ingest:", error)
  })

  return jsonResponse(request, { data }, { status: 201 })
}
