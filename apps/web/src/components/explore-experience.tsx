import Link from "next/link"
import { CalendarDays, CloudSun, Map, MoveRight, ShieldCheck, Sprout } from "lucide-react"
import type { ComponentType } from "react"
import { getTranslations } from "next-intl/server"

import { HistoryScroll } from "@web/components/history-scroll"
import { RealmMapGateway } from "@web/components/realm-map-gateway"
import type { Locale } from "@web/i18n/routing"
import { featuredPlayCards } from "@web/lib/home-data"
import type { WeatherSummary } from "@web/lib/weather"
import { Section } from "@ui/index"

const iconMap: Record<
  (typeof featuredPlayCards)[number]["icon"],
  ComponentType<{ className?: string }>
> = {
  CalendarDays,
  Map,
  Sprout,
}

export async function ExploreExperience({
  locale,
  weather,
}: {
  locale: Locale
  weather: WeatherSummary
}) {
  const t = await getTranslations({ locale, namespace: "home" })
  const weatherIsLive = weather.source === "qweather"

  return (
    <>
      <HistoryScroll />

      <Section className="relative z-20 -mt-6">
        <div
          className="grid gap-4 rounded-lg border border-stone bg-white/88 p-4 shadow-soft backdrop-blur md:grid-cols-[1fr_1.4fr_1fr]"
          id="weather"
        >
          <div className="rounded-md bg-ink p-5 text-white">
            <div className="flex items-center gap-2 text-sm text-white/76">
              <CloudSun aria-hidden="true" className="h-4 w-4" />
              {t("weather.eyebrow")}
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <div className="text-3xl font-extrabold">{weather.temperature}</div>
              <span
                className={
                  weatherIsLive
                    ? "rounded-full bg-moss px-3 py-1 text-xs font-bold text-white"
                    : "rounded-full bg-white/14 px-3 py-1 text-xs font-bold text-white/72"
                }
              >
                {weatherIsLive ? t("weather.realtime") : t("weather.pending")}
              </span>
            </div>
            <p className="mt-2 text-sm leading-6 text-white/75">{weather.summary}</p>
            {!weatherIsLive ? (
              <p className="mt-3 text-xs leading-5 text-white/58">
                {t("weather.configureHint")}
                <Link
                  className="ml-2 font-bold text-white underline underline-offset-4"
                  href={`/${locale}/routes`}
                >
                  {t("weather.configureLink")}
                </Link>
              </p>
            ) : null}
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            {featuredPlayCards.map((card) => {
              const Icon = iconMap[card.icon]
              return (
                <article className="rounded-md bg-rice p-5" key={card.titleKey}>
                  <Icon className="h-5 w-5 text-water" />
                  <h2 className="mt-4 text-base font-bold">{t(card.titleKey)}</h2>
                  <p className="mt-2 text-sm leading-6 text-ink/68">
                    {t(card.bodyKey)}
                  </p>
                  {card.href ? (
                    <Link
                      className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-water"
                      href={`/${locale}${card.href}`}
                    >
                      {t(card.linkKey)}
                      <MoveRight aria-hidden="true" className="h-4 w-4" />
                    </Link>
                  ) : null}
                </article>
              )
            })}
          </div>

          <div className="rounded-md border border-stone bg-white p-5">
            <div className="flex items-center gap-2 text-sm font-semibold text-moss">
              <ShieldCheck aria-hidden="true" className="h-4 w-4" />
              {t("guardrails.title")}
            </div>
            <p className="mt-3 text-sm leading-6 text-ink/70">
              {t("guardrails.body")}
            </p>
          </div>
        </div>
      </Section>

      <RealmMapGateway />
    </>
  )
}
