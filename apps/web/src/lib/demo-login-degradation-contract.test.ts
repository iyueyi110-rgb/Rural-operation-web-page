import assert from "node:assert/strict"
import { existsSync, readFileSync } from "node:fs"
import test from "node:test"

function readSource(relativePath: string) {
  const sourceUrl = new URL(relativePath, import.meta.url)
  assert.equal(existsSync(sourceUrl), true, `${relativePath} should exist`)
  return readFileSync(sourceUrl, "utf8")
}

test("demo login route issues a visitor JWT without a phone number", () => {
  const source = readSource("../app/api/v1/auth/demo-login/route.ts")

  assert.match(source, /export async function POST/)
  assert.match(source, /demo_\$\{randomUUID\(\)\.slice\(0,\s*8\)\}/)
  assert.match(source, /createJWT\(\{\s*userId,\s*role: "visitor"\s*\},\s*jwtSalt\)/)
  assert.match(source, /mobile: "demo_user"/)
  assert.match(source, /demoMode: true/)
})

test("demo login page saves the token and routes to the localized account page", () => {
  const pageSource = readSource("../app/[locale]/me/demo-login/page.tsx")
  const clientSource = readSource("../app/[locale]/me/demo-login/demo-login-client.tsx")

  assert.match(pageSource, /DemoLoginClient/)
  assert.match(clientSource, /fetch\("\/api\/v1\/auth\/demo-login"/)
  assert.match(clientSource, /saveAuthToken\(result\.token\)/)
  assert.match(clientSource, /router\.replace\(`\/\$\{locale\}\/me`\)/)
  assert.match(clientSource, /演示登录失败，请稍后重试/)
})

test("home header exposes the demo login entry", () => {
  const source = readSource("../components/home-header.tsx")

  assert.match(source, /href=\{`\/\$\{locale\}\/me\/demo-login`\}/)
  assert.match(source, /演示登录/)
})

test("database-backed GET routes return degraded responses when Prisma queries fail", () => {
  const reportsSource = readSource("../app/api/v1/reports/route.ts")
  const adoptionsSource = readSource("../app/api/v1/tree-adoptions/route.ts")
  const ordersSource = readSource("../app/api/v1/orders/route.ts")
  const feedbackSource = readSource("../app/api/v1/feedback/route.ts")

  assert.match(reportsSource, /catch \(error\)/)
  assert.match(reportsSource, /buildFallbackDailyReport\(getChinaDateString\(\)\)/)
  assert.match(reportsSource, /degraded: true/)

  assert.match(adoptionsSource, /catch \(error\)/)
  assert.match(adoptionsSource, /认养记录暂无演示数据/)
  assert.match(adoptionsSource, /degraded: true/)

  assert.match(ordersSource, /catch \(error\)/)
  assert.match(ordersSource, /totalAmount: 0/)
  assert.match(ordersSource, /订单记录暂无演示数据/)

  assert.match(feedbackSource, /catch \(error\)/)
  assert.match(feedbackSource, /feedbackTicket\.findMany/)
  assert.match(feedbackSource, /pageSize: 0/)
  assert.match(feedbackSource, /反馈记录暂无演示数据/)
})
