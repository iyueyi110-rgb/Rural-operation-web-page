import { prisma } from "../src/index"

const farmingCalendarItems = [
  {
    id: "farm-qingming-lychee-care",
    solarTerm: "清明",
    title: "荔枝春梢与花序观察",
    description: "观察荔枝春梢、花序和病虫害迹象，形成认养树成长记录和春季养护提示。",
    activityType: "pruning",
    startDate: "2026-04-04",
    endDate: "2026-04-08",
    treeSpecies: "lychee",
    status: "completed",
  },
  {
    id: "farm-xiaoman-fertilizing",
    solarTerm: "小满",
    title: "果园水肥巡检",
    description: "结合雨水和土壤湿度检查荔枝、龙眼果园水肥状态，安排轻量施肥和排水整理。",
    activityType: "fertilizing",
    startDate: "2026-05-21",
    endDate: "2026-05-24",
    treeSpecies: "lychee",
    status: "completed",
  },
  {
    id: "farm-xiazhi-harvest",
    solarTerm: "夏至",
    title: "荔枝采摘与食育准备",
    description: "组织成熟果采摘、分级、冷藏和食育课堂物料准备，服务认养回访与亲子课程。",
    activityType: "harvesting",
    startDate: "2026-06-21",
    endDate: "2026-06-28",
    treeSpecies: "lychee",
    status: "active",
  },
  {
    id: "farm-liqiu-processing",
    solarTerm: "立秋",
    title: "果干与伴手礼加工",
    description: "整理夏季果品去向，试制果干、果饮和村庄伴手礼，为农产品订单做内容准备。",
    activityType: "processing",
    startDate: "2026-08-07",
    endDate: "2026-08-12",
    treeSpecies: "longan",
    status: "upcoming",
  },
]

export async function seedFarmingCalendar() {
  for (const item of farmingCalendarItems) {
    await prisma.farmingCalendar.upsert({
      where: { id: item.id },
      update: item,
      create: item,
    })
  }
}
