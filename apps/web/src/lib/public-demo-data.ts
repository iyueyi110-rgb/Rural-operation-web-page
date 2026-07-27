export interface DemoActivity {
  id: string
  courtyardId: string
  activityType: string
  title: string
  description: string
  maxCapacity: number
  price?: number
  scheduledDate: string
  scheduledTime: string
  status: string
  bookedCount: number
}

export interface DemoProduct {
  id: string
  name: string
  category: string
  description: string
  price: number | null
  unit: string | null
  stockStatus: string
  nodeId: string | null
  imageUrl: string | null
  status: string
  createdAt: string
  updatedAt: string
  node: null
}

export interface DemoFarmingCalendarItem {
  id: string
  solarTerm: string
  title: string
  description: string
  activityType:
    | "planting"
    | "pruning"
    | "fertilizing"
    | "harvesting"
    | "processing"
    | "festival"
  startDate: string
  endDate: string | null
  treeSpecies: "lychee" | "longan" | null
  status: "upcoming" | "active" | "completed"
}

export const publicDemoActivities: DemoActivity[] = [
  {
    id: "demo-public-activity-food",
    courtyardId: "ridge-shared-courtyard",
    activityType: "food_class",
    title: "岭上村宴食育课",
    description: "围绕荔枝、山野菜和村宴故事的半日体验。",
    maxCapacity: 16,
    price: 68,
    scheduledDate: "2026-07-26",
    scheduledTime: "10:00",
    status: "open",
    bookedCount: 4,
  },
  {
    id: "demo-public-activity-harvest",
    courtyardId: "lychee-food-courtyard",
    activityType: "harvest",
    title: "荔枝采摘回访日",
    description: "认养人与亲子游客参与采摘、分级和打包。",
    maxCapacity: 20,
    price: 88,
    scheduledDate: "2026-07-27",
    scheduledTime: "15:00",
    status: "open",
    bookedCount: 6,
  },
]

export const publicDemoProducts: DemoProduct[] = [
  {
    id: "demo-public-product-lychee",
    name: "走马荔枝礼盒",
    category: "fresh",
    description: "结合荔枝鲜果、村落故事卡和认养树回访权益的季节礼盒。",
    price: 168,
    unit: "盒",
    stockStatus: "seasonal",
    nodeId: null,
    imageUrl: null,
    status: "active",
    createdAt: "2026-07-20T00:00:00.000Z",
    updatedAt: "2026-07-20T00:00:00.000Z",
    node: null,
  },
  {
    id: "demo-public-product-dried-fruit",
    name: "果园风味果干",
    category: "processed",
    description: "由村内果林资源加工的小份伴手礼，适合门票和研学订单加购。",
    price: 39,
    unit: "袋",
    stockStatus: "available",
    nodeId: null,
    imageUrl: null,
    status: "active",
    createdAt: "2026-07-20T00:00:00.000Z",
    updatedAt: "2026-07-20T00:00:00.000Z",
    node: null,
  },
  {
    id: "demo-public-product-meal",
    name: "岭上村宴预订",
    category: "meal",
    description: "面向院落和路线游客的村宴占位产品，当前仅生成线下确认单。",
    price: null,
    unit: "桌",
    stockStatus: "reservation",
    nodeId: null,
    imageUrl: null,
    status: "active",
    createdAt: "2026-07-20T00:00:00.000Z",
    updatedAt: "2026-07-20T00:00:00.000Z",
    node: null,
  },
]

export const publicDemoFarmingCalendar: DemoFarmingCalendarItem[] = [
  {
    id: "demo-public-calendar-harvest",
    solarTerm: "夏至",
    title: "荔枝采摘与食育准备",
    description:
      "组织成熟果采摘、分级、冷藏和食育课堂物料准备，服务认养回访与亲子课程。",
    activityType: "harvesting",
    startDate: "2026-06-21",
    endDate: "2026-06-28",
    treeSpecies: "lychee",
    status: "active",
  },
  {
    id: "demo-public-calendar-processing",
    solarTerm: "立秋",
    title: "果干与伴手礼加工",
    description:
      "整理夏季果品去向，试制果干、果饮和村庄伴手礼，为农产品订单做内容准备。",
    activityType: "processing",
    startDate: "2026-08-07",
    endDate: "2026-08-12",
    treeSpecies: "longan",
    status: "upcoming",
  },
]
