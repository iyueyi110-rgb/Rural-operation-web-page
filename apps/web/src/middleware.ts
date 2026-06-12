import createMiddleware from "next-intl/middleware"

import { defaultLocale, locales } from "./i18n/routing"

export default createMiddleware({
  defaultLocale,
  locales,
})

export const config = {
  matcher: ["/((?!api|_next|.*\\..*).*)"],
}
