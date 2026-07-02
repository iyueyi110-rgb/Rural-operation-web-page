import { jsonResponse, optionsResponse } from "@web/lib/aigc-api"

export function OPTIONS(request: Request) {
  return optionsResponse(request)
}

export async function GET(request: Request) {
  return jsonResponse(request, {
    data: {
      version: "1.0",
      lastUpdated: "2026-07-02",
      sections: ["数据收集", "数据使用", "数据存储", "用户权利", "联系方式"],
    },
    meta: {
      degraded: false,
    },
  })
}
