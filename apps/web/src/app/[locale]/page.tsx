import type { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"
import { CalendarDays, CloudSun, Map, MoveRight, ShieldCheck, Sprout, Ticket, UserRound } from "lucide-react"
import type { ComponentType } from "react"
import { getTranslations, setRequestLocale } from "next-intl/server"

import { HeroScreen } from "@web/components/hero-screen"
import { HistoryScroll } from "@web/components/history-scroll"
import { RealmMapGateway } from "@web/components/realm-map-gateway"
import { featuredPlayCards } from "@web/lib/home-data"
import { getSiteUrl } from "@web/lib/site-url"
import { getWeatherSummary } from "@web/lib/weather"
import { Section } from "@ui/index"
import type { Locale } from "@web/i18n/routing"

export const dynamic = "force-dynamic"

const iconMap: Record<(typeof featuredPlayCards)[number]["icon"], ComponentType<{ className?: string }>> = {
  CalendarDays,
  Map,
  Sprout,
}

export async function generateMetadata({
  params,
}: {
  params: { locale: string }
}): Promise<Metadata> {
  const t = await getTranslations({ locale: params.locale, namespace: "metadata.home" })

  return {
    metadataBase: getSiteUrl(),
    title: t("title"),
    description: t("description"),
    openGraph: {
      title: t("title"),
      description: t("description"),
      images: ["/images/home/hero-village.webp"],
    },
  }
}

export default async function HomePage({ params }: { params: { locale: Locale } }) {
  setRequestLocale(params.locale)
  const t = await getTranslations("home")
  const weather = await getWeatherSummary()
  const weatherIsLive = weather.source === "qweather"

  return (
    <main className="overflow-hidden pb-16 text-ink">
      <header className="fixed left-0 right-0 top-0 z-40 border-b border-white/10 bg-ink/75 text-white backdrop-blur-xl">
        <Section className="flex h-16 items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-4">
            <Link aria-label={t("nav.homeAria")} className="flex shrink-0 items-center gap-3" href="#top">
              <span className="grid h-9 w-9 place-items-center rounded-md bg-lychee text-sm font-extrabold">
                {t("nav.mark")}
              </span>
              <span className="text-sm font-semibold tracking-normal">{t("nav.brand")}</span>
            </Link>
            <div className="hidden items-center gap-3 text-xs font-semibold text-white/62 md:flex">
              <Link className="transition hover:text-white" href={`/${params.locale}/me`}>
                {t("quickActions.me")}
              </Link>
              <span aria-hidden="true" className="h-3 w-px bg-white/18" />
              <Link className="transition hover:text-white" href={`/${params.locale}/villager/login`}>
                {t("quickActions.villager")}
              </Link>
              <span aria-hidden="true" className="h-3 w-px bg-white/18" />
              <Link className="transition hover:text-white" href={`/${params.locale}/privacy`}>
                {t("quickActions.privacy")}
              </Link>
            </div>
          </div>
          <nav aria-label={t("nav.aria")} className="hidden items-center gap-5 text-sm text-white/78 md:flex">
            <Link className="transition hover:text-white" href="#realms">
              {t("nav.realms")}
            </Link>
            <Link className="transition hover:text-white" href="#weather">
              {t("nav.weather")}
            </Link>
            <Link className="transition hover:text-white" href={`/${params.locale}/routes`}>
              {t("nav.routes")}
            </Link>
            <Link className="transition hover:text-white" href={`/${params.locale}/booking`}>
              {t("nav.booking")}
            </Link>
            <Link className="transition hover:text-white" href={`/${params.locale}/calendar`}>
              {t("nav.calendar")}
            </Link>
            <Link
              className="inline-flex h-8 items-center gap-1.5 rounded-full bg-lychee px-3 text-xs font-bold text-white shadow-soft transition hover:bg-[#a8312f]"
              href={`/${params.locale}/tickets`}
            >
              <Ticket aria-hidden="true" className="h-3.5 w-3.5" />
              {t("quickActions.tickets")}
            </Link>
            <Link className="transition hover:text-white" href={`/${params.locale}/trees`}>
              {t("nav.adoption")}
            </Link>
            <Link className="transition hover:text-white" href={`/${params.locale}/products`}>
              {t("nav.products")}
            </Link>
          </nav>
          <div className="flex items-center gap-2">
            <Link
              className="inline-flex h-10 items-center gap-2 rounded-full border border-white/18 px-3 text-sm font-semibold text-white transition hover:bg-white/10 sm:px-4"
              href="#top"
            >
              <UserRound aria-hidden="true" className="h-4 w-4" />
              {t("nav.login")}
            </Link>
            <Link
              className="hidden h-10 items-center gap-2 rounded-full bg-white px-4 text-sm font-semibold text-ink transition hover:bg-rice sm:inline-flex"
              href="#realms"
            >
              {t("nav.start")}
              <MoveRight aria-hidden="true" className="h-4 w-4" />
            </Link>
          </div>
        </Section>
      </header>

      <HeroScreen weather={weather} />
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
                <Link className="ml-2 font-bold text-white underline underline-offset-4" href={`/${params.locale}/routes`}>
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
                  <p className="mt-2 text-sm leading-6 text-ink/68">{t(card.bodyKey)}</p>
                  {card.href ? (
                    <Link
                      className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-water"
                      href={`/${params.locale}${card.href}`}
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
            <p className="mt-3 text-sm leading-6 text-ink/70">{t("guardrails.body")}</p>
          </div>
        </div>
      </Section>

      <RealmMapGateway />

      <Section className="grid gap-5 pt-20 lg:grid-cols-[1.08fr_0.92fr]">
        <div
          className="overflow-hidden rounded-lg border border-stone bg-white shadow-soft"
          id="booking-preview"
        >
          <div className="relative aspect-[16/9]">
            <Image
              alt={t("booking.imageAlt")}
              className="object-cover"
              fill
              sizes="(min-width: 1024px) 55vw, 100vw"
              src="/images/home/courtyard-booking-generated.webp"
            />
          </div>
          <div className="p-6">
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-water">
              {t("booking.eyebrow")}
            </p>
            <h2 className="mt-3 text-3xl font-extrabold">{t("booking.title")}</h2>
            <p className="mt-3 text-sm leading-7 text-ink/68">{t("booking.body")}</p>
            <div className="mt-5 inline-flex rounded-full border border-stone px-4 py-2 text-sm font-semibold text-ink/72">
              {t("booking.status")}
            </div>
          </div>
        </div>
        <div
          className="rounded-lg border border-stone bg-ink p-6 text-white shadow-soft"
          id="adoption-preview"
        >
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-white/58">
            {t("adoption.eyebrow")}
          </p>
          <h2 className="mt-3 text-3xl font-extrabold">{t("adoption.title")}</h2>
          <p className="mt-3 text-sm leading-7 text-white/70">{t("adoption.body")}</p>
          <div className="mt-6 grid gap-3">
            {[1, 2, 3].map((item) => (
              <div className="rounded-md bg-white/8 p-4" key={item}>
                <div className="text-sm font-semibold">{t(`adoption.steps.${item}.title`)}</div>
                <div className="mt-1 text-sm leading-6 text-white/62">
                  {t(`adoption.steps.${item}.body`)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </Section>

    </main>
  )
}
