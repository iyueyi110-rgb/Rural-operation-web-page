import {
  ADMIN_SESSION_COOKIE,
  readCookie,
  verifyAdminSession,
} from "./admin-session.server"

interface AdminBffDependencies {
  sessionSecret: string
  webApiBase: string
  adminApiToken: string
  fetcher?: typeof fetch
}

function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status })
}

function upstreamUrl(base: string, path: string[], requestUrl: string) {
  const safePath = path.map((segment) => encodeURIComponent(segment)).join("/")
  const query = new URL(requestUrl).search
  return `${base.replace(/\/+$/u, "")}/${safePath}${query}`
}

export async function proxyAdminRequest(
  request: Request,
  path: string[],
  dependencies: AdminBffDependencies,
) {
  const session = readCookie(
    request.headers.get("cookie"),
    ADMIN_SESSION_COOKIE,
  )
  if (!(await verifyAdminSession(session, dependencies.sessionSecret))) {
    return jsonError("Unauthorized", 401)
  }
  const origin = request.headers.get("origin")
  if (
    request.method !== "GET" &&
    request.method !== "HEAD" &&
    origin &&
    origin !== new URL(request.url).origin
  ) {
    return jsonError("Forbidden", 403)
  }
  if (!dependencies.adminApiToken || !dependencies.webApiBase) {
    return jsonError("Admin proxy is not configured", 503)
  }

  const headers = new Headers(request.headers)
  headers.delete("cookie")
  headers.delete("host")
  headers.delete("content-length")
  headers.set("X-Admin-Token", dependencies.adminApiToken)

  const hasBody = request.method !== "GET" && request.method !== "HEAD"
  const body = hasBody ? await request.arrayBuffer() : undefined
  const upstream = await (dependencies.fetcher ?? fetch)(
    upstreamUrl(dependencies.webApiBase, path, request.url),
    {
      method: request.method,
      headers,
      ...(body && body.byteLength > 0 ? { body } : {}),
      redirect: "manual",
    },
  )

  const responseHeaders = new Headers(upstream.headers)
  responseHeaders.delete("set-cookie")
  responseHeaders.delete("content-length")
  // Node's fetch transparently decompresses upstream responses while keeping
  // the original transport headers. Forwarding those headers would make the
  // browser attempt to decompress the already-decoded body a second time.
  responseHeaders.delete("content-encoding")
  responseHeaders.delete("transfer-encoding")
  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: responseHeaders,
  })
}
