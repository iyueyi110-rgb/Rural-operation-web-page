import assert from "node:assert/strict"
import { existsSync, readFileSync } from "node:fs"
import test from "node:test"
import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"

import {
  ADMIN_WRITE_LOGIN_MESSAGE,
  adminWriteControlProps,
  useAdminAccess,
} from "../components/admin-access"

function source(relativePath: string) {
  const url = new URL(relativePath, import.meta.url)
  return existsSync(url) ? readFileSync(url, "utf8") : ""
}

const accessSource = source("../components/admin-access.tsx")
const layoutSource = source("../app/layout.tsx")
const shellSource = source("../app/admin-shell.tsx")
const sidebarSource = source("../components/admin-sidebar.tsx")
const copySource = source("./admin-copy.ts")

const protectedControlSources = [
  "../components/active-alerts-panel.tsx",
  "../components/recommendation-review-panel.tsx",
  "../app/feedback-admin.tsx",
  "../app/(assets-commerce)/activities/page.tsx",
  "../app/(assets-commerce)/harvest/page.tsx",
  "../app/(assets-commerce)/products/page.tsx",
  "../app/(assets-commerce)/trees/page.tsx",
  "../app/(ai-system)/devices/page.tsx",
  "../app/(command)/reports/page.tsx",
  "../app/(field-ops)/alerts/page.tsx",
  "../app/(village-work)/farming/page.tsx",
  "../app/(village-work)/tasks/page.tsx",
  "../app/(village-work)/villagers/page.tsx",
  "../components/simulation/runs-panel.tsx",
  "../components/simulation/comparison-panel.tsx",
  "../components/simulation/bad-cases-panel.tsx",
]

function AdminAccessDefaultProbe() {
  return createElement("span", null, String(useAdminAccess().canWrite))
}

test("the root layout derives only a boolean write capability from the HttpOnly session", () => {
  assert.match(layoutSource, /cookies\(\)/)
  assert.match(layoutSource, /verifyAdminSession/)
  const adminShellTag = layoutSource.match(/<AdminShell\b[^>]*>/)?.[0] ?? ""
  assert.equal(adminShellTag, "<AdminShell canWrite={canWrite}>")
  assert.doesNotMatch(
    adminShellTag,
    /\b\w*(?:session|secret|token|password)\w*\s*=/iu,
  )
})

test("the Admin access context defaults to read-only access", () => {
  assert.equal(
    renderToStaticMarkup(createElement(AdminAccessDefaultProbe)),
    "<span>false</span>",
  )
})

test("admin write control props disable guests and preserve explicit disabled state", () => {
  assert.deepEqual(adminWriteControlProps(false), {
    disabled: true,
    title: ADMIN_WRITE_LOGIN_MESSAGE,
  })
  assert.deepEqual(adminWriteControlProps(false, true), {
    disabled: true,
    title: ADMIN_WRITE_LOGIN_MESSAGE,
  })
  assert.deepEqual(adminWriteControlProps(true), { disabled: false })
  assert.deepEqual(adminWriteControlProps(true, true), { disabled: true })
})

test("the Admin shell provides guest access state to client components", () => {
  assert.match(accessSource, /createContext/)
  assert.match(accessSource, /AdminAccessProvider/)
  assert.match(accessSource, /useAdminAccess/)
  assert.match(accessSource, /adminWriteControlProps/)
  assert.match(shellSource, /<AdminAccessProvider canWrite=\{canWrite\}>/)
})

test("every protected mutation surface consumes the shared write guard", () => {
  for (const relativePath of protectedControlSources) {
    const fileSource = source(relativePath)
    assert.match(fileSource, /useAdminAccess/, relativePath)
    assert.match(fileSource, /adminWriteControlProps/, relativePath)
  }
})

test("guest AI questions remain enabled while human escalation requires login", () => {
  const page = source("../app/(ai-system)/ai-assistant/page.tsx")
  assert.match(page, /onClick=\{askQuestion\}/)
  assert.match(
    page,
    /onClick=\{\(\) => transferToHuman\(item\)\}[\s\S]{0,240}adminWriteControlProps/,
  )
})

test("guest decision generation remains enabled while command changes require login", () => {
  const page = source("../app/(ai-system)/infrastructure/page.tsx")
  assert.match(page, /onClick=\{runDecision\}/)
  assert.match(page, /updateCommand[\s\S]*adminWriteControlProps/)
  assert.match(page, /submitManualReading[\s\S]*adminWriteControlProps/)
})

test("renovation diagnosis and content generation remain guest capabilities", () => {
  const renovation = source("../app/(renovation)/renovation/page.tsx")
  const contentFactory = source("../app/(ai-system)/content-factory/page.tsx")
  assert.match(renovation, /onClick=\{runDiagnosis\}/)
  assert.match(contentFactory, /\/ai\/generate-content/)
})

test("the sidebar distinguishes guest and administrator modes", () => {
  assert.match(copySource, /guestMode: "访客模式"/)
  assert.match(copySource, /adminMode: "管理员模式"/)
  assert.match(sidebarSource, /const \{ canWrite \} = useAdminAccess\(\)/)
  assert.match(
    sidebarSource,
    /canWrite \? adminCopy\.shell\.adminMode : adminCopy\.shell\.guestMode/,
  )
  assert.match(
    sidebarSource,
    /!canWrite \? \([\s\S]*?<Link className="text-xs font-extrabold text-white" href="\/login">/,
  )
  assert.doesNotMatch(sidebarSource, /访客模式|管理员模式/u)
})
