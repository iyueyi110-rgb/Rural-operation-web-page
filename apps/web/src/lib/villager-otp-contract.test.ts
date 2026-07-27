import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

const requestOtpSource = readFileSync(
  new URL("../app/api/v1/villager-auth/request-otp/route.ts", import.meta.url),
  "utf8",
)

test("villager otp request returns the temporary code whenever SMS is unavailable", () => {
  assert.doesNotMatch(requestOtpSource, /process\.env\.NODE_ENV === "development"/)
  assert.match(requestOtpSource, /const demoMode = smsUnavailable/)
  assert.match(requestOtpSource, /const DEMO_OTP = "888888"/)
  assert.match(requestOtpSource, /return jsonResponse\(request, \{[\s\S]*?otp,\s*\}\)/)
})
