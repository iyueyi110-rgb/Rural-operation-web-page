# Admin BFF and Simulation Run Pagination Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the Web admin token from every browser boundary and make simulation-run listing bounded and summary-only while preserving full detail workflows.

**Architecture:** Admin clients call a same-origin catch-all BFF. A server-validated HMAC session cookie gates Admin pages and BFF requests; only the BFF adds `ADMIN_API_TOKEN` to Web API requests. Web exposes a stable `page`/`pageSize` summary envelope backed by repository projection, while detail remains unchanged.

**Tech Stack:** Next.js 14 App Router, TypeScript, Node test runner, Prisma, Web Crypto.

## Global Constraints

- Follow strict red-green-refactor TDD and record both red and green output.
- Keep Web API server authentication, JSON fallback, and all five Admin simulation tabs.
- Do not edit simulation engine files.
- Do not stage or commit any changes.

---

### Task 1: Trusted Admin Session and Same-Origin BFF

**Files:**

- Create: `apps/admin/src/lib/admin-session.server.ts`
- Create: `apps/admin/src/lib/admin-bff.server.ts`
- Create: `apps/admin/src/app/api/admin/session/route.ts`
- Create: `apps/admin/src/app/api/admin/[...path]/route.ts`
- Create: `apps/admin/src/app/login/page.tsx`
- Create: `apps/admin/src/middleware.ts`
- Modify: `apps/admin/src/lib/admin-api.ts`
- Modify: `apps/admin/src/app/(assets-commerce)/trees/page.tsx`
- Test: `apps/admin/src/lib/admin-security.test.ts`

**Interfaces:**

- Produces: `createAdminSession`, `verifyAdminSession`, `authenticateAdminPassword`, `proxyAdminRequest`.
- Browser API base is the literal same-origin path `/api/admin`; no client code reads a server credential.

- [ ] **Step 1: Write failing security tests**

Test that Admin client sources contain no public service-token variable, unauthenticated BFF calls return 401 without upstream work, a valid signed cookie permits proxying, and only the proxy injects `X-Admin-Token`.

- [ ] **Step 2: Run the focused Admin tests and confirm expected failures**

Run: `pnpm --filter @zouma/admin exec node --import tsx --test src/lib/admin-security.test.ts`

Expected: FAIL because session/BFF modules are absent and the client still contains the public token.

- [ ] **Step 3: Implement the minimum secure boundary**

Use `ADMIN_LOGIN_PASSWORD` only for constant-time server-side login validation, `ADMIN_SESSION_SECRET` only for HMAC signing, and an expiring `HttpOnly; SameSite=Strict` cookie. Reject missing/invalid configuration. Proxy the incoming method/body/query to `WEB_API_BASE` and replace any incoming admin-token header with server-only `ADMIN_API_TOKEN`.

- [ ] **Step 4: Run focused Admin tests until green**

Run: `pnpm --filter @zouma/admin exec node --import tsx --test src/lib/admin-security.test.ts src/lib/simulation-page-contract.test.ts`

Expected: PASS with zero failed tests.

### Task 2: Summary Projection and Bounded Stable Pagination

**Files:**

- Modify: `apps/web/src/lib/simulation-repository.ts`
- Modify: `apps/web/src/lib/simulation-api.ts`
- Modify: `apps/web/src/app/api/v1/simulations/runs/route.ts`
- Test: `apps/web/src/lib/simulation-repository.test.ts`
- Test: `apps/web/src/lib/simulation-api.test.ts`

**Interfaces:**

- Produces: `SimulationRunSummary`, `listRunSummaries(filters, { page, pageSize })`, `parseSimulationRunPage`, and a `{ data: { items }, meta: { ..., pagination } }` envelope.
- Summary contains persisted display fields plus `worldHash`, `scenarioId`, `randomSeed`, `config`, and `metrics`; it has no `result`, events, or bad cases.

- [ ] **Step 1: Write failing projection and pagination tests**

Seed multiple runs with equal timestamps and large `result` payloads. Assert deterministic `createdAt desc, id desc`, disjoint pages, hard page-size cap, pagination metadata, and serialized response absence of large result/event data.

- [ ] **Step 2: Run the focused Web tests and confirm expected failures**

Run: `pnpm --filter @zouma/web exec node --import tsx --test src/lib/simulation-repository.test.ts src/lib/simulation-api.test.ts`

Expected: FAIL because summary and pagination APIs do not exist.

- [ ] **Step 3: Implement summary listing in memory/JSON and Prisma**

State repositories project before returning and order by `createdAt desc, id desc`. Prisma uses `select` excluding `result`, joins only world summary fields, and uses bounded `skip`/`take` with one extra record to calculate `hasMore`.

- [ ] **Step 4: Adapt the GET route to the envelope**

Parse positive `page` and `pageSize`; clamp `pageSize` to 100 and return pagination metadata alongside existing repository metadata.

- [ ] **Step 5: Run focused Web tests until green**

Run: `pnpm --filter @zouma/web exec node --import tsx --test src/lib/simulation-repository.test.ts src/lib/simulation-api.test.ts src/lib/simulation-routes.test.ts`

Expected: PASS with zero failed tests.

### Task 3: Admin Envelope Adaptation and Verification

**Files:**

- Modify: `apps/admin/src/components/simulation/types.ts`
- Modify: `apps/admin/src/app/(village-work)/simulations/page.tsx`
- Test: `apps/admin/src/lib/simulation-admin.test.ts`
- Test: `apps/admin/src/lib/simulation-page-contract.test.ts`

**Interfaces:**

- Consumes: summary envelope from Task 2 and full detail response from the existing detail route.
- Produces: list rows/comparison selectors from summaries; opening a run still loads full detail before detail/breakdown use.

- [ ] **Step 1: Write a failing Admin adapter test**

Assert `normalizeRuns` accepts `{ data: { items }, meta: { pagination } }` and preserves summary `config`, `worldHash`, and metrics without requiring `result`.

- [ ] **Step 2: Run the focused test and confirm the expected failure**

Run: `pnpm --filter @zouma/admin exec node --import tsx --test src/lib/simulation-admin.test.ts`

Expected: FAIL on the new pagination-envelope case until the adapter is updated if necessary.

- [ ] **Step 3: Add bounded list query and preserve detail-on-demand**

Request `/simulations/runs?page=1&pageSize=50`; keep `openRun` fetching `/simulations/runs/:id` before detail, events, and bad cases.

- [ ] **Step 4: Run all focused tests and type checks**

Run: `pnpm --filter @zouma/web test && pnpm --filter @zouma/admin test && pnpm --filter @zouma/web type-check && pnpm --filter @zouma/admin type-check`

Expected: all commands exit 0.
