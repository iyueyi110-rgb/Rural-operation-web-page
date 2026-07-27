import Link from "next/link"
import { ArrowRight, CheckCircle2, Sprout } from "lucide-react"
import { getTranslations } from "next-intl/server"

import type { Locale } from "@web/i18n/routing"
import { buildAdoptionHref } from "@web/lib/home-navigation"
import { SafeImage, Section } from "@ui/index"

export async function HomeAdoptionFeature({ locale }: { locale: Locale }) {
  const t = await getTranslations({ locale, namespace: "home" })

  return (
    <section className="bg-rice py-16 sm:py-24" id="adoption-preview">
      <Section>
        <div className="overflow-hidden rounded-lg border border-stone bg-ink shadow-soft lg:grid lg:grid-cols-[1.08fr_0.92fr]">
          <div className="relative min-h-[360px] lg:min-h-[620px]">
            <SafeImage
              alt={t("adoption.imageAlt")}
              className="object-cover"
              fill
              priority={false}
              sizes="(min-width: 1024px) 56vw, 100vw"
              src="/images/home/lychee-field-user.webp"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-ink/58 via-transparent to-transparent" />
            <div className="absolute bottom-6 left-6 right-6 text-white sm:bottom-8 sm:left-8">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-ink/45 px-3 py-1.5 text-xs font-bold backdrop-blur">
                <Sprout aria-hidden="true" className="h-4 w-4" />
                {t("adoption.imageBadge")}
              </div>
            </div>
          </div>

          <div className="flex flex-col justify-center p-7 text-white sm:p-10 lg:p-12">
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-white/58">
              {t("adoption.eyebrow")}
            </p>
            <h2 className="hero-serif mt-4 text-4xl font-semibold leading-tight sm:text-5xl">
              {t("adoption.title")}
            </h2>
            <p className="mt-5 text-sm leading-7 text-white/72 sm:text-base">
              {t("adoption.body")}
            </p>

            <div className="mt-8 grid gap-4">
              {[1, 2, 3].map((item) => (
                <div className="flex gap-3" key={item}>
                  <CheckCircle2
                    aria-hidden="true"
                    className="mt-0.5 h-5 w-5 shrink-0 text-[#f3bf68]"
                  />
                  <div>
                    <h3 className="text-sm font-bold sm:text-base">
                      {t(`adoption.steps.${item}.title`)}
                    </h3>
                    <p className="mt-1 text-sm leading-6 text-white/62">
                      {t(`adoption.steps.${item}.body`)}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <Link
              className="mt-9 inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-lychee px-6 text-sm font-bold text-white shadow-soft transition hover:bg-[#a8312f] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white sm:w-fit"
              href={buildAdoptionHref(locale)}
            >
              {t("adoption.cta")}
              <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </Link>
            <p className="mt-3 text-xs leading-5 text-white/48">
              {t("adoption.ctaHint")}
            </p>
          </div>
        </div>
      </Section>
    </section>
  )
}
