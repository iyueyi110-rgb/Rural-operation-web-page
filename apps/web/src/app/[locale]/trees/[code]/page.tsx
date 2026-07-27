import type { Metadata } from "next"
import Link from "next/link"
import { ArrowLeft, CalendarDays, Leaf, Sprout } from "lucide-react"
import { getTranslations, setRequestLocale } from "next-intl/server"
import { notFound } from "next/navigation"

import type { Locale } from "@web/i18n/routing"
import { AdoptionRightsPanel } from "@web/components/adoption-rights-panel"
import { BackButton } from "@web/components/back-button"
import { VisitorHeaderActions } from "@web/components/visitor-header-actions"
import { GrowthAnimation } from "@web/components/growth-animation"
import { InteractionPanel } from "@web/components/interaction-panel"
import {
  EmptyState,
  MetricTile,
  PanelTitle,
  SurfacePanel,
} from "@web/components/subpage-ui"
import { TreeEnvironmentCard } from "@web/components/tree-environment-card"
import { getSiteUrl } from "@web/lib/site-url"
import { getTreeAdoptionRights, getTreeProfile } from "@web/lib/tree-records"
import { PageHeader, SafeImage, Section } from "@ui/index"

import { HarvestShipmentForm } from "./harvest-shipment-form"

export const dynamic = "force-dynamic"

export async function generateMetadata({
  params,
}: {
  params: { locale: Locale; code: string }
}): Promise<Metadata> {
  const t = await getTranslations({
    locale: params.locale,
    namespace: "metadata.trees",
  })

  return {
    metadataBase: getSiteUrl(),
    title: t("title"),
    description: t("description"),
  }
}

export default async function TreeDetailPage({
  params,
}: {
  params: { locale: Locale; code: string }
}) {
  setRequestLocale(params.locale)
  const t = await getTranslations("trees")
  const common = await getTranslations("common")
  const tree = await getTreeProfile(params.code)

  if (!tree) notFound()
  const adoptionRights = await getTreeAdoptionRights(tree.id)

  return (
    <main className="min-h-screen bg-rice pb-16 text-ink">
      <PageHeader
        backHref={`/${params.locale}/trees`}
        backLabel={t("nav.backHome")}
        backElement={
          <BackButton
            fallbackHref={`/${params.locale}/trees`}
            label={common("back")}
          />
        }
        icon={<ArrowLeft aria-hidden="true" className="h-4 w-4" />}
        rightElement={
          <VisitorHeaderActions
            locale={params.locale}
            rightLabel={t("profile.eyebrow")}
          />
        }
      />

      <Section className="pt-12">
        <div className="grid gap-7 lg:grid-cols-[minmax(0,0.78fr)_minmax(300px,0.42fr)]">
          <div>
            <p className="flex items-center gap-2 text-sm font-bold text-lychee">
              <Sprout aria-hidden="true" className="h-4 w-4" />
              {t("profile.eyebrow")}
            </p>
            <h1 className="mt-3 break-words text-3xl font-extrabold leading-tight sm:text-5xl">
              {t(tree.nameKey)}
            </h1>
            <p className="mt-4 text-sm font-bold text-water">{tree.treeCode}</p>
            <p className="mt-5 break-words text-base leading-8 text-ink/68">
              {t(tree.summaryKey)}
            </p>

            <div className="mt-7 grid gap-4 sm:grid-cols-3">
              <MetricTile label={t("list.species")} value={t(tree.species)} />
              <MetricTile
                label={t("list.age")}
                value={t("list.ageValue", { count: tree.age })}
              />
              <MetricTile
                label={t("list.health")}
                value={t(`health.${tree.healthStatus}`)}
              />
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-line bg-surface shadow-[0_12px_28px_rgba(25,32,27,0.08)]">
            <div className="relative aspect-[4/3]">
              <SafeImage
                alt={t(tree.imageAltKey)}
                className="object-cover"
                fill
                sizes="(min-width: 1024px) 420px, 100vw"
                src={tree.imageAsset}
              />
            </div>
            <div className="p-5">
              <div className="text-sm font-bold text-water">
                {t(tree.blurredLocation)}
              </div>
              <Link
                className="btn-primary mt-4"
                href={`/${params.locale}/trees`}
              >
                {t("profile.selectCta")}
              </Link>
            </div>
          </div>
        </div>
      </Section>

      <Section className="pt-9">
        <div className="grid gap-5 lg:grid-cols-2">
          <SurfacePanel>
            <PanelTitle
              icon={<Leaf aria-hidden="true" className="h-4 w-4" />}
              tone="lychee"
            >
              {t("profile.fireMemoryTitle")}
            </PanelTitle>
            <p className="mt-3 text-sm leading-7 text-ink/68">
              {tree.fireMemory || t("profile.fireMemoryEmpty")}
            </p>
          </SurfacePanel>
          <SurfacePanel>
            <PanelTitle
              icon={<Sprout aria-hidden="true" className="h-4 w-4" />}
              tone="moss"
            >
              {t("profile.newShootsTitle")}
            </PanelTitle>
            <p className="mt-3 text-sm leading-7 text-ink/68">
              {tree.newShootsRecord || t("profile.newShootsEmpty")}
            </p>
          </SurfacePanel>
        </div>
      </Section>

      <Section className="pt-9">
        <SurfacePanel>
          <PanelTitle
            icon={<Leaf aria-hidden="true" className="h-4 w-4" />}
            tone="moss"
          >
            {t("profile.growthPhotosTitle")}
          </PanelTitle>
          {tree.growthPhotos.length > 0 ? (
            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {tree.growthPhotos.map((photo, index) => (
                <div
                  className="relative aspect-[4/3] overflow-hidden rounded-lg bg-rice"
                  key={photo}
                >
                  <SafeImage
                    alt={t("profile.growthPhotoAlt", {
                      name: t(tree.nameKey),
                      index: index + 1,
                    })}
                    className="object-cover"
                    fill
                    sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                    src={photo}
                  />
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              className="mt-5"
              title={t("profile.growthPhotosEmpty")}
            />
          )}
        </SurfacePanel>
      </Section>

      <Section className="pt-9">
        <SurfacePanel>
          <PanelTitle
            icon={<CalendarDays aria-hidden="true" className="h-4 w-4" />}
            tone="lychee"
          >
            {t("profile.fruitDestinationTitle")}
          </PanelTitle>
          <div className="mt-5 grid gap-4">
            {tree.harvestBookings.filter((booking) => booking.fruitDestination)
              .length > 0 ? (
              tree.harvestBookings
                .filter((booking) => booking.fruitDestination)
                .map((booking) => (
                  <article
                    className="border-l border-line pl-4"
                    key={booking.id}
                  >
                    <div className="text-xs font-bold text-lychee">
                      {booking.scheduledDate} / {booking.timeSlot}
                    </div>
                    <h2 className="mt-1 text-base font-extrabold">
                      {booking.fruitDestination}
                    </h2>
                    <p className="mt-1 text-sm leading-7 text-ink/68">
                      {booking.destinationNote ||
                        t("profile.fruitDestinationFallback")}
                    </p>
                  </article>
                ))
            ) : (
              <EmptyState title={t("profile.fruitDestinationEmpty")} />
            )}
          </div>
        </SurfacePanel>
      </Section>

      <Section className="pt-9">
        <HarvestShipmentForm treeCode={tree.treeCode} />
      </Section>

      <Section className="pt-9">
        <SurfacePanel>
          <PanelTitle
            icon={<CalendarDays aria-hidden="true" className="h-4 w-4" />}
          >
            {t("timeline.title")}
          </PanelTitle>
          <div className="mt-5 grid gap-4">
            {tree.careLogs.length > 0 ? (
              tree.careLogs.map((log) => (
                <article className="border-l border-line pl-4" key={log.id}>
                  <div className="text-xs font-bold text-lychee">
                    {new Date(log.createdAt).toLocaleString()}
                  </div>
                  <h2 className="mt-1 text-base font-extrabold">
                    {log.logType}
                  </h2>
                  <p className="mt-1 text-sm leading-7 text-ink/68">
                    {log.content}
                  </p>
                  <p className="mt-1 text-xs font-semibold text-ink/46">
                    {log.operator}
                  </p>
                </article>
              ))
            ) : (
              <EmptyState title={t("profile.careLogsEmpty")} />
            )}
          </div>
        </SurfacePanel>
      </Section>

      <Section className="pt-9">
        <TreeEnvironmentCard treeId={tree.id} />
      </Section>

      <Section className="pt-9">
        <AdoptionRightsPanel
          plan={adoptionRights?.plan ?? "annual"}
          rightsJson={adoptionRights?.rightsJson ?? null}
          status={adoptionRights?.status ?? tree.adoptStatus}
        />
      </Section>

      <Section className="pt-9">
        <GrowthAnimation stage="flowering" />
      </Section>

      <Section className="pt-9">
        <InteractionPanel treeCode={tree.treeCode} treeId={tree.id} />
      </Section>
    </main>
  )
}
