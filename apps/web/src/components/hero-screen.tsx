"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import {
  CalendarDays,
  CloudSun,
  MapPin,
  MoveRight,
  Network,
  Sprout,
} from "lucide-react"
import { motion } from "framer-motion"
import { useTranslations } from "next-intl"

import { CountUp } from "@web/components/count-up"
import type { Locale } from "@web/i18n/routing"
import { previewStats } from "@web/lib/home-data"
import { buildAdoptionHref, buildExploreHref } from "@web/lib/home-navigation"
import type { WeatherSummary } from "@web/lib/weather"
import { SafeImage, Section } from "@ui/index"

const heroVideoUrl = process.env.NEXT_PUBLIC_HOME_HERO_VIDEO_URL?.trim()
const heroMetricValues = [1.8, 3107, 2383] as const
const activityShowcaseImages = [
  "/images/home/activity-showcase-picking.png",
  "/images/home/activity-showcase-classroom.png",
  "/images/home/activity-showcase-feast.png",
  "/images/home/activity-showcase-return.png",
] as const
const activityOverviewImage = "/images/home/activity-showcase-overview.png"

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
  const [activeActivityIndex, setActiveActivityIndex] = useState(-1)
  const weatherIsLive = weather.source === "qweather"
  const heroTitle = t("hero.title")
  const activityHighlights = [0, 1, 2, 3].map((index) =>
    t(`hero.activityShowcase.highlights.${index}`),
  )
  const activeActivityImage =
    activeActivityIndex >= 0
      ? activityShowcaseImages[activeActivityIndex]
      : activityOverviewImage
  const activeActivityLabel =
    activeActivityIndex >= 0
      ? activityHighlights[activeActivityIndex]
      : t("hero.activityShowcase.name")

  function showOperations() {
    window.dispatchEvent(new Event("zouma:home-deck-next"))
  }

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
      className="relative min-h-[100svh] overflow-hidden bg-ink pt-16 text-white"
      id="top"
    >
      <video
        aria-label={t("hero.videoAlt")}
        autoPlay
        className={`absolute inset-0 h-full w-full object-cover ${reduceMotion ? "" : "hero-video-drift"}`}
        loop
        muted
        playsInline
        poster="/images/home/hero-fallback.webp"
        preload="metadata"
        ref={videoRef}
      >
        {heroVideoUrl ? <source src={heroVideoUrl} /> : null}
      </video>
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(25,32,27,0.95),rgba(25,32,27,0.78)_42%,rgba(25,32,27,0.38)_72%,rgba(25,32,27,0.88))]" />
      <div className="terrain-grid absolute inset-0 opacity-50" />
      <div className="hero-grain absolute inset-0 opacity-25" />

      <Section className="relative z-10 grid min-h-[calc(100svh-4rem)] w-full min-w-0 items-center gap-8 pb-8 pt-8 sm:gap-10 sm:pb-10 sm:pt-10 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="w-full min-w-0 max-w-3xl py-7 sm:py-8">
          <motion.h1
            aria-label={heroTitle}
            className="hero-serif max-w-4xl text-[2.35rem] font-semibold leading-[1.1] tracking-normal text-white text-balance min-[390px]:text-[2.5rem] sm:text-6xl xl:text-7xl"
            initial={reduceMotion ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: reduceMotion ? 0 : 0.7,
              ease: [0.22, 1, 0.36, 1],
            }}
          >
            <span className="block sm:hidden">
              <span className="block">云脉寿岭,</span>
              <span className="block">荔水走马</span>
            </span>
            <span className="hidden sm:inline">{heroTitle}</span>
          </motion.h1>

          <motion.p
            className="mt-5 max-w-2xl break-words text-[15px] leading-7 text-white/76 [overflow-wrap:anywhere] sm:mt-6 sm:text-lg sm:leading-8"
            initial={reduceMotion ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              delay: reduceMotion ? 0 : 0.12,
              duration: reduceMotion ? 0 : 0.65,
              ease: [0.22, 1, 0.36, 1],
            }}
          >
            {t("hero.subtitle")}
          </motion.p>
          <motion.p
            className="mt-3 max-w-2xl break-words text-sm leading-7 text-white/56 [overflow-wrap:anywhere] sm:mt-4"
            initial={reduceMotion ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              delay: reduceMotion ? 0 : 0.2,
              duration: reduceMotion ? 0 : 0.65,
              ease: [0.22, 1, 0.36, 1],
            }}
          >
            {t("hero.positioning")}
          </motion.p>

          <div className="mt-7 flex w-full max-w-md flex-col items-stretch gap-3 sm:mt-8 sm:w-auto sm:max-w-none sm:flex-row sm:items-center">
            <Link
              className={`btn-primary h-12 px-7 focus-visible:outline-white ${reduceMotion ? "" : "cta-aura"}`}
              href={buildAdoptionHref(locale)}
            >
              <Sprout aria-hidden="true" className="h-4 w-4" />
              {t("adoption.cta")}
            </Link>
            <Link
              className="btn-ghost h-12 px-7 focus-visible:outline-white"
              href={buildExploreHref(locale)}
            >
              {t("hero.startBrowsing")}
              <MoveRight aria-hidden="true" className="h-4 w-4" />
            </Link>
          </div>

          <div className="mt-8 grid w-full max-w-2xl grid-cols-1 gap-2 rounded-xl border border-white/12 bg-white/[0.055] p-2 backdrop-blur-xl min-[480px]:grid-cols-2 sm:mt-9 sm:grid-cols-3 sm:gap-3 sm:p-3">
            {previewStats.map((stat, index) => (
              <div
                className="min-w-0 rounded-lg bg-ink/24 px-3 py-3 sm:px-4"
                key={stat.labelKey}
              >
                <div className="text-lg font-extrabold tabular-nums text-white sm:text-2xl">
                  {index === 0 ? t("hero.metricAbout") : null}
                  <CountUp
                    decimals={index === 0 ? 1 : 0}
                    storageKey={`zouma-hero-metric-${index}`}
                    value={heroMetricValues[index]}
                  />
                  <span className="ml-1 text-xs font-bold text-white/62 sm:text-sm">
                    {t(`hero.metricUnits.${index}`)}
                  </span>
                </div>
                <div className="mt-1 text-[11px] leading-4 text-white/52 sm:text-xs">
                  {t(stat.labelKey)}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="relative mx-auto w-full min-w-0 max-w-2xl py-2 sm:py-6 lg:max-w-none">
          <div className="absolute -left-10 top-16 h-64 w-64 rounded-full bg-moss/20 blur-3xl" />
          <div className="absolute -right-8 bottom-10 h-52 w-52 rounded-full bg-water/20 blur-3xl" />
          <div className="relative overflow-hidden rounded-xl border border-white/14 bg-white/[0.075] p-3 shadow-panel backdrop-blur-xl">
            <div className="relative min-h-[340px] overflow-hidden rounded-lg border border-white/10 bg-ink/45 sm:min-h-[420px]">
              <SafeImage
                alt={activeActivityLabel}
                className="object-cover transition-opacity duration-200"
                fill
                priority
                quality={92}
                sizes="(min-width: 1024px) 48vw, 100vw"
                src={activeActivityImage}
              />
              <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(25,32,27,0.12),rgba(25,32,27,0.26)_42%,rgba(25,32,27,0.82))]" />
              <div className="contour-field absolute inset-0 opacity-50" />
              <div className="terrain-grid absolute inset-0 opacity-60" />
              <div className="absolute left-5 top-5 max-w-[12rem] rounded-lg border border-white/14 bg-ink/46 px-4 py-3 backdrop-blur-md sm:left-8 sm:top-8 sm:max-w-xs">
                <div className="text-xs font-bold text-white/58">
                  {t("hero.activityShowcase.kicker")}
                </div>
                <p className="mt-2 text-sm font-bold leading-5 text-white sm:text-base">
                  {t("hero.activityShowcase.summary")}
                </p>
              </div>
              <div className="absolute right-5 top-5 rounded-lg border border-white/20 bg-ink/52 p-3 shadow-soft backdrop-blur-md sm:right-8 sm:top-8 sm:p-4">
                <div className="flex items-center gap-2 text-sm font-extrabold text-white sm:text-lg">
                  <CalendarDays
                    aria-hidden="true"
                    className="h-4 w-4 text-[#d7b56d] sm:h-5 sm:w-5"
                  />
                  {t("hero.activityShowcase.name")}
                </div>
              </div>
              <div className="absolute bottom-6 left-5 right-5 sm:bottom-8 sm:left-8 sm:right-8">
                <div className="mb-3 flex flex-wrap items-center gap-2 text-xs font-bold text-white/70">
                  <span className="rounded-full bg-white/14 px-3 py-1">
                    {t("hero.activityShowcase.date")}
                  </span>
                  <span className="rounded-full bg-white/14 px-3 py-1">
                    {t("hero.activityShowcase.location")}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {activityHighlights.map((highlight, index) => {
                    const isActive = activeActivityIndex === index

                    return (
                      <button
                        aria-pressed={isActive}
                        className={
                          isActive
                            ? "rounded-lg border border-white bg-white/16 p-3 text-left backdrop-blur transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
                            : "rounded-lg border border-white/12 bg-ink/56 p-3 text-left backdrop-blur transition hover:border-white/38 hover:bg-ink/70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
                        }
                        key={highlight}
                        onClick={() => setActiveActivityIndex(index)}
                        type="button"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span
                            className={
                              isActive
                                ? "text-[11px] font-extrabold tabular-nums text-white/72"
                                : "text-[11px] font-bold tabular-nums text-white/40"
                            }
                          >
                            {String(index + 1).padStart(2, "0")}
                          </span>
                          <span
                            className={
                              isActive
                                ? "h-1.5 w-1.5 rounded-full bg-white"
                                : "h-1.5 w-1.5 rounded-full bg-[#d7b56d]"
                            }
                          />
                        </div>
                        <p
                          className={
                            isActive
                              ? "mt-3 text-xs font-extrabold leading-5 text-white"
                              : "mt-3 text-xs font-bold leading-5 text-white/82"
                          }
                        >
                          {highlight}
                        </p>
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>

          <div className="relative mt-3 grid gap-3 sm:grid-cols-[1.15fr_0.85fr]">
            <div className="flex items-center gap-4 rounded-lg border border-white/14 bg-white/10 p-4 backdrop-blur-xl">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-white/12">
                <CloudSun aria-hidden="true" className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-2xl font-extrabold">
                    {weather.temperature}
                  </span>
                  <span className="rounded-full bg-white/12 px-2.5 py-1 text-xs font-bold text-white/72">
                    {weatherIsLive
                      ? t("weather.realtime")
                      : t("weather.pending")}
                  </span>
                </div>
                <p className="mt-1 line-clamp-2 text-xs leading-5 text-white/68 sm:text-sm">
                  {weather.summary}
                </p>
              </div>
            </div>
            <div className="rounded-lg border border-white/14 bg-white/8 p-4 backdrop-blur-xl">
              <div className="flex items-center gap-2 text-xs font-bold text-white/52">
                <Network
                  aria-hidden="true"
                  className="h-4 w-4 text-[#d7b56d]"
                />
                {t("hero.systemLogic")}
              </div>
              <p className="mt-2 text-sm leading-6 text-white/74">
                {t("hero.narrative")}
              </p>
            </div>
          </div>
        </div>

        <div className="absolute bottom-5 left-5 right-5 hidden flex-wrap items-center justify-between gap-2 text-[11px] font-semibold text-white/46 lg:flex">
          <span className="inline-flex items-center gap-1.5">
            <MapPin aria-hidden="true" className="h-3.5 w-3.5" />
            {t("hero.location")}
          </span>
          <div className="flex items-center gap-4">
            <span>{t("hero.badge")}</span>
            <button
              className="rounded-full border border-white/20 bg-ink/40 px-3 py-1.5 text-white/75 transition hover:border-white/45 hover:bg-ink/60 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-white motion-reduce:transition-none"
              onClick={showOperations}
              type="button"
            >
              查看运营逻辑 ↓
            </button>
          </div>
        </div>
      </Section>
    </section>
  )
}
