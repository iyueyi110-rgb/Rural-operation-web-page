import assert from "node:assert/strict"
import test from "node:test"

import { paginateArray, parsePaginationParams } from "./pagination"

test("parses pagination with defaults and a hard maximum", () => {
  const url = new URL("https://zouma.test/api?page=2&limit=500")

  assert.deepEqual(parsePaginationParams(url.searchParams), {
    page: 2,
    limit: 100,
    skip: 100,
  })
})

test("paginates arrays with stable metadata", () => {
  const rows = ["a", "b", "c", "d", "e"]

  assert.deepEqual(paginateArray(rows, { page: 2, limit: 2, skip: 2 }), {
    data: ["c", "d"],
    meta: {
      total: 5,
      page: 2,
      limit: 2,
      totalPages: 3,
    },
  })
})
