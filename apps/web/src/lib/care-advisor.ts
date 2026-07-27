import "server-only"

import { prisma } from "@zouma/database"
import { ModelProviderAdapter } from "@zouma/utils"

import { getWeatherSummary } from "@web/lib/weather"
import { collectActiveAdopterPhones } from "@web/lib/notification-hooks"

const careAdviceFallback = "AI 养护建议暂时不可用，请运营人员根据近期养护日志、天气和农事日历人工复核。"

export async function generateCareAdvice(): Promise<string> {
  try {
    const [trees, calendar, weather] = await Promise.all([
      prisma.orchardTree.findMany({
        include: { careLogs: { orderBy: { createdAt: "desc" }, take: 5 } },
        orderBy: { treeCode: "asc" },
      }),
      prisma.farmingCalendar.findMany({
        where: { status: { in: ["upcoming", "active"] } },
        orderBy: { startDate: "asc" },
        take: 8,
      }),
      getWeatherSummary(),
    ])

    const context = {
      weather: weather.summary,
      calendar: calendar.map((item) => ({
        title: item.title,
        activityType: item.activityType,
        startDate: item.startDate,
        status: item.status,
      })),
      trees: trees.map((tree) => ({
        treeCode: tree.treeCode,
        species: tree.species,
        healthStatus: tree.healthStatus,
        lastCareLogs: tree.careLogs.map((log) => ({
          logType: log.logType,
          content: log.content,
          createdAt: log.createdAt.toISOString().slice(0, 10),
        })),
      })),
    }

    const result = await ModelProviderAdapter.complete(
      `根据以下树木养护数据、天气和农事日历，给出 3-5 条本周养护建议。每条一行，必须包含树木编号或适用树群，并说明具体操作。\n${JSON.stringify(context)}`,
      {
        systemPrompt:
          "你是走马村果园养护专家。根据养护日志、天气和农事日历，给出具体、可执行、面向运营人员的养护建议。不要面向游客宣传，不要编造不存在的检测数据。",
        temperature: 0.3,
      },
    )

    const content = result.content.trim() || careAdviceFallback
    if (content !== careAdviceFallback) {
      void notifyActiveAdopters(content).catch((error) =>
        console.error("Failed to create care notifications:", error),
      )
    }
    return content
  } catch (error) {
    console.error("Care advice generation failed:", error)
    return careAdviceFallback
  }
}

async function notifyActiveAdopters(content: string) {
  const activeAdoptions = await prisma.treeAdoption.findMany({
    where: { status: "active" },
    select: { adopterPhone: true },
    distinct: ["adopterPhone"],
  })
  const phones = collectActiveAdopterPhones(activeAdoptions)

  await Promise.allSettled(
    phones.map((phone) =>
      prisma.notification.create({
        data: {
          recipientType: "tourist",
          recipientId: phone,
          title: "🌳 你的果园本周有新的养护建议",
          body: content.slice(0, 300),
          category: "tree",
        },
      }),
    ),
  )
}
