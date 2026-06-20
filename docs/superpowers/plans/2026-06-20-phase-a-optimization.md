# Phase A System Optimization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver Phase A1–A11 upgrades for identity, Redis adoption safety, the public experience, recommendations, admin operations, IoT health, and acceptance documentation without regressing the existing villager, notification, or interaction systems.

**Architecture:** Keep the current Next.js BFF and Prisma architecture. Add JWT visitor identity beside the existing villager token, use Redis plus a Prisma version check for adoption concurrency, aggregate five existing data streams into persisted recommendation cards, and compose new UI from isolated components. Redis and AI hooks degrade without blocking existing business flows.

**Tech Stack:** Next.js 14 App Router, React 18, TypeScript, Prisma/PostgreSQL, Redis/ioredis, jose JWT, Leaflet/react-leaflet, next-intl, Node test runner

---

## Global constraints

- Work on `feature/phase-a-optimization`, based on the current villager integration branch.
- Preserve the current uncommitted deletion of `start.bat` and all unrelated untracked documents/assets.
- Do not modify `packages/utils/src/model-provider-adapter.ts`, `apps/web/src/lib/aigc-api.ts`, or `apps/web/src/middleware.ts`.
- Existing route handlers may only receive scoped validation/hooks; their established GET/POST behavior remains compatible.
- Add only `ioredis` and `jose`; do not add `@types/ioredis`, `jsonwebtoken`, or `bcrypt`.
- Each phase ends with fresh type, lint, focused test, and phase-specific verification, followed by exactly one local commit.

### Phase A1: Additive database models

**Files:**
- Modify: `packages/database/prisma/schema.prisma`
- Create: `packages/database/prisma/migrations/20260620140000_add_user_identity/migration.sql`
- Create: `packages/database/prisma/migrations/20260620141000_link_adoptions_and_recommendations/migration.sql`

- [ ] Back up PostgreSQL outside the repository and record the path in the phase report.
- [ ] Add `User` and `UserProfile`, generate the exact first migration with `prisma migrate diff`, inspect for CREATE/ADD only, apply it, then add `RoutePlan`, `Recommendation`, `OrchardTree.hiddenGeo/version`, `TreeAdoption.rightsJson`, and the optional `TreeAdoption.adopter` relation.
- [ ] Generate and apply the exact second migration with `prisma migrate diff`; add SQL rollback comments without executing them.
- [ ] Run `prisma validate`, `prisma generate`, `prisma migrate status`, and schema drift inspection.
- [ ] Commit once as `feat: Phase A1：数据库模型`.

### Phase A2: Redis and concurrency-safe adoption

**Files:**
- Modify: `package.json`, `pnpm-lock.yaml`, `packages/database/src/index.ts`, `infra/docker/docker-compose.dev.yml`, `.env.example`, `apps/web/src/app/api/v1/tree-adoptions/route.ts`
- Create: `packages/database/src/redis.ts`, `apps/web/src/lib/adoption-lock.ts`, `apps/web/src/lib/adoption-lock.test.ts`

- [ ] Write failing tests for lock-key/value generation and fallback classification, then run them RED.
- [ ] Add `ioredis`, a lazy global Redis client with `enableOfflineQueue: false`, a 600-second NX lock, token-safe release, and try/catch fallback.
- [ ] Add Redis 7 with a persistent volume to development compose.
- [ ] In the existing adoption POST only, acquire the lock, run a Prisma transaction that checks `version` and increments it, create the adoption, and release in `finally`; return 409 for lock/version conflict.
- [ ] Verify Redis PONG, concurrent requests (one success, one 409), version increment, no duplicate adoption, and Redis-unavailable fallback.
- [ ] Commit once as `feat: Phase A2：Redis 与认养锁`.

### Phase A3: Visitor JWT authentication

**Files:**
- Modify: `package.json`, `pnpm-lock.yaml`, `apps/web/src/components/notification-bell.tsx`, `apps/web/src/app/[locale]/trees/adoption-flow.tsx`, `apps/web/src/app/[locale]/booking/booking-flow.tsx`, `apps/web/src/app/[locale]/tickets/ticket-flow.tsx`, `.env.example`
- Create: `apps/web/src/lib/auth-jwt.ts`, `apps/web/src/lib/auth-jwt.test.ts`, `apps/web/src/lib/auth-client.ts`, `apps/web/src/lib/auth-client.test.ts`, `apps/web/src/app/api/v1/auth/request-sms/route.ts`, `apps/web/src/app/api/v1/auth/verify-sms/route.ts`, `apps/web/src/app/api/v1/auth/me/route.ts`

- [ ] Write RED tests for seven-day JWTs, malformed/expired tokens, Authorization parsing, client storage, and phone fallback.
- [ ] Add `jose`; create JWT helpers that validate the database `jwtSalt`, plus client helpers for `auth_token`.
- [ ] Add OPTIONS and strict JSON validation to request-SMS, verify-SMS, and me routes; trial responses include the six-digit code.
- [ ] Make the bell resolve JWT user ID first and masked phone second; preserve `tourist_phone` writes and add the current auth token when available.
- [ ] Verify new-user registration, code verification, JWT me, invalid/expired/revoked JWT 401, and existing villager login regression.
- [ ] Commit once as `feat: Phase A3：游客 JWT 认证`.

### Phase A4: Three-stage public homepage

**Files:**
- Modify: `apps/web/src/app/[locale]/page.tsx`, `apps/web/messages/zh-CN.json`, `apps/web/messages/en.json`, `apps/web/messages/ja.json`
- Create: `apps/web/src/lib/history-data.ts`, `apps/web/src/lib/history-data.test.ts`, `apps/web/src/components/hero-screen.tsx`, `apps/web/src/components/history-scroll.tsx`, `apps/web/src/components/realm-map-gateway.tsx`

- [ ] Write RED tests for the four ordered, source-reviewed history sections and complete locale keys.
- [ ] Add a full-height video hero with metadata preload, muted loop/autoplay/playsInline, existing-image poster fallback, weather, and an accessible scroll CTA.
- [ ] Add the four-part history scroll and a client-only Leaflet/AMap-capable realm polygon gateway with safe fallback when AMap is unavailable.
- [ ] Surgically replace only the homepage body; preserve Header, villager link, weather, booking/adoption previews, and all existing routes.
- [ ] Verify all three locales, mobile/desktop layout, reduced-motion fallback, CTA scrolling, and four polygon links.
- [ ] Commit once as `feat: Phase A4：首页三阶流线`.

### Phase A5: Recommendation cards and review flow

**Files:**
- Modify: `apps/web/src/lib/report-generator.ts`
- Create: `apps/web/src/lib/recommendation-generator.ts`, `apps/web/src/lib/recommendation-generator.test.ts`, `apps/web/src/app/api/v1/recommendations/route.ts`, `apps/web/src/app/api/v1/recommendations/generate/route.ts`, `apps/web/src/app/api/v1/recommendations/[id]/approve/route.ts`

- [ ] Write RED tests for parsed Evidence/Action/Impact output, same-day dedupe, endpoint whitelist, and approval transitions.
- [ ] Aggregate a minimal daily context, call the existing `ModelProviderAdapter`, validate structured JSON, and persist draft recommendations.
- [ ] Add GET list, POST generate, approve, and reject behavior with the existing admin-request convention and a strict internal endpoint whitelist.
- [ ] Append a non-blocking recommendation hook after daily report persistence without changing the existing report notification hook.
- [ ] Verify generate/dedupe/list/approve/reject, invalid endpoints, and AI-failure non-blocking behavior.
- [ ] Commit once as `feat: Phase A5：运营智策卡`.

### Phase A6: Geo privacy and SMS channel seam

**Files:**
- Modify: `apps/web/src/app/api/v1/trees/route.ts`, `apps/web/src/app/api/v1/trees/[code]/route.ts`, `apps/web/src/app/api/v1/tree-adoptions/route.ts`, `apps/web/src/app/api/v1/notifications/route.ts`, `.env.example`
- Create: `apps/web/src/lib/tree-geo.ts`, `apps/web/src/lib/tree-geo.test.ts`, `apps/web/src/lib/sms-provider.ts`, `apps/web/src/lib/sms-provider.test.ts`

- [ ] Write RED tests for stable ~100m grid IDs and SMS no-config fallback.
- [ ] Populate/derive `hiddenGeo` server-side and remove raw lat/lng from public tree/adoption responses and AI-bound route context.
- [ ] Add an SMS provider interface; notification channel `sms` attempts it but always preserves in-app persistence when unavailable.
- [ ] Add `JWT_SECRET`, `REDIS_URL`, `SMS_API_KEY`, and `SMS_TEMPLATE_ID` examples without committing real secrets.
- [ ] Verify public JSON contains `hiddenGeo` and no coordinates, plus SMS fallback behavior.
- [ ] Commit once as `feat: Phase A6：地理隐私与短信通道`.

### Phase A7: Tree adoption experience

**Files:**
- Modify: `apps/web/src/app/[locale]/trees/[code]/page.tsx`, the three locale message files
- Create: `apps/web/src/components/tree-environment-card.tsx`, `apps/web/src/components/adoption-rights-panel.tsx`, `apps/web/src/components/growth-animation.tsx`

- [ ] Add component-contract RED checks for online/warning/inactive sensor states and active/pending rights states.
- [ ] Add the environment card with baseline fallback, rights panel, horizontal interactive growth timeline, and reduced-motion-safe CSS animation.
- [ ] Insert new UI without removing the existing `InteractionPanel` or care-log content.
- [ ] Verify active and pending adoption views, all sensor degradation levels, three locales, and mobile horizontal scrolling.
- [ ] Commit once as `feat: Phase A7：认养体验升级`.

### Phase A8: Minimal admin cloud-brain dashboard

**Files:**
- Modify: `apps/admin/src/app/dashboard/page.tsx`, `apps/admin/src/components/admin-sidebar.tsx`, `apps/admin/src/app/globals.css`
- Create: `apps/admin/src/components/dashboard-module-card.tsx`, `apps/admin/src/components/recommendation-review-panel.tsx`, `apps/admin/src/components/active-alerts-panel.tsx`, `apps/admin/src/app/recommendations/page.tsx`

- [ ] Write RED pure-state tests for recommendation tabs/actions and alert dispatch payloads.
- [ ] Compose five dark dashboard modules from existing APIs with the documented refresh cadences and explicit loading/error/empty states.
- [ ] Add review and active-alert panels; add `/recommendations` to the real admin route/sidebar structure.
- [ ] Verify dashboard and recommendation tabs, approve/reject, alert dispatch, responsive layout, and no existing admin route regression.
- [ ] Commit once as `feat: Phase A8：云脑后台重构`.

### Phase A9: Five-stream recommendation integration

**Files:**
- Modify: `apps/web/src/lib/recommendation-generator.ts`, `apps/web/src/lib/recommendation-generator.test.ts`, `apps/web/src/lib/alert-engine.ts`

- [ ] Expand RED tests to assert F1 villager production, F2 visitor behavior, F3 sensing, F4 product feedback, and F5 operating-loop context.
- [ ] Fetch the five streams in parallel and retain same-day draft/approved dedupe.
- [ ] Add non-blocking weather-warning recommendation generation after weather alerts while preserving alert notifications and dedupe.
- [ ] Verify context coverage, daily dedupe, weather-plan draft creation, and alert latency.
- [ ] Commit once as `feat: Phase A9：多源数据流整合`.

### Phase A10: IoT heartbeat and degradation

**Files:**
- Modify: `apps/web/src/lib/report-generator.ts`, `apps/web/src/components/tree-environment-card.tsx`
- Create: `apps/web/src/lib/device-heartbeat.ts`, `apps/web/src/lib/device-heartbeat.test.ts`

- [ ] Write RED tests for the 90-minute threshold, same-day per-device dedupe, warning transition, and no-op for healthy devices.
- [ ] Implement heartbeat checks with non-blocking alert creation/notification and device warning updates.
- [ ] Add heartbeat to the report Promise.all and keep the A5 recommendation call after report persistence.
- [ ] Verify report generation, offline alert dedupe, warning UI fallback, and healthy device behavior.
- [ ] Commit once as `feat: Phase A10：IoT 健康自检`.

### Phase A11: Acceptance contract

**Files:**
- Create: `docs/acceptance-criteria.md`

- [ ] Document the six KPIs and eight scenarios with prerequisites, exact API/UI steps, expected results, and SQL/API evidence.
- [ ] Run the complete Prisma, Redis, API, browser, type, lint, unit, and build checklist; record known unrelated build baselines explicitly.
- [ ] Confirm no test rows, uploads, temporary logs, or dev processes remain.
- [ ] Commit once as `docs: Phase A11：系统验收标准`.
