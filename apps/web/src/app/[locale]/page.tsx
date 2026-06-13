import type { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"
import { CalendarDays, CloudSun, Map, MoveRight, ShieldCheck, Sprout, Ticket, UserRound } from "lucide-react"
import { getTranslations, setRequestLocale } from "next-intl/server"

import { featuredPlayCards, homeScenes, previewStats } from "@web/lib/home-data"
import { getSiteUrl } from "@web/lib/site-url"
import { getWeatherSummary } from "@web/lib/weather"
import { Section, StatusBadge } from "@ui/index"
import type { Locale } from "@web/i18n/routing"

export const dynamic = "force-dynamic"

const iconMap = {
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
  const common = await getTranslations("common")
  const weather = await getWeatherSummary()

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

      <section id="top" className="relative min-h-[92svh] overflow-hidden pt-16 text-white">
        <Image
          alt={t("hero.imageAlt")}
          className="object-cover"
          fill
          priority
          sizes="100vw"
          src="/images/home/hero-village.webp"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-ink/74 via-ink/36 to-ink/86" />
        <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[#f7f3e8] to-transparent" />

        <Section className="relative z-10 flex min-h-[calc(92svh-4rem)] flex-col justify-center pb-20 pt-14">
          <div className="max-w-4xl">
            <StatusBadge>{t("hero.badge")}</StatusBadge>
            <h1 className="mt-7 max-w-3xl break-words text-4xl font-extrabold leading-tight tracking-normal sm:text-6xl lg:text-7xl">
              {t("hero.title")}
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-white/86 sm:text-xl">
              {t("hero.subtitle")}
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link
                className="inline-flex h-12 items-center gap-2 rounded-full bg-lychee px-6 text-sm font-bold text-white shadow-soft transition hover:bg-[#a8312f]"
                href="#realms"
              >
                {t("hero.primaryCta")}
                <MoveRight aria-hidden="true" className="h-4 w-4" />
              </Link>
              <Link
                className="inline-flex h-12 items-center gap-2 rounded-full border border-white/28 bg-white/10 px-6 text-sm font-bold text-white backdrop-blur transition hover:bg-white/18"
                href="#weather"
              >
                <CloudSun aria-hidden="true" className="h-4 w-4" />
                {t("hero.secondaryCta")}
              </Link>
            </div>
          </div>

          <div className="mt-14 grid gap-3 sm:grid-cols-3">
            {previewStats.map((stat) => (
              <div
                className="rounded-lg border border-white/14 bg-white/10 p-4 backdrop-blur-md"
                key={stat.labelKey}
              >
                <div className="text-2xl font-extrabold">{t(stat.valueKey)}</div>
                <div className="mt-1 text-sm text-white/72">{t(stat.labelKey)}</div>
              </div>
            ))}
          </div>
        </Section>
      </section>

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
            <div className="mt-4 text-3xl font-extrabold">{weather.temperature}</div>
            <p className="mt-2 text-sm leading-6 text-white/75">{weather.summary}</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {featuredPlayCards.map((card) => {
              const Icon = iconMap[card.icon]
              return (
                <article className="rounded-md bg-rice p-5" key={card.titleKey}>
                  <Icon aria-hidden="true" className="h-5 w-5 text-water" />
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

      <Section className="pt-20" id="realms">
        <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-lychee">
              {t("realms.eyebrow")}
            </p>
            <h2 className="mt-3 max-w-2xl text-3xl font-extrabold tracking-normal sm:text-4xl">
              {t("realms.title")}
            </h2>
          </div>
          <p className="max-w-md text-sm leading-6 text-ink/68">{t("realms.description")}</p>
        </div>

        <div className="mt-9 grid gap-5 md:grid-cols-2">
          {homeScenes.map((scene) => (
            <article
              className="group overflow-hidden rounded-lg border border-stone bg-white shadow-soft"
              key={scene.slug}
            >
              <div className="relative aspect-[16/9] overflow-hidden">
                <Image
                  alt={t(`${scene.titleKey}ImageAlt`)}
                  className="object-cover transition duration-500 group-hover:scale-105"
                  fill
                  sizes="(min-width: 768px) 50vw, 100vw"
                  src={scene.coverAsset}
                />
                <div className="absolute left-4 top-4 rounded-full bg-ink/72 px-3 py-1 text-xs font-semibold text-white backdrop-blur">
                  {common("updatedAt", { date: scene.updatedAt })}
                </div>
              </div>
              <div className="p-5 sm:p-6">
                <h3 className="text-2xl font-extrabold">{t(scene.titleKey)}</h3>
                <p className="mt-3 text-sm leading-7 text-ink/68">{t(scene.summaryKey)}</p>
                <Link
                  className="mt-5 inline-flex items-center gap-2 rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white transition hover:bg-moss"
                  href={`/${params.locale}${scene.cta.href}`}
                >
                  {t(scene.cta.labelKey)}
                  <MoveRight aria-hidden="true" className="h-4 w-4" />
                </Link>
              </div>
            </article>
          ))}
        </div>
      </Section>

    </main>
  )
}
