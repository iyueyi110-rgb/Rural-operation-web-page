import { prisma } from "@zouma/database"
import { createHash } from "node:crypto"

import {
  getChinaDateString,
  getChinaDayRange,
  jsonResponse,
  optionsResponse,
} from "@web/lib/aigc-api"
import { computeNodeDailyScores } from "@web/lib/node-scoring"
import { runAlertChecks } from "@web/lib/alert-engine"

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
  const visitorIdentity = getVisitorIdentity(request, body)

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

  const visitor = visitorIdentity
    ? await prisma.visitor.upsert({
        where: { fingerprint: visitorIdentity.fingerprint },
        create: visitorIdentity,
        update: {
          userAgent: visitorIdentity.userAgent,
          screenSize: visitorIdentity.screenSize,
          timezone: visitorIdentity.timezone,
        },
      })
    : null

  const data = await prisma.presenceLog.create({
    data: {
      nodeId,
      visitorId: visitor?.id,
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
  runAlertChecks(getChinaDateString(timestamp)).catch((error) => {
    console.error("Alert checks failed after presence ingest:", error)
  })

  return jsonResponse(request, { data }, { status: 201 })
}

function getVisitorIdentity(request: Request, body: unknown) {
  if (!body || typeof body !== "object" || Array.isArray(body)) return null

  const record = body as Record<string, unknown>
  const visitor =
    record.visitor && typeof record.visitor === "object" && !Array.isArray(record.visitor)
      ? (record.visitor as Record<string, unknown>)
      : record

  const screenSize = typeof visitor.screenSize === "string" ? visitor.screenSize.trim() : ""
  const timezone = typeof visitor.timezone === "string" ? visitor.timezone.trim() : ""
  if (!screenSize || !timezone) return null

  const userAgent = request.headers.get("user-agent") ?? "unknown"
  const fingerprint = createHash("sha256").update(`${userAgent}|${screenSize}|${timezone}`).digest("hex")

  return {
    fingerprint,
    userAgent,
    screenSize,
    timezone,
  }
}
