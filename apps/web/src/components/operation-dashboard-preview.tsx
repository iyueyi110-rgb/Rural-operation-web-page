import { Activity, CloudSun, Lightbulb, RadioTower } from "lucide-react"
import { getTranslations } from "next-intl/server"

export async function OperationDashboardPreview() {
  const t = await getTranslations("home")
  const cards = [0, 1, 2].map((index) => ({
    label: t(`cloudPreview.cards.${index}.label`),
    value: t(`cloudPreview.cards.${index}.value`),
    body: t(`cloudPreview.cards.${index}.body`),
  }))

  return (
    <aside className="relative overflow-hidden rounded-xl border border-white/12 bg-[#14211d] p-5 text-white shadow-panel">
      <div className="contour-field absolute inset-0 opacity-25" />
      <div className="relative flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-[#d7b56d]">
            {t("cloudPreview.kicker")}
          </p>
          <h3 className="mt-2 text-2xl font-extrabold">
            {t("cloudPreview.title")}
          </h3>
        </div>
        <span className="grid h-11 w-11 place-items-center rounded-lg bg-white/10 text-[#d7b56d]">
          <Lightbulb aria-hidden="true" className="h-5 w-5" />
        </span>
      </div>

      <div className="relative mt-6 grid gap-3">
        {cards.map((card, index) => (
          <div
            className="rounded-lg border border-white/10 bg-white/[0.055] p-4"
            key={card.label}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold text-white/42">{card.label}</p>
                <p className="mt-1 text-2xl font-extrabold tracking-tight">
                  {card.value}
                </p>
              </div>
              {index === 0 ? (
                <Activity aria-hidden="true" className="h-5 w-5 text-[#d7b56d]" />
              ) : index === 1 ? (
                <RadioTower aria-hidden="true" className="h-5 w-5 text-[#d7b56d]" />
              ) : (
                <CloudSun aria-hidden="true" className="h-5 w-5 text-[#d7b56d]" />
              )}
            </div>
            <p className="mt-3 text-xs leading-5 text-white/54">{card.body}</p>
          </div>
        ))}
      </div>
    </aside>
  )
}
