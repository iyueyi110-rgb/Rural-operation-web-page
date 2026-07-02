import assert from "node:assert/strict"
import test from "node:test"

import { buildVisitorNavItems } from "./visitor-navigation"

const labels = {
  tickets: "门票预购",
  calendar: "农事",
  activities: "活动",
  routes: "路线",
  booking: "院落预定",
  realms: "四境",
  adoption: "认养",
  weather: "天气",
  interactions: "互动",
  me: "个人中心",
  villager: "村民入口",
  privacy: "隐私中心",
}

test("builds a complete mobile visitor navigation for every public entry", () => {
  const nav = buildVisitorNavItems("zh-CN", labels)

  assert.deepEqual(
    nav.mobileItems.map((item) => item.href),
    [
      "/zh-CN/tickets",
      "/zh-CN/calendar",
      "/zh-CN/activities",
      "/zh-CN/routes",
      "/zh-CN/booking",
      "/zh-CN/explore#realms",
      "/zh-CN/trees",
      "/zh-CN/explore#weather",
      "/zh-CN/me/interactions",
      "/zh-CN/me",
      "/zh-CN/villager/login",
      "/zh-CN/privacy",
    ],
  )
})
