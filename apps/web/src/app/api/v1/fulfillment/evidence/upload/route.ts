import { createHash, randomUUID } from "node:crypto"
import { mkdir, writeFile } from "node:fs/promises"
import path from "node:path"

import { prisma } from "@zouma/database"

import { apiError } from "@web/lib/api-error"
import { jsonResponse, optionsResponse } from "@web/lib/aigc-api"
import { getVillagerIdFromToken } from "@web/lib/villager-auth"
import { validateFileMagicNumber } from "@web/lib/upload-security"

const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"])
const maxFileSize = 10 * 1024 * 1024

export function OPTIONS(request: Request) {
  return optionsResponse(request)
}

export async function POST(request: Request) {
  const villagerId = await getVillagerIdFromToken(request)
  if (!villagerId)
    return apiError(request, "UNAUTHORIZED", "Authentication required", 401)
  const form = await request.formData().catch(() => null)
  const file = form?.get("file")
  const taskId = form?.get("taskId")
  if (!(file instanceof File) || typeof taskId !== "string")
    return apiError(
      request,
      "INVALID_PAYLOAD",
      "file and taskId are required",
      400,
    )
  const task = await prisma.task.findFirst({
    where: { id: taskId.trim(), villagerId, adoptionId: { not: null } },
    select: { id: true },
  })
  if (!task)
    return apiError(request, "TASK_NOT_FOUND", "Adoption task not found", 404)
  if (
    !allowedTypes.has(file.type) ||
    file.size < 1 ||
    file.size > maxFileSize ||
    !(await validateFileMagicNumber(file))
  ) {
    return apiError(
      request,
      "INVALID_FILE",
      "Only valid JPEG, PNG or WebP images up to 10MB are allowed",
      400,
    )
  }
  const bytes = Buffer.from(await file.arrayBuffer())
  const extension =
    file.type === "image/png"
      ? "png"
      : file.type === "image/webp"
        ? "webp"
        : "jpg"
  const filename = `${Date.now()}-${randomUUID()}.${extension}`
  const uploadDir = path.join(process.cwd(), "public", "uploads", "fulfillment")
  await mkdir(uploadDir, { recursive: true })
  await writeFile(path.join(uploadDir, filename), bytes)
  return jsonResponse(
    request,
    {
      data: {
        url: `/uploads/fulfillment/${filename}`,
        hash: createHash("sha256").update(bytes).digest("hex"),
        mimeType: file.type,
        size: file.size,
      },
    },
    { status: 201 },
  )
}
