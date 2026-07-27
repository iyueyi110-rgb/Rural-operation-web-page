import { jsonResponse } from "@web/lib/aigc-api"

export function apiError(
  request: Request,
  code: string,
  message: string,
  status: number,
  details?: Record<string, unknown>,
) {
  return jsonResponse(
    request,
    { error: { code, message, ...(details ? { details } : {}) } },
    { status },
  )
}
