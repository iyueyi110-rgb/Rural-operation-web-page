import "server-only"

import { prisma } from "@zouma/database"

import { isFeatureEnabled } from "@web/lib/feature-flags"

export type DemoReadiness =
  | { mode: "full"; reason: "golden_case_ready" }
  | {
      mode: "readonly"
      reason:
        | "database_unavailable"
        | "feature_disabled"
        | "golden_case_missing"
    }

export async function getDemoReadiness(): Promise<DemoReadiness> {
  if (!isFeatureEnabled("ADOPTION_V2_ENABLED")) {
    return { mode: "readonly", reason: "feature_disabled" }
  }

  try {
    const adoption = await prisma.treeAdoption.findUnique({
      where: { adoptionCode: "ADOPT-2026-LZ018-001" },
      select: {
        fulfillmentEvidence: { select: { id: true }, take: 2 },
        fulfillmentTasks: { select: { id: true }, take: 1 },
        id: true,
      },
    })

    if (
      !adoption ||
      adoption.fulfillmentTasks.length === 0 ||
      adoption.fulfillmentEvidence.length < 2
    ) {
      return { mode: "readonly", reason: "golden_case_missing" }
    }

    return { mode: "full", reason: "golden_case_ready" }
  } catch (error) {
    console.warn(
      "Demo readiness check degraded:",
      error instanceof Error ? error.name : "unknown error",
    )
    return { mode: "readonly", reason: "database_unavailable" }
  }
}
