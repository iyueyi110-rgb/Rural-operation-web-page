import { prisma } from "../src/index"

const seedTreeData = [
  {
    id: "lz018",
    species: "trees.lz018.species",
    age: 12,
    healthStatus: "excellent" as const,
    blurredLocation: "trees.lz018.location",
    availability: "available" as const,
  },
  {
    id: "lz026",
    species: "trees.lz026.species",
    age: 8,
    healthStatus: "good" as const,
    blurredLocation: "trees.lz026.location",
    availability: "available" as const,
  },
  {
    id: "lz041",
    species: "trees.lz041.species",
    age: 23,
    healthStatus: "good" as const,
    blurredLocation: "trees.lz041.location",
    availability: "available" as const,
  },
]

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
  for (const tree of seedTreeData) {
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
        adoptStatus: tree.availability,
        adoptPrice: adoptPrices[tree.id],
        harvestSeason: harvestSeasons[tree.id],
        fruitVariety: tree.species,
      },
      update: {
        species: tree.species,
        age: tree.age,
        healthStatus: tree.healthStatus,
        blurredLocation: tree.blurredLocation,
        adoptStatus: tree.availability,
        adoptPrice: adoptPrices[tree.id],
        harvestSeason: harvestSeasons[tree.id],
        fruitVariety: tree.species,
      },
    })
  }
}
