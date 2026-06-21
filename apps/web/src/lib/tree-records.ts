import "server-only"

import { prisma } from "@zouma/database"
import type { HarvestBookingData, HarvestShipmentData, OrchardTreeData, TreeAdoptionData, TreeCareLogData } from "@zouma/contracts"

import { orchardTreeOptions } from "@web/lib/trees-data"
import { resolveTreeHiddenGeo } from "@web/lib/tree-geo"

export interface TreeProfile extends OrchardTreeData {
  nameKey: string
  summaryKey: string
  imageAsset: string
  imageAltKey: string
  rights: string[]
  availability: string
  careLogs: TreeCareLogData[]
  harvestBookings: HarvestBookingData[]
}

const fallbackTrees: TreeProfile[] = orchardTreeOptions.map((tree) => ({
  id: tree.id,
  treeCode: tree.id,
  species: tree.species,
  age: tree.age,
  healthStatus: tree.healthStatus,
  blurredLocation: tree.blurredLocation,
  fireMemory: undefined,
  newShootsRecord: undefined,
  growthPhotos: [],
  adoptStatus: tree.availability === "maintenance" ? "maintenance" : "available",
  adoptPrice: undefined,
  harvestSeason: undefined,
  fruitVariety: tree.species,
  nameKey: tree.nameKey,
  summaryKey: tree.summaryKey,
  imageAsset: tree.imageAsset,
  imageAltKey: tree.imageAltKey,
  rights: tree.rights,
  availability: tree.availability,
  careLogs: [],
  harvestBookings: [],
}))

function coerceGrowthPhotos(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : []
}

function enrichTree(tree: {
  id: string
  treeCode: string
  species: string
  age: number
  healthStatus: string
  blurredLocation: string
  lat: number | null
  lng: number | null
  hiddenGeo: string | null
  fireMemory: string | null
  newShootsRecord: string | null
  growthPhotos: unknown
  adoptStatus: string
  adoptPrice: number | null
  harvestSeason: string | null
  fruitVariety: string | null
  careLogs?: Array<{
    id: string
    treeId: string
    logType: string
    content: string
    imageUrl: string | null
    operator: string
    createdAt: Date
  }>
  harvestBookings?: Array<{
    id: string
    treeId: string
    scheduledDate: string
    timeSlot: string
    guestCount: number
    guestName: string | null
    guestPhone: string | null
    fruitDestination: string | null
    destinationNote: string | null
    status: string
    createdAt: Date
    shipment?: HarvestShipmentRecord | null
  }>
}): TreeProfile {
  const staticTree =
    orchardTreeOptions.find((option) => option.id === tree.treeCode) ??
    orchardTreeOptions.find((option) => option.treeCode === tree.treeCode)

  return {
    id: tree.id,
    treeCode: tree.treeCode,
    species: tree.species,
    age: tree.age,
    healthStatus: tree.healthStatus,
    blurredLocation: tree.blurredLocation,
    hiddenGeo: resolveTreeHiddenGeo(tree.hiddenGeo, tree.lat, tree.lng),
    fireMemory: tree.fireMemory ?? undefined,
    newShootsRecord: tree.newShootsRecord ?? undefined,
    growthPhotos: coerceGrowthPhotos(tree.growthPhotos),
    adoptStatus: tree.adoptStatus,
    adoptPrice: tree.adoptPrice ?? undefined,
    harvestSeason: tree.harvestSeason ?? undefined,
    fruitVariety: tree.fruitVariety ?? undefined,
    nameKey: staticTree?.nameKey ?? tree.treeCode,
    summaryKey: staticTree?.summaryKey ?? tree.treeCode,
    imageAsset: staticTree?.imageAsset ?? "/images/trees/lz018.webp",
    imageAltKey: staticTree?.imageAltKey ?? tree.treeCode,
    rights: staticTree?.rights ?? [],
    availability: staticTree?.availability ?? tree.adoptStatus,
    careLogs:
      tree.careLogs?.map((log) => ({
        id: log.id,
        treeId: log.treeId,
        logType: log.logType as TreeCareLogData["logType"],
        content: log.content,
        imageUrl: log.imageUrl ?? undefined,
        operator: log.operator,
        createdAt: log.createdAt.toISOString(),
      })) ?? [],
    harvestBookings:
      tree.harvestBookings?.map((booking) => mapHarvestBooking(booking)) ?? [],
  }
}

export async function listTreeProfiles(): Promise<TreeProfile[]> {
  try {
    const trees = await prisma.orchardTree.findMany({
      include: {
        careLogs: { orderBy: { createdAt: "desc" } },
        harvestBookings: {
          include: { shipment: true },
          orderBy: { scheduledDate: "desc" },
        },
      },
      orderBy: { treeCode: "asc" },
    })
    await backfillTreeHiddenGeo(trees)
    return trees.length > 0 ? trees.map(enrichTree) : fallbackTrees
  } catch (caughtError) {
    console.error("Tree list fallback activated:", caughtError)
    return fallbackTrees
  }
}

export async function getTreeProfile(code: string): Promise<TreeProfile | null> {
  try {
    const tree = await prisma.orchardTree.findFirst({
      where: { OR: [{ treeCode: code }, { treeCode: code.toLowerCase() }, { id: code }] },
      include: {
        careLogs: { orderBy: { createdAt: "desc" } },
        harvestBookings: {
          include: { shipment: true },
          orderBy: { scheduledDate: "desc" },
        },
      },
    })
    if (tree) {
      await backfillTreeHiddenGeo([tree])
      return enrichTree(tree)
    }
  } catch (caughtError) {
    console.error("Tree detail fallback activated:", caughtError)
  }

  return fallbackTrees.find((tree) => tree.treeCode === code || tree.id === code) ?? null
}

export async function listTreeAdoptions(adopterPhone?: string): Promise<TreeAdoptionData[]> {
  const records = await prisma.treeAdoption.findMany({
    where: adopterPhone ? { adopterPhone: maskPhone(adopterPhone) } : undefined,
    include: {
      tree: {
        include: {
          harvestBookings: {
            include: { shipment: true },
            orderBy: { scheduledDate: "desc" },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  })

  await backfillTreeHiddenGeo(records.map((record) => record.tree))

  return records.map((record) => ({
    id: record.id,
    treeId: record.treeId,
    treeCode: record.tree.treeCode,
    hiddenGeo: resolveTreeHiddenGeo(record.tree.hiddenGeo, record.tree.lat, record.tree.lng),
    plan: record.plan,
    adopterName: record.adopterName ?? undefined,
    adopterPhone: record.adopterPhone ?? undefined,
    status: record.status,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
    harvestBookings: record.tree.harvestBookings.map((booking) => mapHarvestBooking(booking)),
  }))
}

async function backfillTreeHiddenGeo(
  trees: Array<{
    id: string
    hiddenGeo: string | null
    lat: number | null
    lng: number | null
  }>,
) {
  const updates = trees.flatMap((tree) => {
    const hiddenGeo = resolveTreeHiddenGeo(tree.hiddenGeo, tree.lat, tree.lng)
    if (!hiddenGeo || hiddenGeo === tree.hiddenGeo) return []

    return [
      prisma.orchardTree.updateMany({
        where: { id: tree.id, OR: [{ hiddenGeo: null }, { hiddenGeo: "" }] },
        data: { hiddenGeo },
      }),
    ]
  })

  if (updates.length > 0) {
    await Promise.all(updates).catch((error) =>
      console.error("Tree hiddenGeo backfill failed:", error),
    )
  }
}

export function maskPhone(phone?: string) {
  if (!phone) return undefined
  return phone.replace(/1[3-9]\d{9}/g, (value) => `${value.slice(0, 3)}****${value.slice(-4)}`).trim()
}

export function maskAddress(address?: string) {
  if (!address) return undefined
  const trimmed = address.trim()
  if (trimmed.length <= 8) return `${trimmed.slice(0, 2)}***`
  return `${trimmed.slice(0, 6)}***${trimmed.slice(-2)}`
}

export function isAdminRequest(request: Request) {
  const expected = process.env.ADMIN_API_TOKEN ?? "dev-admin-token"
  return request.headers.get("x-admin-token") === expected
}

interface HarvestShipmentRecord {
  id: string
  harvestBookingId: string
  recipientName: string
  recipientPhone: string
  recipientAddress: string
  courier: string | null
  trackingNumber: string | null
  status: string
  shippedAt: Date | null
  deliveredAt: Date | null
  createdAt: Date
  updatedAt: Date
}

export function mapHarvestShipment(record: HarvestShipmentRecord, options: { maskPrivateFields?: boolean } = {}): HarvestShipmentData {
  const maskPrivateFields = options.maskPrivateFields ?? true

  return {
    id: record.id,
    harvestBookingId: record.harvestBookingId,
    recipientName: record.recipientName,
    recipientPhone: maskPrivateFields ? (maskPhone(record.recipientPhone) ?? "") : record.recipientPhone,
    recipientAddress: maskPrivateFields ? (maskAddress(record.recipientAddress) ?? "") : record.recipientAddress,
    courier: record.courier ?? undefined,
    trackingNumber: record.trackingNumber ?? undefined,
    status: record.status as HarvestShipmentData["status"],
    shippedAt: record.shippedAt?.toISOString(),
    deliveredAt: record.deliveredAt?.toISOString(),
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  }
}

export function mapHarvestBooking(record: {
  id: string
  treeId: string
  scheduledDate: string
  timeSlot: string
  guestCount: number
  guestName: string | null
  guestPhone: string | null
  fruitDestination?: string | null
  destinationNote?: string | null
  status: string
  createdAt: Date
  shipment?: HarvestShipmentRecord | null
}, options: { maskPrivateFields?: boolean } = {}): HarvestBookingData {
  return {
    id: record.id,
    treeId: record.treeId,
    scheduledDate: record.scheduledDate,
    timeSlot: record.timeSlot,
    guestCount: record.guestCount,
    guestName: record.guestName ?? undefined,
    guestPhone: record.guestPhone ?? undefined,
    fruitDestination: record.fruitDestination ?? undefined,
    destinationNote: record.destinationNote ?? undefined,
    status: record.status,
    createdAt: record.createdAt.toISOString(),
    shipment: record.shipment ? mapHarvestShipment(record.shipment, options) : undefined,
  }
}
