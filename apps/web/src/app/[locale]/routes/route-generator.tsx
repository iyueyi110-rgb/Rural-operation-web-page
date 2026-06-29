"use client"

import dynamic from "next/dynamic"
import Link from "next/link"
import { AlertTriangle, Clock3, MapPinned, MoveRight, Route, Umbrella } from "lucide-react"
import { useTranslations } from "next-intl"
import { useState } from "react"

import {
  selectRouteOption,
  type RouteOption,
  type RouteAudience,
  type RouteDuration,
  type RouteWeather,
} from "@web/lib/routes-data"
import type { Locale } from "@web/i18n/routing"
import { FieldLabel, InlineNotice, MetricTile, PanelTitle, SegmentedControl, SurfacePanel } from "@web/components/subpage-ui"
import { SafeImage } from "@ui/index"

const RouteSatelliteMap = dynamic(
  () =>
    import("./route-satellite-map").then((module) => module.RouteSatelliteMap),
  { ssr: false },
)

export function RouteGenerator({ locale }: { locale: Locale }) {
  const t = useTranslations("routes")
  const [duration, setDuration] = useState<RouteDuration>("halfDay")
  const [audience, setAudience] = useState<RouteAudience>("family")
  const [weather, setWeather] = useState<RouteWeather>("sunny")
  const [mapMode, setMapMode] = useState<"scope" | "satellite">("scope")
  const [selectedRoute, setSelectedRoute] = useState<RouteOption>(() => selectRouteOption({ duration, audience, weather }))
  const [provider, setProvider] = useState("preview")
  const [isGenerating, setIsGenerating] = useState(false)

  async function generateRoute() {
    setIsGenerating(true)

    try {
      const response = await fetch("/api/v1/routes/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ duration, audience, weather }),
      })

      if (!response.ok) {
        throw new Error("route generation failed")
      }

      const result = (await response.json()) as {
        data: {
          route: RouteOption
          provider: string
        }
      }
      setSelectedRoute(result.data.route)
      setProvider(result.data.provider)
    } catch (caughtError) {
      console.error("Route generation failed:", caughtError)
      setSelectedRoute(selectRouteOption({ duration, audience, weather }))
      setProvider("configuration-required")
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,0.82fr)_minmax(0,1.18fr)]">
      <SurfacePanel className="min-w-0 overflow-hidden">
        <PanelTitle icon={<Route aria-hidden="true" className="h-4 w-4" />}>{t("form.eyebrow")}</PanelTitle>
        <h2 className="mt-3 break-words text-2xl font-extrabold">{t("form.title")}</h2>
        <p className="mt-2 break-words text-sm leading-6 text-ink/68">{t("form.body")}</p>

        <div className="mt-6 grid gap-4">
          <FieldLabel label={t("form.durationLabel")}>
            <select
              className="select-control w-full"
              onChange={(event) => setDuration(event.target.value as RouteDuration)}
              value={duration}
            >
              <option value="halfDay">{t("form.durationOptions.halfDay")}</option>
              <option value="oneDay">{t("form.durationOptions.oneDay")}</option>
              <option value="twoDays">{t("form.durationOptions.twoDays")}</option>
            </select>
          </FieldLabel>

          <FieldLabel label={t("form.audienceLabel")}>
            <select
              className="select-control w-full"
              onChange={(event) => setAudience(event.target.value as RouteAudience)}
              value={audience}
            >
              <option value="senior">{t("form.audienceOptions.senior")}</option>
              <option value="family">{t("form.audienceOptions.family")}</option>
              <option value="regular">{t("form.audienceOptions.regular")}</option>
            </select>
          </FieldLabel>

          <FieldLabel label={t("form.weatherLabel")}>
            <select
              className="select-control w-full"
              onChange={(event) => setWeather(event.target.value as RouteWeather)}
              value={weather}
            >
              <option value="sunny">{t("form.weatherOptions.sunny")}</option>
              <option value="rainy">{t("form.weatherOptions.rainy")}</option>
              <option value="hot">{t("form.weatherOptions.hot")}</option>
            </select>
          </FieldLabel>
        </div>

        <div className="mt-6 rounded-lg bg-ink p-4 text-white">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <AlertTriangle aria-hidden="true" className="h-4 w-4" />
            {t("form.ruleTitle")}
          </div>
          <p className="mt-2 break-words text-sm leading-6 text-white/68 [overflow-wrap:anywhere]">
            {t("form.ruleBody")}
          </p>
          <button
            className="btn-secondary mt-4 bg-white hover:bg-rice"
            disabled={isGenerating}
            onClick={generateRoute}
            type="button"
          >
            {isGenerating ? t("form.generating") : t("form.generate")}
          </button>
        </div>
      </SurfacePanel>

      <SurfacePanel className="min-w-0 overflow-hidden p-0">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line p-4 sm:items-center">
          <div className="min-w-0">
            <div className="text-sm font-bold text-water">{t("map.eyebrow")}</div>
            <h2 className="mt-1 break-words text-xl font-extrabold">{t("map.title")}</h2>
          </div>
          <SegmentedControl
            className="grid w-full grid-cols-2 sm:w-auto"
            labelFor={(value) => (value === "scope" ? t("map.scope") : t("map.satellite"))}
            onChange={setMapMode}
            options={["scope", "satellite"] as const}
            value={mapMode}
          />
        </div>
        <div className="relative aspect-[16/11] bg-ink">
          {mapMode === "scope" ? (
            <SafeImage
              alt={t("map.scopeAlt")}
              className="object-cover"
              fill
              sizes="(min-width: 1024px) 58vw, 100vw"
              src="/images/routes/zouma-route-scope-user.jpg"
            />
          ) : (
            <RouteSatelliteMap />
          )}
        </div>
      </SurfacePanel>

      <SurfacePanel className="min-w-0 lg:col-span-2">
        <div className="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,0.88fr)_minmax(0,1.12fr)]">
          <div className="min-w-0">
            <PanelTitle icon={<MapPinned aria-hidden="true" className="h-4 w-4" />} tone="lychee">{t("result.eyebrow")}</PanelTitle>
            <h2 className="mt-3 break-words text-3xl font-extrabold">{t(selectedRoute.titleKey)}</h2>
            <p className="mt-3 break-words text-sm leading-7 text-ink/68">{t(selectedRoute.summaryKey)}</p>
            {provider === "preview" ? (
              <div className="mt-4 inline-flex rounded-full border border-water/20 bg-water/10 px-3 py-1 text-xs font-bold text-water">
                {t("result.providerPreview")}
              </div>
            ) : provider === "configuration-required" ? (
              <div className="mt-4 inline-flex rounded-full border border-[#d8bd73] bg-[#fff7d6] px-3 py-1 text-xs font-bold text-[#7a5b12]">
                {t("result.providerFallback")}
              </div>
            ) : (
              <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-moss/20 bg-moss/10 px-3 py-1 text-xs font-bold text-moss">
                <span aria-hidden="true" className="h-2 w-2 rounded-full bg-moss" />
                {t("result.providerOnline", { provider })}
              </div>
            )}
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <MetricTile icon={<Clock3 aria-hidden="true" className="h-5 w-5" />} label={t("result.totalTime")} tone="muted" value={t(selectedRoute.totalTimeKey)} />
              <MetricTile icon={<Route aria-hidden="true" className="h-5 w-5" />} label={t("result.mobility")} tone="muted" value={t(selectedRoute.mobilityKey)} />
              <MetricTile icon={<Umbrella aria-hidden="true" className="h-5 w-5" />} label={t("result.weather")} tone="muted" value={t(selectedRoute.weatherKey)} />
            </div>
          </div>

          <div className="grid min-w-0 gap-4">
            <div className="rounded-lg border border-line p-4">
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
              <div className="rounded-lg bg-rice p-4">
                <h3 className="text-base font-extrabold">{t("result.reservationNodes")}</h3>
                <ul className="mt-3 grid gap-2 text-sm leading-6 text-ink/70">
                  {selectedRoute.reservationNodes.map((node) => (
                    <li key={node}>{t(node)}</li>
                  ))}
                </ul>
              </div>
              <div className="rounded-lg bg-rice p-4">
                <h3 className="text-base font-extrabold">{t("result.fallback")}</h3>
                <p className="mt-3 break-words text-sm leading-6 text-ink/70">
                  {t(selectedRoute.rainFallbackKey)}
                </p>
              </div>
            </div>

            <InlineNotice tone="danger">
              <span>
              <h3 className="text-base font-extrabold text-lychee">{t("result.notice")}</h3>
              <p className="mt-2 break-words text-sm leading-6 text-ink/70">{t(selectedRoute.noticeKey)}</p>
              </span>
            </InlineNotice>

            <Link
              className="btn-primary w-fit bg-ink hover:bg-moss"
              href={`/${locale}/booking`}
            >
              {t("result.bookingCta")}
              <MoveRight aria-hidden="true" className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </SurfacePanel>
    </div>
  )
}
