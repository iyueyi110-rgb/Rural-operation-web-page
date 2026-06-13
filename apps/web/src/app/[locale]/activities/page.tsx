import type { Metadata } from "next"
import { ArrowLeft } from "lucide-react"
import { setRequestLocale } from "next-intl/server"

import { ActivitiesClient } from "./activities-client"
import type { Locale } from "@web/i18n/routing"
import { getSiteUrl } from "@web/lib/site-url"
import { PageHeader, Section } from "@ui/index"

export const metadata: Metadata = {
  metadataBase: getSiteUrl(),
  title: "走马村活动广场",
  description: "查看走马村院落活动、食育课、研学工坊与共居体验预约。",
}

export default function ActivitiesPage({ params }: { params: { locale: Locale } }) {
  setRequestLocale(params.locale)

  return (
    <main className="min-h-screen bg-rice pb-16 text-ink">
      <PageHeader
        backHref={`/${params.locale}`}
        backLabel="返回首页"
        icon={<ArrowLeft aria-hidden="true" className="h-4 w-4" />}
        rightLabel="活动广场"
      />
      <Section className="pt-12">
        <p className="text-sm font-bold uppercase tracking-[0.18em] text-lychee">Activities</p>
        <h1 className="mt-3 max-w-3xl break-all text-3xl font-extrabold leading-tight sm:text-5xl">院落活动与研学工坊</h1>
        <p className="mt-5 max-w-3xl text-base leading-8 text-ink/68">
          按类型和日期筛选活动，开放活动可提交预约；已满或已取消活动不可预约。
        </p>
      </Section>
      <Section className="pt-9">
        <ActivitiesClient />
      </Section>
    </main>
  )
}
