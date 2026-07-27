import { prisma } from "@zouma/database"

import { isPlainObject, jsonResponse, optionsResponse } from "@web/lib/aigc-api"
import { requireBearerAuth } from "@web/lib/api-auth"
import { CONSENT_TYPES, normalizeConsentType } from "@web/lib/privacy-consents"

export function OPTIONS(request: Request) {
  return optionsResponse(request)
}

export async function GET(request: Request) {
  const auth = await requireBearerAuth(request)
  if (!auth.authorized) return auth.response

  const records = await prisma.consentRecord.findMany({
    where: { userId: auth.user.id },
  })
  const byType = new Map(records.map((record) => [record.consentType, record]))

  return jsonResponse(request, {
    data: CONSENT_TYPES.map((consentType) => {
      const record = byType.get(consentType)
      return {
        consentType,
        granted: record?.granted ?? false,
        updatedAt: record?.updatedAt.toISOString() ?? null,
      }
    }),
    meta: { total: CONSENT_TYPES.length },
  })
}

export async function POST(request: Request) {
  const auth = await requireBearerAuth(request)
  if (!auth.authorized) return auth.response

  const body = (await request.json().catch(() => null)) as unknown
  if (!isPlainObject(body)) {
    return jsonResponse(request, { error: "Invalid consent payload" }, { status: 400 })
  }

  const consentType = normalizeConsentType(body.consentType)
  if (!consentType || typeof body.granted !== "boolean") {
    return jsonResponse(request, { error: "consentType and granted are required" }, { status: 400 })
  }

  const data = await prisma.consentRecord.upsert({
    where: { userId_consentType: { userId: auth.user.id, consentType } },
    create: {
      userId: auth.user.id,
      consentType,
      granted: body.granted,
      ipAddress: request.headers.get("x-forwarded-for") ?? null,
    },
    update: {
      granted: body.granted,
      ipAddress: request.headers.get("x-forwarded-for") ?? null,
    },
  })

  return jsonResponse(request, {
    data: {
      consentType: data.consentType,
      granted: data.granted,
      updatedAt: data.updatedAt.toISOString(),
    },
  })
}
