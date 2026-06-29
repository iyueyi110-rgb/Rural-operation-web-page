import assert from "node:assert/strict"
import test from "node:test"

import { getFallbackResponse } from "./fallback-responses"

test("returns scenario-specific fallback content with a stable default", () => {
  assert.match(getFallbackResponse("route").content, /路线/)
  assert.match(getFallbackResponse("content_factory").content, /内容/)
  assert.match(getFallbackResponse("missing").content, /预设内容/)
})
