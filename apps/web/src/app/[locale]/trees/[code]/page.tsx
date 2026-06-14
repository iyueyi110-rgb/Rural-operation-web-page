import type { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"
import { ArrowLeft, CalendarDays, Leaf, Sprout } from "lucide-react"
import { getTranslations, setRequestLocale } from "next-intl/server"
import { notFound } from "next/navigation"

import type { Locale } from "@web/i18n/routing"
import { getSiteUrl } from "@web/lib/site-url"
import { getTreeProfile } from "@web/lib/tree-records"
import { PageHeader, Section } from "@ui/index"

export const dynamic = "force-dynamic"

export async function generateMetadata({
  params,
}: {
  params: { locale: Locale; code: string }
}): Promise<Metadata> {
  const t = await getTranslations({ locale: params.locale, namespace: "metadata.trees" })

  return {
    metadataBase: getSiteUrl(),
    title: t("title"),
    description: t("description"),
  }
}

export default async function TreeDetailPage({ params }: { params: { locale: Locale; code: string } }) {
  setRequestLocale(params.locale)
  const t = await getTranslations("trees")
  const tree = await getTreeProfile(params.code)

  if (!tree) notFound()

  return (
    <main className="min-h-screen bg-rice pb-16 text-ink">
      <PageHeader
        backHref={`/${params.locale}/trees`}
        backLabel={t("nav.backHome")}
        icon={<ArrowLeft aria-hidden="true" className="h-4 w-4" />}
        rightLabel={t("profile.eyebrow")}
      />

      <Section className="pt-12">
        <div className="grid gap-7 lg:grid-cols-[minmax(0,0.78fr)_minmax(300px,0.42fr)]">
          <div>
            <p className="flex items-center gap-2 text-sm font-bold uppercase tracking-[0.18em] text-lychee">
              <Sprout aria-hidden="true" className="h-4 w-4" />
              {t("profile.eyebrow")}
            </p>
            <h1 className="mt-3 break-all text-3xl font-extrabold leading-tight sm:text-5xl">{t(tree.nameKey)}</h1>
            <p className="mt-4 text-sm font-bold text-water">{tree.treeCode}</p>
            <p className="mt-5 break-all text-base leading-8 text-ink/68">{t(tree.summaryKey)}</p>

            <div className="mt-7 grid gap-4 sm:grid-cols-3">
              <div className="rounded-lg border border-stone bg-white p-4 shadow-soft">
                <div className="text-2xl font-extrabold">{t(tree.species)}</div>
                <div className="mt-1 text-sm text-ink/58">{t("list.species")}</div>
              </div>
              <div className="rounded-lg border border-stone bg-white p-4 shadow-soft">
                <div className="text-2xl font-extrabold">{t("list.ageValue", { count: tree.age })}</div>
                <div className="mt-1 text-sm text-ink/58">{t("list.age")}</div>
              </div>
              <div className="rounded-lg border border-stone bg-white p-4 shadow-soft">
                <div className="text-2xl font-extrabold">{t(`health.${tree.healthStatus}`)}</div>
                <div className="mt-1 text-sm text-ink/58">{t("list.health")}</div>
              </div>
            </div>
          </div>

          <div className="overflow-hidden rounded-lg border border-stone bg-white shadow-soft">
            <div className="relative aspect-[4/3]">
              <Image alt={t(tree.imageAltKey)} className="object-cover" fill sizes="(min-width: 1024px) 420px, 100vw" src={tree.imageAsset} />
            </div>
            <div className="p-5">
              <div className="text-sm font-bold text-water">{t(tree.blurredLocation)}</div>
              <Link className="mt-4 inline-flex h-11 items-center rounded-full bg-ink px-5 text-sm font-bold text-white" href={`/${params.locale}/trees`}>
                {t("list.select")}
              </Link>
            </div>
          </div>
        </div>
      </Section>

      <Section className="pt-9">
        <div className="grid gap-5 lg:grid-cols-2">
          <article className="rounded-lg border border-stone bg-white p-5 shadow-soft">
            <div className="flex items-center gap-2 text-sm font-bold text-lychee">
              <Leaf aria-hidden="true" className="h-4 w-4" />
              山火记忆
            </div>
            <p className="mt-3 text-sm leading-7 text-ink/68">{tree.fireMemory || "运营后台尚未录入山火记忆。"}</p>
          </article>
          <article className="rounded-lg border border-stone bg-white p-5 shadow-soft">
            <div className="flex items-center gap-2 text-sm font-bold text-moss">
              <Sprout aria-hidden="true" className="h-4 w-4" />
              新梢记录
            </div>
            <p className="mt-3 text-sm leading-7 text-ink/68">{tree.newShootsRecord || "运营后台尚未录入新梢记录。"}</p>
          </article>
        </div>
      </Section>

      <Section className="pt-9">
        <div className="rounded-lg border border-stone bg-white p-5 shadow-soft">
          <div className="flex items-center gap-2 text-sm font-bold text-moss">
            <Leaf aria-hidden="true" className="h-4 w-4" />
            成长照片
          </div>
          {tree.growthPhotos.length > 0 ? (
            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {tree.growthPhotos.map((photo, index) => (
                <div className="relative aspect-[4/3] overflow-hidden rounded-md bg-rice" key={photo}>
                  <Image
                    alt={`${t(tree.nameKey)} 成长照片 ${index + 1}`}
                    className="object-cover"
                    fill
                    sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                    src={photo}
                  />
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-sm font-semibold text-ink/58">暂无成长照片，后台上传后会在这里展示。</p>
          )}
        </div>
      </Section>

      <Section className="pt-9">
        <div className="rounded-lg border border-stone bg-white p-5 shadow-soft">
          <div className="flex items-center gap-2 text-sm font-bold text-lychee">
            <CalendarDays aria-hidden="true" className="h-4 w-4" />
            果实去向
          </div>
          <div className="mt-5 grid gap-4">
            {tree.harvestBookings.filter((booking) => booking.fruitDestination).length > 0 ? (
              tree.harvestBookings
                .filter((booking) => booking.fruitDestination)
                .map((booking) => (
                  <article className="border-l-2 border-stone pl-4" key={booking.id}>
                    <div className="text-xs font-bold text-lychee">{booking.scheduledDate} / {booking.timeSlot}</div>
                    <h2 className="mt-1 text-base font-extrabold">{booking.fruitDestination}</h2>
                    <p className="mt-1 text-sm leading-7 text-ink/68">{booking.destinationNote || "运营后台已记录本次采摘果实去向。"}</p>
                  </article>
                ))
            ) : (
              <p className="text-sm font-semibold text-ink/58">暂无果实去向记录，采摘完成后可在后台补充。</p>
            )}
          </div>
        </div>
      </Section>

      <Section className="pt-9">
        <div className="rounded-lg border border-stone bg-white p-5 shadow-soft">
          <div className="flex items-center gap-2 text-sm font-bold text-water">
            <CalendarDays aria-hidden="true" className="h-4 w-4" />
            {t("timeline.title")}
          </div>
          <div className="mt-5 grid gap-4">
            {tree.careLogs.length > 0 ? (
              tree.careLogs.map((log) => (
                <article className="border-l-2 border-stone pl-4" key={log.id}>
                  <div className="text-xs font-bold text-lychee">{new Date(log.createdAt).toLocaleString()}</div>
                  <h2 className="mt-1 text-base font-extrabold">{log.logType}</h2>
                  <p className="mt-1 text-sm leading-7 text-ink/68">{log.content}</p>
                  <p className="mt-1 text-xs font-semibold text-ink/46">{log.operator}</p>
                </article>
              ))
            ) : (
              <p className="text-sm font-semibold text-ink/58">暂无养护日志，后台录入后会按时间倒序显示。</p>
            )}
          </div>
        </div>
      </Section>
    </main>
  )
}
