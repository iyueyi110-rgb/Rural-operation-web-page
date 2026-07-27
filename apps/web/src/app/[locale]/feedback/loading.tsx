import { getTranslations } from "next-intl/server"

import { Section } from "@ui/index"

export default async function FeedbackLoading() {
  const t = await getTranslations("common")

  return (
    <main className="min-h-screen bg-rice text-ink">
      <Section className="py-20">
        <div className="rounded-lg border border-stone bg-white p-6 text-sm font-semibold text-ink/64 shadow-soft">
          {t("loading")}
        </div>
      </Section>
    </main>
  )
}
