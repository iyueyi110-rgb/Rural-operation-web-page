import { requireUserSession } from "@web/lib/api-auth"
import { getVillagerIdFromToken } from "@web/lib/villager-auth"
import { isAdminRequest } from "@web/lib/tree-records"

export async function resolveKnowledgeActor(request: Request) {
  if (isAdminRequest(request)) {
    return {
      role: "operator" as const,
      actorId: request.headers.get("x-admin-user")?.trim() || "admin",
      actorType: "operator" as const,
    }
  }
  const villagerId = await getVillagerIdFromToken(request)
  if (villagerId)
    return {
      role: "villager" as const,
      actorId: villagerId,
      actorType: "villager" as const,
    }
  const user = await requireUserSession(request)
  if (user && (user.role === "operator" || user.role === "admin")) {
    return {
      role: "operator" as const,
      actorId: user.id,
      actorType: "operator" as const,
    }
  }
  return null
}
