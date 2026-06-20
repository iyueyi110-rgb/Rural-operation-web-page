import { mkdir, writeFile } from "node:fs/promises"
import path from "node:path"

import { prisma } from "@zouma/database"

import { jsonResponse, optionsResponse } from "@web/lib/aigc-api"
import { maskPhone } from "@web/lib/tree-records"

const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"])
const maxFileSize = 5 * 1024 * 1024

export function OPTIONS(request: Request) {
  return optionsResponse(request)
}

export async function POST(request: Request) {
  const form = await request.formData().catch(() => null)
  const file = form?.get("file")
  const adoptionId = form?.get("adoptionId")
  const adopterPhone = form?.get("adopterPhone")

  if (
    !(file instanceof File) ||
    typeof adoptionId !== "string" ||
    typeof adopterPhone !== "string"
  ) {
    return jsonResponse(request, { error: "file, adoptionId and adopterPhone are required" }, { status: 400 })
  }

  const adoption = await prisma.treeAdoption.findFirst({
    where: {
      id: adoptionId.trim(),
      adopterPhone: maskPhone(adopterPhone.trim()),
      status: "active",
    },
    select: { id: true },
  })
  if (!adoption) {
    return jsonResponse(request, { error: "Active adoption not found" }, { status: 404 })
  }
  if (!allowedTypes.has(file.type)) {
    return jsonResponse(request, { error: "Only jpeg, png and webp files are allowed" }, { status: 400 })
  }
  if (file.size > maxFileSize) {
    return jsonResponse(request, { error: "File must be smaller than 5MB" }, { status: 400 })
  }

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-")
  const filename = `${Date.now()}-${safeName}`
  const uploadDir = path.join(process.cwd(), "public", "uploads", "trees")
  await mkdir(uploadDir, { recursive: true })
  await writeFile(path.join(uploadDir, filename), Buffer.from(await file.arrayBuffer()))

  return jsonResponse(request, {
    data: {
      url: `/uploads/trees/${filename}`,
      filename,
      contentType: file.type,
      size: file.size,
    },
  })
}
