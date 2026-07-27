"use client"

import { useTranslations } from "next-intl"

export default function BookingError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useTranslations("common")

  return (
    <main className="flex min-h-screen items-center justify-center bg-rice px-6 text-ink">
      <div className="max-w-md rounded-lg border border-stone bg-white p-6 text-center shadow-soft">
        <h1 className="text-xl font-semibold">{t("errorTitle")}</h1>
        <p className="mt-3 text-sm text-ink/70">{t("errorBody")}</p>
        <button
          className="mt-5 rounded-full bg-ink px-5 py-2 text-sm font-semibold text-white"
          onClick={reset}
          type="button"
        >
          {t("retry")}
        </button>
      </div>
    </main>
  )
}
