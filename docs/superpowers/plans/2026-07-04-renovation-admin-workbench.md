# Renovation Admin Workbench Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move the spatial renovation UI into the admin backend, add renovation diagrams, and remove the public renovation page.

**Architecture:** The admin app owns all renovation UI. A small pure mapper converts strategy API rows into diagram view models, which are rendered by reusable admin diagram components on the list and detail pages. The web app removes the public route and public demo data.

**Tech Stack:** Next.js App Router, React, TypeScript, Tailwind CSS, lucide-react, Node test runner.

---

### Task 1: Admin Diagram View Model

**Files:**
- Create: `apps/admin/src/lib/renovation-diagram.ts`
- Create: `apps/admin/src/lib/renovation-diagram.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
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

  it("returns a readable intervention label for unknown values", () => {
    assert.equal(getInterventionLabel("custom_type"), "custom_type")
  })
})
```

- [ ] **Step 2: Run tests and verify failure**

Run: `pnpm --filter @zouma/admin test -- src/lib/renovation-diagram.test.ts`

Expected: FAIL because the test script or module does not exist.

- [ ] **Step 3: Add the mapper and test script**

Add `test` to `apps/admin/package.json`: `node --import tsx --test src/lib/*.test.ts`.

Implement:

```ts
export type RenovationStrategyLike = {
  id: string
  nodeId: string
  title: string
  priority: string
  status: string
  interventionType?: string | null
  dimension?: string | null
  expectedImpact?: string | null
  node?: { slug?: string | null; nameKey?: string | null; realm?: string | null }
}

export type RenovationDiagramNode = {
  nodeId: string
  label: string
  slug?: string
  realm: string
  priority: string
  status: string
  interventionType: string
  dimension?: string
  strategyCount: number
  strategies: RenovationStrategyLike[]
}

export function buildRenovationDiagramNodes(strategies: RenovationStrategyLike[]): RenovationDiagramNode[]
```

- [ ] **Step 4: Run tests and verify pass**

Run: `pnpm --filter @zouma/admin test -- src/lib/renovation-diagram.test.ts`

Expected: PASS.

### Task 2: Workbench Diagram Component

**Files:**
- Create: `apps/admin/src/components/renovation-spatial-diagram.tsx`
- Modify: `apps/admin/src/app/(renovation)/renovation/page.tsx`

- [ ] **Step 1: Add component behavior**

Create `RenovationSpatialDiagram` that accepts diagram nodes, selected node id, and `onSelectNode`.

- [ ] **Step 2: Wire list page**

Use `buildRenovationDiagramNodes(rows)` in `/renovation`, add filters, and render a two-column workbench with the diagram and table.

- [ ] **Step 3: Verify admin type-check**

Run: `pnpm --filter @zouma/admin type-check`

Expected: PASS.

### Task 3: Detail Diagram

**Files:**
- Modify: `apps/admin/src/components/renovation-spatial-diagram.tsx`
- Modify: `apps/admin/src/app/(renovation)/renovation/[id]/page.tsx`

- [ ] **Step 1: Add compact detail component**

Export `RenovationStrategyMiniDiagram`.

- [ ] **Step 2: Render detail schematic**

Add the mini diagram near the top of the strategy detail page.

- [ ] **Step 3: Verify admin type-check**

Run: `pnpm --filter @zouma/admin type-check`

Expected: PASS.

### Task 4: Remove Public Renovation Page

**Files:**
- Delete: `apps/web/src/app/[locale]/renovation/page.tsx`
- Delete: `apps/web/src/lib/renovation-demo-data.ts`

- [ ] **Step 1: Confirm imports**

Run: `rg "renovationDemoNodes|/renovation|建筑空间改造公示" apps/web apps/admin`

Expected: only files intentionally being edited reference the public page.

- [ ] **Step 2: Delete public-only files**

Remove the public route and web demo data.

- [ ] **Step 3: Verify web type-check**

Run: `pnpm --filter @zouma/web type-check`

Expected: PASS.

### Task 5: Full Verification

**Files:**
- No new files unless fixes are required.

- [ ] **Step 1: Run package checks**

Run:

```bash
pnpm --filter @zouma/admin test -- src/lib/renovation-diagram.test.ts
pnpm --filter @zouma/admin type-check
pnpm --filter @zouma/web type-check
pnpm type-check
```

Expected: all PASS.

- [ ] **Step 2: Browser verify**

Start dev servers and check:

- `http://localhost:3001/renovation` renders the workbench and diagram.
- `http://localhost:3001/renovation/test-missing-id` renders a graceful empty detail state.
- `http://localhost:3000/zh-CN/renovation` is not served as the public renovation page.

- [ ] **Step 3: Commit**

```bash
git add apps/admin apps/web docs/superpowers/plans/2026-07-04-renovation-admin-workbench.md
git commit -m "feat(admin): move renovation UI to backend workbench"
```
