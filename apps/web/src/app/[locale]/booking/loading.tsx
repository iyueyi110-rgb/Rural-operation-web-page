import { getTranslations } from "next-intl/server"

export default async function BookingLoading() {
  const t = await getTranslations("common")

  return (
    <main className="flex min-h-screen items-center justify-center bg-rice px-6 text-ink">
      <p className="rounded-full border border-stone bg-white/80 px-5 py-3 text-sm shadow-soft">
        {t("loading")}
      </p>
    </main>
  )
}
