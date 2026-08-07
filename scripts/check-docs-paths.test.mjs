import assert from "node:assert/strict"
import test from "node:test"
import { shouldScanDocumentationDirectory } from "./check-docs-paths.mjs"

test("documentation scan excludes local worktrees and generated directories", () => {
  assert.equal(shouldScanDocumentationDirectory(".worktrees"), false)
  assert.equal(shouldScanDocumentationDirectory("node_modules"), false)
  assert.equal(shouldScanDocumentationDirectory("output"), false)
})

test("documentation scan keeps repository documentation directories", () => {
  assert.equal(shouldScanDocumentationDirectory("docs"), true)
  assert.equal(shouldScanDocumentationDirectory("portfolio"), true)
})
