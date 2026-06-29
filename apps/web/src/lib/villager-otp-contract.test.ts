import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

const requestOtpSource = readFileSync(
  new URL("../app/api/v1/villager-auth/request-otp/route.ts", import.meta.url),
  "utf8",
)

test("development villager otp request returns the temporary code", () => {
  assert.match(requestOtpSource, /process\.env\.NODE_ENV === "development"/)
  assert.match(requestOtpSource, /const DEMO_OTP = "888888"/)
  assert.match(requestOtpSource, /return jsonResponse\(request, \{[\s\S]*?otp,\s*\}\)/)
})
