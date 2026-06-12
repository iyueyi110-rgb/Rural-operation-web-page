"use client"

import { useTranslations } from "next-intl"

import { Section } from "@ui/index"

export default function TreesError({ reset }: { reset: () => void }) {
  const t = useTranslations("common")

  return (
    <main className="min-h-screen bg-rice text-ink">
      <Section className="py-20">
        <div className="rounded-lg border border-stone bg-white p-6 shadow-soft">
          <h1 className="text-2xl font-extrabold">{t("errorTitle")}</h1>
          <p className="mt-3 text-sm leading-7 text-ink/64">{t("errorBody")}</p>
          <button className="mt-5 rounded-full bg-ink px-5 py-3 text-sm font-bold text-white" onClick={reset} type="button">
            {t("retry")}
          </button>
        </div>
      </Section>
    </main>
  )
}
