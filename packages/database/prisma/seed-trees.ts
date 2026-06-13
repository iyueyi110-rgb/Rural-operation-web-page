import { orchardTreeOptions } from "../../../apps/web/src/lib/trees-data"
import { prisma } from "../src/index"

const adoptPrices: Record<string, number> = {
  lz018: 399,
  lz026: 599,
  lz041: 299,
}

const harvestSeasons: Record<string, string> = {
  lz018: "2026-06",
  lz026: "2026-06",
  lz041: "2026-07",
}

export async function seedTrees() {
  for (const tree of orchardTreeOptions) {
    await prisma.orchardTree.upsert({
      where: { treeCode: tree.id },
      create: {
        treeCode: tree.id,
        species: tree.species,
        age: tree.age,
        healthStatus: tree.healthStatus,
        blurredLocation: tree.blurredLocation,
        fireMemory: null,
        newShootsRecord: null,
        growthPhotos: [],
        adoptStatus: tree.availability === "maintenance" ? "maintenance" : "available",
        adoptPrice: adoptPrices[tree.id],
        harvestSeason: harvestSeasons[tree.id],
        fruitVariety: tree.species,
      },
      update: {
        species: tree.species,
        age: tree.age,
        healthStatus: tree.healthStatus,
        blurredLocation: tree.blurredLocation,
        adoptStatus: tree.availability === "maintenance" ? "maintenance" : "available",
        adoptPrice: adoptPrices[tree.id],
        harvestSeason: harvestSeasons[tree.id],
        fruitVariety: tree.species,
      },
    })
  }
}
