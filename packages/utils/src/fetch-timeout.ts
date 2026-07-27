export async function fetchWithTimeout(
  url: RequestInfo | URL,
  init: RequestInit = {},
  timeoutMs = 15_000,
) {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

  try {
    return await fetch(url, { ...init, signal: init.signal ?? controller.signal })
  } finally {
    clearTimeout(timeoutId)
  }
}
