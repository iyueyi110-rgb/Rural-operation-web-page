import assert from "node:assert/strict"
import { describe, it } from "node:test"

import { buildRenovationDiagramNodes, getInterventionLabel } from "./renovation-diagram"

describe("buildRenovationDiagramNodes", () => {
  it("aggregates strategies by node and keeps highest priority", () => {
    const nodes = buildRenovationDiagramNodes([
      {
        id: "s1",
        nodeId: "node-1",
        title: "Energy fix",
        priority: "medium",
        status: "draft",
        interventionType: "renovation",
        dimension: "energy",
        node: { slug: "ridge", nameKey: "岭上合院", realm: "ridge_dwelling" },
      },
      {
        id: "s2",
        nodeId: "node-1",
        title: "Partial rebuild",
        priority: "critical",
        status: "approved",
        interventionType: "partial_demolish_rebuild",
        dimension: "spatial",
        node: { slug: "ridge", nameKey: "岭上合院", realm: "ridge_dwelling" },
      },
    ])

    assert.equal(nodes.length, 1)
    assert.equal(nodes[0]?.strategyCount, 2)
    assert.equal(nodes[0]?.priority, "critical")
    assert.equal(nodes[0]?.status, "approved")
    assert.equal(nodes[0]?.interventionType, "partial_demolish_rebuild")
  })

  it("keeps separate nodes in stable realm order", () => {
    const nodes = buildRenovationDiagramNodes([
      {
        id: "s1",
        nodeId: "ridge-1",
        title: "Ridge",
        priority: "medium",
        status: "draft",
        interventionType: "renovation",
        node: { nameKey: "岭上合院", realm: "ridge_dwelling" },
      },
      {
        id: "s2",
        nodeId: "road-1",
        title: "Road",
        priority: "high",
        status: "approved",
        interventionType: "landscape_intervention",
        node: { nameKey: "古道驿亭", realm: "ancient_road" },
      },
    ])

    assert.deepEqual(nodes.map((node) => node.realm), ["ancient_road", "ridge_dwelling"])
  })

  it("returns a readable intervention label for unknown values", () => {
    assert.equal(getInterventionLabel("custom_type"), "custom_type")
  })
})
