import { prisma } from "@zouma/database"

import { apiError } from "@web/lib/api-error"
import { requireUserSession } from "@web/lib/api-auth"
import { jsonResponse, optionsResponse } from "@web/lib/aigc-api"
import { getVillagerIdFromToken } from "@web/lib/villager-auth"
import { isAdminRequest } from "@web/lib/tree-records"

export function OPTIONS(request: Request) {
  return optionsResponse(request)
}

export async function GET(
  request: Request,
  { params }: { params: { id: string } },
) {
  const admin = isAdminRequest(request)
  const villagerId = admin ? null : await getVillagerIdFromToken(request)
  const user = admin || villagerId ? null : await requireUserSession(request)
  if (!admin && !villagerId && !user)
    return apiError(request, "UNAUTHORIZED", "Authentication required", 401)
  const adoption = await prisma.treeAdoption.findUnique({
    where: { id: params.id },
    include: {
      fulfillmentTasks: {
        include: { evidences: { include: { reviews: true } } },
      },
      benefits: true,
      settlements: true,
      previousRenewals: true,
    },
  })
  if (!adoption)
    return apiError(request, "ADOPTION_NOT_FOUND", "Adoption not found", 404)
  if (user && adoption.adopterId !== user.id)
    return apiError(
      request,
      "FORBIDDEN",
      "Adoption is outside your account",
      403,
    )
  if (
    villagerId &&
    !adoption.fulfillmentTasks.some((task) => task.villagerId === villagerId)
  ) {
    return apiError(request, "FORBIDDEN", "Adoption is outside your tasks", 403)
  }
  const audit = await prisma.auditLog.findMany({
    where: { adoptionId: adoption.id },
    orderBy: { createdAt: "asc" },
  })
  const tasks = adoption.fulfillmentTasks
    .filter((task) => !villagerId || task.villagerId === villagerId)
    .map((task) => ({
      id: task.id,
      title: task.title,
      status: task.status,
      deadlineAt: task.deadlineAt?.toISOString() ?? null,
      evidences: task.evidences.map((evidence) => ({
        id: evidence.id,
        version: evidence.version,
        status: evidence.status,
        submittedAt: evidence.submittedAt.toISOString(),
        reviews: evidence.reviews.map((review) => ({
          decision: review.decision,
          reasonCode: review.reasonCode,
          createdAt: review.createdAt.toISOString(),
        })),
      })),
    }))
  return jsonResponse(request, {
    data: {
      adoption: {
        id: adoption.id,
        status: adoption.status,
        treeId: adoption.treeId,
        plan: adoption.plan,
      },
      tasks,
      benefits: adoption.benefits,
      settlements: user ? [] : adoption.settlements,
      renewals: adoption.previousRenewals,
      audit: audit.map((entry) => ({
        ...entry,
        createdAt: entry.createdAt.toISOString(),
      })),
    },
  })
}
