import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import {
  ArrowLeft,
  CalendarDays,
  Map,
  MoveRight,
  ShieldCheck,
} from "lucide-react"
import { getTranslations, setRequestLocale } from "next-intl/server"

import { BackButton } from "@web/components/back-button"
import { getSceneDetail, sceneDetails } from "@web/lib/scenes-data"
import { getSiteUrl } from "@web/lib/site-url"
import type { Locale } from "@web/i18n/routing"
import { SafeImage, Section, StatusBadge } from "@ui/index"

export function generateStaticParams() {
  return sceneDetails.map((scene) => ({ slug: scene.slug }))
}

export async function generateMetadata({
  params,
}: {
  params: { locale: Locale; slug: string }
}): Promise<Metadata> {
  const scene = getSceneDetail(params.slug)
  if (!scene) {
    return {}
  }

  const t = await getTranslations({
    locale: params.locale,
    namespace: "scenes",
  })

  return {
    metadataBase: getSiteUrl(),
    title: t(`${scene.titleKey}`),
    description: t(`${scene.summaryKey}`),
    openGraph: {
      title: t(`${scene.titleKey}`),
      description: t(`${scene.summaryKey}`),
      images: [scene.coverAsset],
    },
  }
}

export default async function SceneDetailPage({
  params,
}: {
  params: { locale: Locale; slug: string }
}) {
  setRequestLocale(params.locale)
  const scene = getSceneDetail(params.slug)

  if (!scene) {
    notFound()
  }

  const t = await getTranslations("scenes")
  const common = await getTranslations("common")

  return (
    <main className="min-h-screen bg-rice pb-16 text-ink">
      <header className="fixed left-0 right-0 top-0 z-40 border-b border-white/10 bg-ink/78 text-white backdrop-blur-xl">
        <Section className="flex h-16 items-center justify-between gap-4">
          <BackButton
            className="flex shrink-0 cursor-pointer items-center gap-2 border-none bg-transparent text-sm font-semibold text-white/86 transition hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
            fallbackHref={`/${params.locale}`}
            label={common("back")}
          />
          <nav className="hidden items-center gap-5 text-sm text-white/72 md:flex">
            {sceneDetails.map((item) => (
              <Link
                className={
                  item.slug === scene.slug
                    ? "text-white"
                    : "transition hover:text-white"
                }
                href={`/${params.locale}/scenes/${item.slug}`}
                key={item.slug}
              >
                {t(item.titleKey)}
              </Link>
            ))}
          </nav>
        </Section>
      </header>

      <section className="relative min-h-[82svh] overflow-hidden pt-16 text-white">
        <SafeImage
          alt={t(scene.imageAltKey)}
          className="object-cover"
          fill
          priority
          sizes="100vw"
          src={scene.coverAsset}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-ink/80 via-ink/34 to-ink/88" />
        <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-rice to-transparent" />

        <Section className="relative z-10 flex min-h-[calc(82svh-4rem)] flex-col justify-end pb-16 pt-14">
          <div className="max-w-4xl">
            <StatusBadge>{t(scene.eyebrowKey)}</StatusBadge>
            <h1 className="mt-6 max-w-3xl break-words text-4xl font-extrabold leading-tight tracking-normal sm:text-6xl">
              {t(scene.titleKey)}
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-white/84">
              {t(scene.summaryKey)}
            </p>
            <div className="mt-7 flex flex-wrap gap-2">
              {scene.tags.map((tag) => (
                <span
                  className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold text-white/84 backdrop-blur"
                  key={tag}
                >
                  {t(tag)}
                </span>
              ))}
            </div>
          </div>
        </Section>
      </section>

      <Section className="relative z-10 -mt-8">
        <div className="grid gap-3 rounded-lg border border-stone bg-white/90 p-4 shadow-soft backdrop-blur sm:grid-cols-3">
          {scene.metrics.map((metric) => (
            <div className="rounded-md bg-rice p-5" key={metric.labelKey}>
              <div className="text-2xl font-extrabold">
                {t(metric.valueKey)}
              </div>
              <div className="mt-1 text-sm text-ink/64">
                {t(metric.labelKey)}
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section className="grid gap-5 pt-16 lg:grid-cols-[0.85fr_1.15fr]">
        <aside className="rounded-lg border border-stone bg-ink p-6 text-white shadow-soft">
          <div className="flex items-center gap-2 text-sm font-semibold text-white/70">
            <ShieldCheck aria-hidden="true" className="h-4 w-4" />
            {t("detail.ruleTitle")}
          </div>
          <p className="mt-4 text-sm leading-7 text-white/72">
            {t("detail.ruleBody")}
          </p>
          <div className="mt-6 rounded-md bg-white/8 p-4">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <CalendarDays aria-hidden="true" className="h-4 w-4" />
              {common("updatedAt", { date: scene.updatedAt })}
            </div>
          </div>
        </aside>

        <div className="grid gap-4">
          {scene.blocks.map((block) => (
            <article
              className="rounded-lg border border-stone bg-white p-6 shadow-soft"
              key={block.titleKey}
            >
              <h2 className="text-2xl font-extrabold">{t(block.titleKey)}</h2>
              <p className="mt-3 text-sm leading-7 text-ink/70">
                {t(block.bodyKey)}
              </p>
            </article>
          ))}
        </div>
      </Section>

      <Section className="pt-14">
        <div className="flex flex-col justify-between gap-5 rounded-lg border border-stone bg-white p-6 shadow-soft md:flex-row md:items-center">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold text-water">
              <Map aria-hidden="true" className="h-4 w-4" />
              {t("detail.nextTitle")}
            </div>
            <p className="mt-2 max-w-xl text-sm leading-7 text-ink/68">
              {t("detail.nextBody")}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            {scene.ctas.map((cta) => (
              <Link
                className={
                  cta.tone === "primary"
                    ? "inline-flex h-11 items-center gap-2 rounded-full bg-lychee px-5 text-sm font-bold text-white transition hover:bg-[#a8312f]"
                    : "inline-flex h-11 items-center gap-2 rounded-full border border-stone px-5 text-sm font-bold text-ink transition hover:bg-rice"
                }
                href={`/${params.locale}${cta.href}`}
                key={cta.labelKey}
              >
                {t(cta.labelKey)}
                <MoveRight aria-hidden="true" className="h-4 w-4" />
              </Link>
            ))}
          </div>
        </div>
      </Section>
    </main>
  )
}
