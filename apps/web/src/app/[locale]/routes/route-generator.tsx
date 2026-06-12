"use client"

import Image from "next/image"
import Link from "next/link"
import { AlertTriangle, Clock3, MapPinned, MoveRight, Route, Umbrella } from "lucide-react"
import { useTranslations } from "next-intl"
import { useMemo, useState } from "react"

import {
  selectRouteOption,
  type RouteAudience,
  type RouteDuration,
  type RouteWeather,
} from "@web/lib/routes-data"
import type { Locale } from "@web/i18n/routing"

export function RouteGenerator({ locale }: { locale: Locale }) {
  const t = useTranslations("routes")
  const [duration, setDuration] = useState<RouteDuration>("halfDay")
  const [audience, setAudience] = useState<RouteAudience>("family")
  const [weather, setWeather] = useState<RouteWeather>("sunny")
  const [mapMode, setMapMode] = useState<"scope" | "satellite">("scope")

  const selectedRoute = useMemo(
    () => selectRouteOption({ duration, audience, weather }),
    [audience, duration, weather],
  )

  return (
    <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,0.82fr)_minmax(0,1.18fr)]">
      <section className="min-w-0 overflow-hidden rounded-lg border border-stone bg-white p-5 shadow-soft">
        <div className="flex items-center gap-2 text-sm font-bold text-water">
          <Route aria-hidden="true" className="h-4 w-4" />
          {t("form.eyebrow")}
        </div>
        <h2 className="mt-3 break-all text-2xl font-extrabold">{t("form.title")}</h2>
        <p className="mt-2 break-all text-sm leading-6 text-ink/68">{t("form.body")}</p>

        <div className="mt-6 grid gap-4">
          <label className="grid gap-2 text-sm font-semibold text-ink">
            {t("form.durationLabel")}
            <select
              className="h-12 w-full min-w-0 rounded-md border border-stone bg-rice px-3 text-sm outline-none transition focus:border-water"
              onChange={(event) => setDuration(event.target.value as RouteDuration)}
              value={duration}
            >
              <option value="halfDay">{t("form.durationOptions.halfDay")}</option>
              <option value="oneDay">{t("form.durationOptions.oneDay")}</option>
              <option value="twoDays">{t("form.durationOptions.twoDays")}</option>
            </select>
          </label>

          <label className="grid gap-2 text-sm font-semibold text-ink">
            {t("form.audienceLabel")}
            <select
              className="h-12 w-full min-w-0 rounded-md border border-stone bg-rice px-3 text-sm outline-none transition focus:border-water"
              onChange={(event) => setAudience(event.target.value as RouteAudience)}
              value={audience}
            >
              <option value="senior">{t("form.audienceOptions.senior")}</option>
              <option value="family">{t("form.audienceOptions.family")}</option>
              <option value="regular">{t("form.audienceOptions.regular")}</option>
            </select>
          </label>

          <label className="grid gap-2 text-sm font-semibold text-ink">
            {t("form.weatherLabel")}
            <select
              className="h-12 w-full min-w-0 rounded-md border border-stone bg-rice px-3 text-sm outline-none transition focus:border-water"
              onChange={(event) => setWeather(event.target.value as RouteWeather)}
              value={weather}
            >
              <option value="sunny">{t("form.weatherOptions.sunny")}</option>
              <option value="rainy">{t("form.weatherOptions.rainy")}</option>
              <option value="hot">{t("form.weatherOptions.hot")}</option>
            </select>
          </label>
        </div>

        <div className="mt-6 rounded-md bg-ink p-4 text-white">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <AlertTriangle aria-hidden="true" className="h-4 w-4" />
            {t("form.ruleTitle")}
          </div>
          <p className="mt-2 break-words text-sm leading-6 text-white/68 [overflow-wrap:anywhere]">
            {t("form.ruleBody")}
          </p>
        </div>
      </section>

      <section className="min-w-0 overflow-hidden rounded-lg border border-stone bg-white shadow-soft">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-stone p-4 sm:items-center">
          <div className="min-w-0">
            <div className="text-sm font-bold text-water">{t("map.eyebrow")}</div>
            <h2 className="mt-1 break-all text-xl font-extrabold">{t("map.title")}</h2>
          </div>
          <div className="grid w-full grid-cols-2 rounded-full border border-stone bg-rice p-1 sm:inline-flex sm:w-auto sm:shrink-0">
            <button
              className={
                mapMode === "scope"
                  ? "h-9 rounded-full bg-ink px-4 text-sm font-semibold text-white"
                  : "h-9 rounded-full px-4 text-sm font-semibold text-ink/68"
              }
              onClick={() => setMapMode("scope")}
              type="button"
            >
              {t("map.scope")}
            </button>
            <button
              className={
                mapMode === "satellite"
                  ? "h-9 rounded-full bg-ink px-4 text-sm font-semibold text-white"
                  : "h-9 rounded-full px-4 text-sm font-semibold text-ink/68"
              }
              onClick={() => setMapMode("satellite")}
              type="button"
            >
              {t("map.satellite")}
            </button>
          </div>
        </div>
        <div className="relative aspect-[16/11] bg-ink">
          <Image
            alt={mapMode === "scope" ? t("map.scopeAlt") : t("map.satelliteAlt")}
            className="object-cover"
            fill
            sizes="(min-width: 1024px) 58vw, 100vw"
            src={
              mapMode === "scope"
                ? "/images/routes/zouma-scope-map.png"
                : "/images/routes/zouma-satellite-map.png"
            }
          />
        </div>
      </section>

      <section className="min-w-0 rounded-lg border border-stone bg-white p-5 shadow-soft lg:col-span-2">
        <div className="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,0.88fr)_minmax(0,1.12fr)]">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-sm font-bold text-lychee">
              <MapPinned aria-hidden="true" className="h-4 w-4" />
              {t("result.eyebrow")}
            </div>
            <h2 className="mt-3 break-all text-3xl font-extrabold">{t(selectedRoute.titleKey)}</h2>
            <p className="mt-3 break-all text-sm leading-7 text-ink/68">{t(selectedRoute.summaryKey)}</p>
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <div className="min-w-0 rounded-md bg-rice p-4">
                <Clock3 aria-hidden="true" className="h-5 w-5 text-water" />
                <div className="mt-3 break-words text-xl font-extrabold">{t(selectedRoute.totalTimeKey)}</div>
                <div className="mt-1 text-sm text-ink/58">{t("result.totalTime")}</div>
              </div>
              <div className="min-w-0 rounded-md bg-rice p-4">
                <Route aria-hidden="true" className="h-5 w-5 text-water" />
                <div className="mt-3 break-words text-xl font-extrabold">{t(selectedRoute.mobilityKey)}</div>
                <div className="mt-1 text-sm text-ink/58">{t("result.mobility")}</div>
              </div>
              <div className="min-w-0 rounded-md bg-rice p-4">
                <Umbrella aria-hidden="true" className="h-5 w-5 text-water" />
                <div className="mt-3 break-words text-xl font-extrabold">{t(selectedRoute.weatherKey)}</div>
                <div className="mt-1 text-sm text-ink/58">{t("result.weather")}</div>
              </div>
            </div>
          </div>

          <div className="grid min-w-0 gap-4">
            <div className="rounded-md border border-stone p-4">
              <h3 className="text-base font-extrabold">{t("result.waypoints")}</h3>
              <ol className="mt-4 grid gap-3">
                {selectedRoute.waypoints.map((point, index) => (
                  <li className="flex gap-3 text-sm leading-6 text-ink/72" key={point}>
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-ink text-xs font-bold text-white">
                      {index + 1}
                    </span>
                    <span>{t(point)}</span>
                  </li>
                ))}
              </ol>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-md bg-rice p-4">
                <h3 className="text-base font-extrabold">{t("result.reservationNodes")}</h3>
                <ul className="mt-3 grid gap-2 text-sm leading-6 text-ink/70">
                  {selectedRoute.reservationNodes.map((node) => (
                    <li key={node}>{t(node)}</li>
                  ))}
                </ul>
              </div>
              <div className="rounded-md bg-rice p-4">
                <h3 className="text-base font-extrabold">{t("result.fallback")}</h3>
                <p className="mt-3 break-words text-sm leading-6 text-ink/70">
                  {t(selectedRoute.rainFallbackKey)}
                </p>
              </div>
            </div>

            <div className="rounded-md border border-lychee/25 bg-lychee/8 p-4">
              <h3 className="text-base font-extrabold text-lychee">{t("result.notice")}</h3>
              <p className="mt-2 break-words text-sm leading-6 text-ink/70">{t(selectedRoute.noticeKey)}</p>
            </div>

            <Link
              className="inline-flex h-11 w-fit items-center gap-2 rounded-full bg-ink px-5 text-sm font-bold text-white transition hover:bg-moss"
              href={`/${locale}/booking`}
            >
              {t("result.bookingCta")}
              <MoveRight aria-hidden="true" className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
