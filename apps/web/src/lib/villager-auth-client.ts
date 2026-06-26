const TOKEN_KEY = "villager_token"

export function readVillagerToken(
  storage: Pick<Storage, "getItem"> = window.localStorage,
) {
  return storage.getItem(TOKEN_KEY)
}

export function getVillagerSession() {
  if (typeof window === "undefined") return null
  const token = readVillagerToken()
  return token ? { token } : null
}

export function saveVillagerToken(token: string) {
  window.localStorage.setItem(TOKEN_KEY, token)
}

export function clearVillagerToken() {
  window.localStorage.removeItem(TOKEN_KEY)
}

export function fetchWithVillagerAuth(
  input: RequestInfo | URL,
  init: RequestInit = {},
) {
  const session = getVillagerSession()
  const headers = new Headers(init.headers)
  if (session) headers.set("X-Villager-Token", session.token)
  return fetch(input, { ...init, headers })
}
