"use client"

import { useTranslations } from "next-intl"

export default function VillagerError({ reset }: { reset: () => void }) {
  const t = useTranslations("villagerSystem")
  return (
    <main className="grid min-h-screen place-items-center bg-rice p-6 text-ink">
      <div className="w-full max-w-md rounded-lg border border-stone bg-white p-6 text-center shadow-soft">
        <h1 className="text-xl font-extrabold">{t("common.error")}</h1>
        <button
          className="mt-5 h-11 rounded-full bg-ink px-6 text-sm font-bold text-white"
          onClick={reset}
          type="button"
        >
          {t("common.retry")}
        </button>
      </div>
    </main>
  )
}
