export interface PaginationParams {
  page: number
  limit: number
  skip: number
}

export interface PaginatedResult<T> {
  data: T[]
  meta: {
    total: number
    page: number
    limit: number
    totalPages: number
  }
}

function parsePositiveInt(value: string | null, fallback: number) {
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback
}

export function parsePaginationParams(
  searchParams: URLSearchParams,
  options: { defaultLimit?: number; maxLimit?: number } = {},
): PaginationParams {
  const defaultLimit = options.defaultLimit ?? 20
  const maxLimit = options.maxLimit ?? 100
  const page = parsePositiveInt(searchParams.get("page"), 1)
  const requestedLimit = parsePositiveInt(searchParams.get("limit"), defaultLimit)
  const limit = Math.min(requestedLimit, maxLimit)

  return {
    page,
    limit,
    skip: (page - 1) * limit,
  }
}

export function paginationMeta(total: number, params: PaginationParams) {
  return {
    total,
    page: params.page,
    limit: params.limit,
    totalPages: Math.max(1, Math.ceil(total / params.limit)),
  }
}

export function paginateArray<T>(
  rows: T[],
  params: PaginationParams,
): PaginatedResult<T> {
  return {
    data: rows.slice(params.skip, params.skip + params.limit),
    meta: paginationMeta(rows.length, params),
  }
}
