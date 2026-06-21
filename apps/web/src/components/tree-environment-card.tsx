"use client"

import { useEffect, useState } from "react"
import { Activity, CloudSun, Droplets, SunMedium } from "lucide-react"
import { useTranslations } from "next-intl"

import {
  buildEnvironmentMetrics,
  normalizeSensorStatus,
  type SensorDisplayStatus,
} from "@web/lib/tree-experience"

interface SensorReading {
  type: string
  value: number
  unit: string
}

interface SensorPayload {
  data?: SensorReading[]
  meta?: { status?: string }
}

const metricIcons = {
  soilMoisture: Droplets,
  airHumidity: CloudSun,
  lightIntensity: SunMedium,
}

export function TreeEnvironmentCard({ treeId }: { treeId: string }) {
  const t = useTranslations("trees.experience.environment")
  const [payload, setPayload] = useState<SensorPayload | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    const controller = new AbortController()
    setPayload(null)
    setFailed(false)

    void fetch(
      `/api/v1/infrastructure/sensors/latest?nodeId=${encodeURIComponent(treeId)}`,
      {
        cache: "no-store",
        signal: controller.signal,
      },
    )
      .then(async (response) => {
        if (!response.ok)
          throw new Error(`Sensor request failed with ${response.status}`)
        setPayload((await response.json()) as SensorPayload)
      })
      .catch((error) => {
        if (error instanceof DOMException && error.name === "AbortError") return
        setFailed(true)
      })

    return () => controller.abort()
  }, [treeId])

  const status: SensorDisplayStatus = failed
    ? "warning"
    : normalizeSensorStatus(payload?.meta?.status)
  const metrics = buildEnvironmentMetrics(payload?.data ?? [], status)
  const loading = payload === null && !failed
  const statusKey = loading ? "loading" : status

  return (
    <article
      aria-busy={loading}
      className={`rounded-lg border p-5 shadow-soft ${
        status === "inactive"
          ? "border-stone bg-stone/35 text-ink/58"
          : "border-stone bg-white"
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-water">
            <Activity aria-hidden="true" className="h-4 w-4" />
            {t("eyebrow")}
          </p>
          <h2 className="mt-2 text-2xl font-extrabold">{t("title")}</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-ink/58">
            {t("description")}
          </p>
        </div>
        <span
          aria-live="polite"
          className={`rounded-full px-3 py-1.5 text-xs font-bold ${
            status === "active"
              ? "bg-moss/12 text-moss"
              : status === "inactive"
                ? "bg-ink/8 text-ink/50"
                : "bg-amber-100 text-amber-800"
          }`}
        >
          {t(`status.${statusKey}`)}
        </span>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        {metrics.map((metric) => {
          const Icon = metricIcons[metric.id]
          const progress = Math.max(
            0,
            Math.min(100, (metric.value / metric.max) * 100),
          )
          return (
            <div className="rounded-md bg-rice p-4" key={metric.id}>
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-sm font-bold">
                  <Icon aria-hidden="true" className="h-4 w-4 text-water" />
                  {t(`metrics.${metric.id}`)}
                </div>
                <span className="text-base font-extrabold">
                  {loading ? "--" : Math.round(metric.value)} {metric.unit}
                </span>
              </div>
              <div
                aria-label={t("progressAria", {
                  label: t(`metrics.${metric.id}`),
                })}
                aria-valuemax={metric.max}
                aria-valuemin={0}
                aria-valuenow={loading ? undefined : metric.value}
                className="mt-4 h-2 overflow-hidden rounded-full bg-stone/65"
                role="progressbar"
              >
                <div
                  className={`h-full rounded-full ${status === "active" ? "bg-water" : "bg-ink/28"}`}
                  style={{ width: loading ? "12%" : `${progress}%` }}
                />
              </div>
            </div>
          )
        })}
      </div>

      {status !== "active" && !loading ? (
        <p className="mt-4 text-xs font-semibold leading-5 text-ink/50">
          {t(status === "inactive" ? "inactiveNote" : "baselineNote")}
        </p>
      ) : null}
    </article>
  )
}
