"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import {
  ChevronDown,
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
import { buildAdoptionHref } from "@web/lib/home-navigation"
import type { WeatherSummary } from "@web/lib/weather"
import { Section, StatusBadge } from "@ui/index"

const heroVideoUrl = process.env.NEXT_PUBLIC_HOME_HERO_VIDEO_URL?.trim()
const heroMetricValues = [1.8, 3107, 2383] as const

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
  const heroTitle = t("hero.title")
  const titleCharacters = Array.from(heroTitle)
  const taglines = [
    t("hero.tagline1"),
    t("hero.tagline2"),
    t("hero.tagline3"),
  ]

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
      <div className="absolute inset-0 bg-gradient-to-b from-ink/70 via-ink/36 to-ink/95" />
      <div className="hero-grain absolute inset-0 opacity-35" />

      <Section className="relative z-10 flex min-h-[calc(100svh-4rem)] flex-col justify-between pb-8 pt-16 sm:pb-10">
        <div className="flex flex-1 flex-col items-center justify-center py-10 text-center">
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: 10 }}
            animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          >
            <StatusBadge>{t("hero.badge")}</StatusBadge>
          </motion.div>
          <motion.h1
            aria-label={heroTitle}
            className="hero-serif mt-7 max-w-5xl text-5xl font-semibold leading-[1.08] tracking-[0.04em] text-white sm:text-7xl lg:text-8xl"
            initial={reduceMotion ? false : "hidden"}
            animate={reduceMotion ? undefined : "show"}
            variants={{
              hidden: {},
              show: {
                transition: {
                  delayChildren: 0.2,
                  staggerChildren: 0.035,
                },
              },
            }}
          >
            {reduceMotion
              ? heroTitle
              : titleCharacters.map((character, index) => (
                  <motion.span
                    aria-hidden="true"
                    className="inline-block"
                    key={`${character}-${index}`}
                    variants={{
                      hidden: { opacity: 0, y: 16 },
                      show: {
                        opacity: 1,
                        y: 0,
                        transition: {
                          duration: 0.55,
                          ease: [0.22, 1, 0.36, 1],
                        },
                      },
                    }}
                  >
                    {character === " " ? "\u00a0" : character}
                  </motion.span>
                ))}
          </motion.h1>

          <motion.div
            className="mt-6 flex flex-wrap justify-center gap-2"
            initial={reduceMotion ? false : "hidden"}
            animate={reduceMotion ? undefined : "show"}
            variants={{
              hidden: {},
              show: {
                transition: {
                  delayChildren: 0.95,
                  staggerChildren: 0.15,
                },
              },
            }}
          >
            {taglines.map((tagline) => (
              <motion.span
                className="rounded-full border border-white/18 bg-white/12 px-3.5 py-2 text-xs font-semibold text-white/82 backdrop-blur-xl sm:text-sm"
                key={tagline}
                variants={{
                  hidden: { opacity: 0, y: 12, scale: 0.96 },
                  show: {
                    opacity: 1,
                    y: 0,
                    scale: 1,
                    transition: {
                      duration: 0.55,
                      ease: [0.22, 1, 0.36, 1],
                    },
                  },
                }}
              >
                {tagline}
              </motion.span>
            ))}
          </motion.div>

          <motion.p
            className="mt-6 max-w-3xl text-base leading-8 text-white/78 sm:text-lg"
            initial={reduceMotion ? false : { opacity: 0, y: 12 }}
            animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
            transition={{ delay: 1.15, duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
          >
            {t("hero.subtitle")}
          </motion.p>
          <div className="mt-9 flex w-full max-w-md flex-col items-stretch justify-center gap-3 sm:w-auto sm:max-w-none sm:flex-row sm:items-center">
            <Link
              className={`btn-primary h-12 px-7 focus-visible:outline-white ${reduceMotion ? "" : "cta-aura"}`}
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

          <div className="mt-8 grid w-full max-w-3xl grid-cols-3 gap-2 rounded-xl border border-white/12 bg-ink/24 p-2 backdrop-blur-xl sm:gap-3 sm:p-3">
            {previewStats.map((stat, index) => (
              <div
                className="min-w-0 rounded-lg bg-white/10 px-2 py-3 text-center sm:px-4"
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
                <div className="mt-1 text-[11px] leading-4 text-white/58 sm:text-xs">
                  {t(stat.labelKey)}
                </div>
              </div>
            ))}
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

        <div className="mt-5 flex flex-wrap items-center justify-center gap-2 text-center text-[11px] font-semibold text-white/55">
          <span className="inline-flex items-center gap-1.5">
            <MapPin aria-hidden="true" className="h-3.5 w-3.5" />
            {t("hero.location")}
          </span>
          <span aria-hidden="true" className="text-white/20">|</span>
          <span>{t("hero.narrative")}</span>
          <span aria-hidden="true" className="text-white/20">|</span>
          <span className="inline-flex items-center gap-1.5">
            <Network aria-hidden="true" className="h-3.5 w-3.5" />
            {t("hero.systemLogic")}
          </span>
        </div>

        <button
          aria-label={t("hero.scrollHint")}
          className="scroll-hint-float absolute bottom-24 left-1/2 hidden -translate-x-1/2 rounded-full border border-white/14 bg-white/10 p-2 text-white/70 backdrop-blur sm:grid"
          onClick={() => {
            window.dispatchEvent(new Event("zouma:home-deck-next"))
          }}
          type="button"
        >
          <ChevronDown aria-hidden="true" className="h-4 w-4" />
        </button>
      </Section>
    </section>
  )
}
