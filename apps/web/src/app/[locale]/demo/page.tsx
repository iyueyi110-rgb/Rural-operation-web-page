import type { Metadata } from "next"
import Link from "next/link"
import {
  ArrowDown,
  ArrowLeft,
  ClipboardCheck,
  Database,
  Leaf,
  ShieldCheck,
  Sprout,
  UserRound,
} from "lucide-react"
import { getTranslations, setRequestLocale } from "next-intl/server"

import type { Locale } from "@web/i18n/routing"
import { getDemoReadiness } from "@web/lib/demo-readiness.server"
import { getSiteUrl } from "@web/lib/site-url"
import { SafeImage, Section } from "@ui/index"

import { DemoJourney } from "./demo-journey"

export const dynamic = "force-dynamic"

export async function generateMetadata({
  params,
}: {
  params: { locale: Locale }
}): Promise<Metadata> {
  const t = await getTranslations({
    locale: params.locale,
    namespace: "metadata.demo",
  })

  return {
    metadataBase: getSiteUrl(),
    title: t("title"),
    description: t("description"),
  }
}

export default async function PortfolioDemoPage({
  params,
}: {
  params: { locale: Locale }
}) {
  setRequestLocale(params.locale)
  const t = await getTranslations("portfolioDemo")
  const readiness = await getDemoReadiness()
  const adminBaseUrl = (
    process.env.NEXT_PUBLIC_ADMIN_URL ??
    (process.env.NODE_ENV === "production"
      ? "https://zouma-village-admin.vercel.app"
      : "http://localhost:3001")
  ).replace(/\/$/u, "")

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#E8DCC7] text-[#283618]">
      <section className="relative isolate min-h-[480px] overflow-hidden bg-[#606C38] text-[#E8DCC7] sm:min-h-[520px] lg:min-h-[540px]">
        <SafeImage
          alt={t("hero.imageAlt")}
          className="-z-20 object-cover object-[62%_center]"
          fill
          priority
          sizes="100vw"
          src="/images/trees/lz018-feizixiao-v2.webp"
        />
        <div className="absolute inset-0 -z-10 bg-[#283618]/45" />
        <div className="absolute inset-y-0 left-0 -z-10 hidden w-[58%] bg-[#283618]/72 md:block" />
        <div
          aria-hidden="true"
          className="hero-grain pointer-events-none absolute inset-0 -z-10 opacity-[0.025]"
        />

        <header className="border-b border-[#E8DCC7]/25">
          <Section className="flex h-16 min-w-0 items-center justify-between gap-3">
            <Link
              className="inline-flex min-w-0 items-center gap-2 text-sm font-bold text-[#E8DCC7]"
              href={`/${params.locale}`}
            >
              <ArrowLeft aria-hidden="true" className="h-4 w-4 shrink-0" />
              <span className="truncate">{t("nav.home")}</span>
            </Link>
            <nav
              aria-label={t("nav.aria")}
              className="hidden items-center gap-5 text-sm font-bold text-[#E8DCC7]/78 md:flex"
            >
              <Link
                className="transition hover:text-[#E8DCC7]"
                href={`/${params.locale}/trees/LZ-018`}
              >
                {t("nav.tree")}
              </Link>
              <Link
                className="transition hover:text-[#E8DCC7]"
                href={`/${params.locale}/villager/login`}
              >
                {t("nav.villager")}
              </Link>
              <a
                className="transition hover:text-[#E8DCC7]"
                href={`${adminBaseUrl}/tasks`}
                rel="noreferrer"
                target="_blank"
              >
                {t("nav.admin")}
              </a>
              <a
                className="transition hover:text-[#E8DCC7]"
                href={`${adminBaseUrl}/simulations`}
                rel="noreferrer"
                target="_blank"
              >
                {t("nav.badCase")}
              </a>
            </nav>
            <span className="rounded-full border border-[#E8DCC7]/35 px-3 py-1 text-xs font-bold">
              LZ-018
            </span>
          </Section>
        </header>

        <Section className="flex min-h-[416px] flex-col justify-end pb-8 pt-10 sm:min-h-[456px] sm:pb-10 lg:min-h-[476px]">
          <div className="max-w-3xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-[#C66B3D] px-3 py-1 text-xs font-extrabold text-[#E8DCC7]">
                {t("hero.badge")}
              </span>
              <span className="rounded-full border border-[#E8DCC7]/45 px-3 py-1 text-xs font-bold">
                {t(`readiness.${readiness.mode}.label`)}
              </span>
            </div>
            <h1 className="hero-serif mt-5 max-w-2xl break-words text-4xl font-bold leading-[1.08] sm:text-6xl">
              {t("hero.title")}
            </h1>
            <p className="mt-5 max-w-2xl text-base font-medium leading-8 text-[#E8DCC7]/88 sm:text-lg">
              {t("hero.body")}
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link
                className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-[#C66B3D] px-6 text-sm font-extrabold text-[#E8DCC7] transition duration-300 hover:bg-[#B08B6E]"
                href="#journey"
              >
                {t("hero.start")}
                <ArrowDown aria-hidden="true" className="h-4 w-4" />
              </Link>
              <Link
                className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-[#E8DCC7]/55 px-6 text-sm font-extrabold text-[#E8DCC7] transition duration-300 hover:bg-[#E8DCC7]/10"
                href={`/${params.locale}/trees/LZ-018`}
              >
                <Leaf aria-hidden="true" className="h-4 w-4" />
                {t("hero.treeCta")}
              </Link>
            </div>
          </div>
        </Section>
      </section>

      <section className="bg-[#C08E3A] text-[#283618]">
        <Section className="grid gap-5 py-5 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
          <div className="flex min-w-0 items-start gap-3">
            <Database aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0" />
            <div className="min-w-0">
              <p className="font-extrabold">
                {t(`readiness.${readiness.mode}.title`)}
              </p>
              <p className="mt-1 break-words text-sm leading-6 text-[#283618]/78">
                {t(`readiness.${readiness.mode}.body`)}
              </p>
            </div>
          </div>
          <p className="text-xs font-bold leading-5 md:max-w-xs md:text-right">
            {t("disclaimer")}
          </p>
        </Section>
      </section>

      <section className="bg-[#D4B895]">
        <Section className="grid grid-cols-3 divide-x divide-[#606C38]/35 py-6 text-center">
          <div className="px-2">
            <p className="text-2xl font-extrabold text-[#606C38]">3</p>
            <p className="mt-1 text-xs font-bold sm:text-sm">
              {t("facts.roles")}
            </p>
          </div>
          <div className="px-2">
            <p className="text-2xl font-extrabold text-[#C66B3D]">7</p>
            <p className="mt-1 text-xs font-bold sm:text-sm">
              {t("facts.steps")}
            </p>
          </div>
          <div className="px-2">
            <p className="text-2xl font-extrabold text-[#606C38]">1</p>
            <p className="mt-1 text-xs font-bold sm:text-sm">
              {t("facts.case")}
            </p>
          </div>
        </Section>
      </section>

      <Section className="py-12 sm:py-16" id="journey">
        <DemoJourney adminBaseUrl={adminBaseUrl} mode={readiness.mode} />
      </Section>

      <section className="bg-[#606C38] text-[#E8DCC7]">
        <Section className="grid gap-8 py-14 lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.58fr)] lg:items-start">
          <div>
            <p className="text-sm font-bold text-[#D4B895]">
              {t("boundaries.eyebrow")}
            </p>
            <h2 className="hero-serif mt-2 text-3xl font-bold leading-tight">
              {t("boundaries.title")}
            </h2>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-[#E8DCC7]/78">
              {t("boundaries.body")}
            </p>
          </div>
          <ul className="grid gap-4 border-l border-[#E8DCC7]/30 pl-5 text-sm leading-6">
            <li className="flex gap-3">
              <UserRound
                aria-hidden="true"
                className="mt-0.5 h-4 w-4 shrink-0 text-[#D4B895]"
              />
              {t("boundaries.payment")}
            </li>
            <li className="flex gap-3">
              <Sprout
                aria-hidden="true"
                className="mt-0.5 h-4 w-4 shrink-0 text-[#D4B895]"
              />
              {t("boundaries.refund")}
            </li>
            <li className="flex gap-3">
              <ClipboardCheck
                aria-hidden="true"
                className="mt-0.5 h-4 w-4 shrink-0 text-[#D4B895]"
              />
              {t("boundaries.agent")}
            </li>
            <li className="flex gap-3">
              <ShieldCheck
                aria-hidden="true"
                className="mt-0.5 h-4 w-4 shrink-0 text-[#D4B895]"
              />
              {t("boundaries.review")}
            </li>
          </ul>
        </Section>
      </section>
    </main>
  )
}
