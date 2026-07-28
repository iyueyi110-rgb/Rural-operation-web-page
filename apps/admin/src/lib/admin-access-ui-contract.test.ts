import assert from "node:assert/strict"
import { existsSync, readFileSync } from "node:fs"
import test from "node:test"

function source(relativePath: string) {
  const url = new URL(relativePath, import.meta.url)
  return existsSync(url) ? readFileSync(url, "utf8") : ""
}

const accessSource = source("../components/admin-access.tsx")
const layoutSource = source("../app/layout.tsx")
const shellSource = source("../app/admin-shell.tsx")
const sidebarSource = source("../components/admin-sidebar.tsx")

test("the root layout derives only a boolean write capability from the HttpOnly session", () => {
  assert.match(layoutSource, /cookies\(\)/)
  assert.match(layoutSource, /verifyAdminSession/)
  assert.match(layoutSource, /<AdminShell canWrite=\{canWrite\}>/)
  assert.doesNotMatch(layoutSource, /ADMIN_API_TOKEN/)
})

test("the Admin shell provides guest access state to client components", () => {
  assert.match(accessSource, /createContext/)
  assert.match(accessSource, /AdminAccessProvider/)
  assert.match(accessSource, /useAdminAccess/)
  assert.match(accessSource, /adminWriteControlProps/)
  assert.match(shellSource, /<AdminAccessProvider canWrite=\{canWrite\}>/)
})

test("the sidebar distinguishes guest and administrator modes", () => {
  assert.match(sidebarSource, /访客模式/)
  assert.match(sidebarSource, /管理员模式/)
  assert.match(sidebarSource, /href="\/login"/)
})
