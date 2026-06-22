"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { CloudSun, MoveRight, Sprout } from "lucide-react"
import { useTranslations } from "next-intl"

import type { Locale } from "@web/i18n/routing"
import { previewStats } from "@web/lib/home-data"
import { buildAdoptionHref } from "@web/lib/home-navigation"
import type { WeatherSummary } from "@web/lib/weather"
import { Section, StatusBadge } from "@ui/index"

const heroVideoUrl = process.env.NEXT_PUBLIC_HOME_HERO_VIDEO_URL?.trim()

export function HeroScreen({
  locale,
  weather,
}: {
  locale: Locale
  weather: WeatherSummary
}) {
  const t = useTranslations("home")
  const videoRef = useRef<HTMLVideoElement>(null)
  const [reduceMotion, setReduceMotion] = useState(false)
  const weatherIsLive = weather.source === "qweather"

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)")
    const syncPreference = () => setReduceMotion(media.matches)

    syncPreference()
    media.addEventListener("change", syncPreference)
    return () => media.removeEventListener("change", syncPreference)
  }, [])

  useEffect(() => {
    const video = videoRef.current
    if (!video || !heroVideoUrl) return

    if (reduceMotion) {
      video.pause()
      video.currentTime = 0
      return
    }

    void video.play().catch(() => undefined)
  }, [reduceMotion])

  return (
    <section
      className="relative min-h-svh overflow-hidden bg-ink pt-16 text-white"
      id="top"
    >
      <video
        aria-label={t("hero.videoAlt")}
        autoPlay
        className="absolute inset-0 h-full w-full object-cover"
        loop
        muted
        playsInline
        poster="/images/home/hero-fallback.webp"
        preload="metadata"
        ref={videoRef}
      >
        {heroVideoUrl ? <source src={heroVideoUrl} /> : null}
      </video>
      <div className="absolute inset-0 bg-gradient-to-b from-ink/70 via-ink/36 to-ink/95" />
      <div className="hero-grain absolute inset-0 opacity-35" />

      <Section className="relative z-10 flex min-h-[calc(100svh-4rem)] flex-col justify-between pb-8 pt-16 sm:pb-10">
        <div className="flex flex-1 flex-col items-center justify-center py-12 text-center">
          <StatusBadge>{t("hero.badge")}</StatusBadge>
          <h1 className="hero-serif mt-7 max-w-5xl text-5xl font-semibold leading-[1.08] tracking-[0.04em] text-white sm:text-7xl lg:text-8xl">
            {t("hero.title")}
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-8 text-white/78 sm:text-lg">
            {t("hero.subtitle")}
          </p>
          <div className="mt-9 flex w-full max-w-md flex-col items-stretch justify-center gap-3 sm:w-auto sm:max-w-none sm:flex-row sm:items-center">
            <Link
              className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-lychee px-7 text-sm font-bold text-white shadow-soft transition hover:bg-[#a8312f] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
              href={buildAdoptionHref(locale)}
            >
              <Sprout aria-hidden="true" className="h-4 w-4" />
              {t("adoption.cta")}
            </Link>
            <button
              className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-white/35 bg-white/12 px-7 text-sm font-bold text-white backdrop-blur-md transition hover:bg-white hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
              onClick={() => {
                window.dispatchEvent(new Event("zouma:home-deck-next"))
              }}
              type="button"
            >
              {t("hero.startBrowsing")}
              <MoveRight aria-hidden="true" className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="grid gap-3 lg:grid-cols-[1.35fr_1fr]">
          <div className="flex items-center gap-4 rounded-lg border border-white/14 bg-white/10 p-4 backdrop-blur-xl sm:p-5">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white/12">
              <CloudSun aria-hidden="true" className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-2xl font-extrabold">
                  {weather.temperature}
                </span>
                <span className="rounded-full bg-white/12 px-2.5 py-1 text-xs font-bold text-white/72">
                  {weatherIsLive ? t("weather.realtime") : t("weather.pending")}
                </span>
              </div>
              <p className="mt-1 line-clamp-2 text-xs leading-5 text-white/68 sm:text-sm">
                {weather.summary}
              </p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 rounded-lg border border-white/14 bg-white/8 p-3 backdrop-blur-xl sm:p-4">
            {previewStats.map((stat) => (
              <div className="min-w-0 px-1 text-center" key={stat.labelKey}>
                <div className="text-sm font-extrabold sm:text-lg">
                  {t(stat.valueKey)}
                </div>
                <div className="mt-1 text-[11px] leading-4 text-white/58 sm:text-xs">
                  {t(stat.labelKey)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </Section>
    </section>
  )
}
