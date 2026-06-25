import { Headphones, ScrollText } from "lucide-react"
import { getTranslations } from "next-intl/server"

import { historySections } from "@web/lib/history-data"
import { SectionHeader } from "@web/components/section-header"

export async function HistoryScroll() {
  const t = await getTranslations("home")

  return (
    <section className="relative bg-[#e9e0d0] text-ink" id="history">
      <div className="mx-auto max-w-3xl px-5 pb-14 pt-20 text-center sm:px-8 sm:pb-20 sm:pt-24">
        <div className="mx-auto grid h-11 w-11 place-items-center rounded-full border border-ink/14 bg-white/50">
          <ScrollText aria-hidden="true" className="h-5 w-5 text-lychee" />
        </div>
        <div className="mt-5">
          <SectionHeader
            align="center"
            body={t("history.description")}
            kicker={t("history.eyebrow")}
            title={t("history.title")}
          />
        </div>
      </div>

      <div>
        {historySections.map((section, index) => (
          <article
            className="relative flex min-h-[72svh] items-center overflow-hidden bg-cover bg-center bg-local py-20 text-white md:bg-fixed"
            id={`history-${section.id}`}
            key={section.id}
            style={{ backgroundImage: `url(${section.imageUrl})` }}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-ink/94 via-ink/78 to-ink/42" />
            <div className="relative mx-auto grid w-full max-w-7xl gap-8 px-5 sm:px-8 lg:grid-cols-[0.25fr_0.75fr] lg:items-start">
              <div className="hero-serif text-6xl text-white/24 sm:text-8xl">
                {String(index + 1).padStart(2, "0")}
              </div>
              <div className="max-w-3xl">
                <h3 className="hero-serif text-3xl font-semibold leading-tight sm:text-5xl">
                  {t(section.titleKey)}
                </h3>
                <p className="mt-6 text-base leading-8 text-white/82 sm:text-lg sm:leading-9">
                  {t(section.bodyKey)}
                </p>
                <p className="mt-5 border-l border-white/28 pl-4 text-xs leading-6 text-white/55">
                  {t(section.sourceKey)}
                </p>
                <div className="mt-8 inline-flex items-center gap-3 rounded-full border border-white/18 bg-white/10 px-4 py-2.5 text-xs text-white/68 backdrop-blur">
                  <Headphones aria-hidden="true" className="h-4 w-4" />
                  <span>{t(section.audioLabelKey)}</span>
                  <span aria-hidden="true" className="h-3 w-px bg-white/20" />
                  <span>{t("history.audio.pending")}</span>
                  <audio aria-label={t(section.audioLabelKey)} preload="none">
                    {section.audioUrl ? (
                      <source src={section.audioUrl} />
                    ) : null}
                  </audio>
                </div>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}
