"use client"

import {
  Activity,
  BadgeCheck,
  CloudSun,
  PackageCheck,
  Sparkles,
  Users,
} from "lucide-react"
import { useCallback, useEffect, useRef, useState } from "react"
import type { ReactNode } from "react"

import {
  ActiveAlertsPanel,
  type ActiveAlertRow,
} from "@admin/components/active-alerts-panel"
import { DashboardModuleCard } from "@admin/components/dashboard-module-card"
import {
  RecommendationReviewPanel,
  type RecommendationRow,
} from "@admin/components/recommendation-review-panel"
import { fetchAdminApi } from "@admin/lib/admin-api"
import {
  buildSparklinePath,
  normalizeEcologySensors,
  summarizeProductFeedback,
  summarizeProduction,
  summarizeVisitorBehavior,
} from "@admin/lib/dashboard-data"

const THIRTY_SECONDS = 30_000
const ONE_HOUR = 60 * 60_000
const ONE_DAY = 24 * ONE_HOUR

interface ApiList<T> {
  data: T[]
}

interface VillagerRow {
  status: string
}

interface TaskRow {
  earnings: number
}

interface ConsumptionRow {
  nodeId?: string | null
  totalAmount: number
  orderCount: number
}

interface PresenceRow {
  peopleCount: number
}

interface SensorRow {
  id: string
  type: string
  value: number
  unit: string
  createdAt: string
}

interface FeedbackRow {
  rating: number
  severity: string
}

interface ProductRow {
  stockStatus: string
}

const demoFeedback: FeedbackRow[] = [
  { rating: 4, severity: "medium" },
  { rating: 5, severity: "high" },
]

const demoProducts: ProductRow[] = [
  { stockStatus: "available" },
  { stockStatus: "seasonal" },
  { stockStatus: "reservation" },
]

const demoRecommendations: RecommendationRow[] = [
  {
    id: "demo-rec-001",
    bizDate: todayInChina(),
    type: "maintenance",
    targetObject: "resilience-valley-core",
    evidenceJson: {
      waterLevel: "0.72m",
      activeAlert: "water_level",
      source: "demo_fallback",
    },
    message: "水岸节点水位接近预警阈值，建议打开临时导流并安排现场复核。",
    actionSteps: ["打开水岸提示牌", "通知周启明复核水位传感器"],
    ownerRole: "operator",
    expectedImpact: "降低亲水区域湿滑停留风险，保障现场展示连续性。",
    confidence: 0.86,
    status: "draft",
  },
  {
    id: "demo-rec-002",
    bizDate: todayInChina(),
    type: "inventory_alert",
    targetObject: "lychee-gift-box",
    evidenceJson: {
      product: "走马荔枝礼盒",
      orders: 5,
      source: "demo_fallback",
    },
    message: "荔枝礼盒与认养回访关注度较高，建议补齐礼盒库存并同步前台权益说明。",
    actionSteps: ["补货荔枝礼盒", "补充认养树回访权益文案"],
    ownerRole: "operator",
    expectedImpact: "提升农产品转化并减少现场咨询等待。",
    confidence: 0.81,
    status: "draft",
  },
  {
    id: "demo-rec-003",
    bizDate: todayInChina(),
    type: "crowd_diversion",
    targetObject: "ridge-dwelling-core",
    evidenceJson: {
      peakVisitors: 58,
      taskStatus: "in_progress",
      source: "demo_fallback",
    },
    message: "岭上村宴订单集中，建议提前派发备餐和院落整理任务。",
    actionSteps: ["派发备餐任务", "确认院落库存"],
    ownerRole: "operator",
    expectedImpact: "减少村宴高峰时段服务压力。",
    confidence: 0.78,
    status: "draft",
  },
]

export default function DashboardPage() {
  const production = useModuleData(loadProduction, ONE_HOUR)
  const behavior = useModuleData(loadVisitorBehavior, THIRTY_SECONDS)
  const ecology = useModuleData(loadEcology, THIRTY_SECONDS)
  const productFeedback = useModuleData(loadProductFeedback, ONE_HOUR)
  const recommendations = useModuleData(loadRecommendations, ONE_DAY)

  return (
    <div className="-m-4 min-h-screen bg-[#0d1714] p-4 text-white sm:-m-6 sm:p-6 lg:-m-7 lg:p-7">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-extrabold text-[#d7b56d]">
            <span className="h-2 w-2 rounded-full bg-[#d7b56d]" />
            AIGC Cloud Brain
          </div>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight">
            五流运营总览
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-white/50">
            生产、游客、生态、产品反馈与智策卡在同一屏协同，数据按业务节奏自动更新。
          </p>
        </div>
        <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-bold text-white/50">
          上海时区 · 模块独立刷新
        </div>
      </header>

      <div className="grid gap-4 xl:grid-cols-2">
        <DashboardModuleCard
          icon={<Users aria-hidden="true" className="h-5 w-5" />}
          loading={production.loading}
          onRefresh={production.refresh}
          title="村民生产数据"
        >
          <ModuleError message={production.error} />
          <div className="grid grid-cols-3 gap-3">
            <Metric
              label="在岗村民"
              value={production.data?.activeVillagers ?? 0}
            />
            <Metric
              label="完成任务"
              value={production.data?.completedTasks ?? 0}
            />
            <Metric
              label="完成收益"
              value={`¥${production.data?.completedEarnings ?? 0}`}
            />
          </div>
          <Freshness
            icon={<BadgeCheck className="h-3.5 w-3.5" />}
            label="每小时同步"
          />
        </DashboardModuleCard>

        <DashboardModuleCard
          icon={<Activity aria-hidden="true" className="h-5 w-5" />}
          loading={behavior.loading}
          onRefresh={behavior.refresh}
          title="游客行为分析"
        >
          <ModuleError message={behavior.error} />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Metric
              label="当前客流"
              value={behavior.data?.currentVisitors ?? 0}
            />
            <Metric label="峰值客流" value={behavior.data?.peakVisitors ?? 0} />
            <Metric label="消费订单" value={behavior.data?.orderCount ?? 0} />
            <Metric
              label="消费金额"
              value={`¥${behavior.data?.revenue ?? 0}`}
            />
          </div>
          <Sparkline
            label="节点实时客流趋势"
            values={behavior.data?.trend ?? []}
          />
        </DashboardModuleCard>

        <DashboardModuleCard
          icon={<CloudSun aria-hidden="true" className="h-5 w-5" />}
          loading={ecology.loading}
          onRefresh={ecology.refresh}
          title="生态感知面板"
        >
          <ModuleError message={ecology.error} />
          <div className="mb-4 grid grid-cols-3 gap-2">
            {(ecology.data?.sensors ?? []).slice(0, 3).map((sensor) => (
              <div className="rounded-lg border border-white/8 bg-white/[0.045] p-3" key={sensor.id}>
                <div className="truncate text-[11px] font-bold text-white/40">
                  {sensorTypeLabel(sensor.type)}
                </div>
                <div className="mt-1 text-lg font-extrabold text-[#d7b56d]">
                  {sensor.value}
                  <span className="ml-1 text-xs text-white/40">
                    {sensor.unit}
                  </span>
                </div>
              </div>
            ))}
            {!ecology.data?.sensors.length ? (
              <p className="col-span-3 text-sm font-semibold text-white/40">
                传感数据待接入。
              </p>
            ) : null}
          </div>
          <ActiveAlertsPanel
            alerts={ecology.data?.alerts ?? []}
            onAssigned={ecology.refresh}
          />
        </DashboardModuleCard>

        <DashboardModuleCard
          icon={<PackageCheck aria-hidden="true" className="h-5 w-5" />}
          loading={productFeedback.loading}
          onRefresh={productFeedback.refresh}
          title="农产品反馈"
        >
          <ModuleError message={productFeedback.error} />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Metric
              label="平均评分"
              value={(productFeedback.data?.averageRating ?? 0).toFixed(1)}
            />
            <Metric
              label="高优反馈"
              value={productFeedback.data?.urgentFeedback ?? 0}
            />
            <Metric
              label="在售产品"
              value={productFeedback.data?.availableProducts ?? 0}
            />
            <Metric
              label="产品总数"
              value={productFeedback.data?.productCount ?? 0}
            />
          </div>
          <Freshness
            icon={<PackageCheck className="h-3.5 w-3.5" />}
            label="每小时汇总"
          />
        </DashboardModuleCard>

        <div className="xl:col-span-2">
          <DashboardModuleCard
            icon={<Sparkles aria-hidden="true" className="h-5 w-5" />}
            loading={recommendations.loading}
            onRefresh={recommendations.refresh}
            title="运营智策卡"
          >
            <ModuleError message={recommendations.error} />
            <RecommendationReviewPanel
              items={(recommendations.data ?? []).slice(0, 3)}
              onReviewed={recommendations.refresh}
            />
          </DashboardModuleCard>
        </div>
      </div>
    </div>
  )
}

function useModuleData<T>(loader: () => Promise<T>, refreshInterval: number) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const refresh = useCallback(async () => {
    setLoading(true)
    setError("")
    try {
      setData(await loader())
    } catch {
      setError("数据暂时不可用，请稍后刷新。")
    } finally {
      setLoading(false)
    }
  }, [loader])

  useEffect(() => {
    void refresh()
    const intervalId = window.setInterval(() => void refresh(), refreshInterval)
    return () => window.clearInterval(intervalId)
  }, [refresh, refreshInterval])

  return { data, loading, error, refresh }
}

async function loadProduction() {
  const [villagers, tasks] = await Promise.all([
    fetchAdminApi<ApiList<VillagerRow>>("/villagers"),
    fetchAdminApi<ApiList<TaskRow>>("/tasks?status=completed"),
  ])
  return summarizeProduction(villagers.data, tasks.data)
}

async function loadVisitorBehavior() {
  const consumption = await fetchAdminApi<ApiList<ConsumptionRow>>(
    "/analytics/consumption/by-node",
  )
  const nodeId = consumption.data.find((item) => item.nodeId)?.nodeId
  const presence = nodeId
    ? await fetchAdminApi<ApiList<PresenceRow>>(
        `/presence/series?nodeId=${encodeURIComponent(nodeId)}&limit=48`,
      )
    : { data: [] }
  return {
    ...summarizeVisitorBehavior(consumption.data, presence.data),
    trend: presence.data.map((item) => item.peopleCount),
  }
}

async function loadEcology() {
  const [sensors, alerts] = await Promise.all([
    fetchAdminApi<ApiList<SensorRow>>("/infrastructure/sensors/latest"),
    fetchAdminApi<ApiList<ActiveAlertRow>>("/alerts?status=active"),
  ])
  return { sensors: normalizeEcologySensors(sensors.data), alerts: alerts.data }
}

async function loadProductFeedback() {
  try {
    const [feedback, products] = await Promise.all([
      fetchAdminApi<ApiList<FeedbackRow>>("/feedback"),
      fetchAdminApi<ApiList<ProductRow>>("/products?includeInactive=true"),
    ])
    const feedbackData = feedback.data.length ? feedback.data : demoFeedback
    const productData = products.data.length ? products.data : demoProducts
    return summarizeProductFeedback(feedbackData, productData)
  } catch {
    return summarizeProductFeedback(demoFeedback, demoProducts)
  }
}

async function loadRecommendations() {
  try {
    const result = await fetchAdminApi<ApiList<RecommendationRow>>(
      "/recommendations?status=draft",
    )
    return result.data.length ? result.data : demoRecommendations
  } catch {
    return demoRecommendations
  }
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-white/8 bg-white/[0.045] p-3">
      <div className="text-[11px] font-bold text-white/38">{label}</div>
      <div className="mt-1 text-xl font-extrabold tracking-tight text-white">
        {value}
      </div>
    </div>
  )
}

function Sparkline({ label, values }: { label: string; values: number[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const path = buildSparklinePath(values, 320, 56)

  useEffect(() => {
    const canvas = canvasRef.current
    const context = canvas?.getContext("2d")
    if (!canvas || !context || !path) return

    const points = Array.from(
      path.matchAll(/(?:M|L) ([\d.]+) ([\d.]+)/g),
      (match) => [Number(match[1]), Number(match[2])],
    )
    context.clearRect(0, 0, canvas.width, canvas.height)
    context.save()
    context.scale(2, 2)
    context.beginPath()
    if (points.length === 1) {
      context.arc(points[0][0], points[0][1], 4, 0, Math.PI * 2)
    } else {
      points.forEach(([x, y], index) => {
        if (index === 0) context.moveTo(x, y)
        else context.lineTo(x, y)
      })
    }
    context.lineCap = "round"
    context.lineJoin = "round"
    context.lineWidth = 3
    context.strokeStyle = "#d7b56d"
    context.fillStyle = "#d7b56d"
    context.shadowBlur = 0
    if (points.length === 1) context.fill()
    else context.stroke()
    context.restore()
  }, [path])

  return (
    <figure className="mt-4 rounded-lg border border-white/8 bg-black/10 p-3">
      <figcaption className="mb-2 text-[11px] font-bold text-white/38">
        {label}
      </figcaption>
      {path ? (
        <canvas
          aria-label={label}
          className="h-14 w-full"
          height={112}
          ref={canvasRef}
          role="img"
          width={640}
        />
      ) : (
        <div className="flex h-14 items-center text-xs font-semibold text-white/35">
          暂无趋势样本
        </div>
      )}
    </figure>
  )
}

function Freshness({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <div className="mt-4 flex items-center gap-2 text-xs font-bold text-[#d7b56d]/70">
      {icon}
      {label}
    </div>
  )
}

function ModuleError({ message }: { message: string }) {
  return message ? (
    <p className="mb-3 rounded-md bg-red-400/10 px-3 py-2 text-xs font-semibold text-red-200">
      {message}
    </p>
  ) : null
}

function sensorTypeLabel(type: string) {
  const labels: Record<string, string> = {
    soil_moisture: "土壤水分",
    air_humidity: "空气湿度",
    humidity: "空气湿度",
    light_intensity: "光照强度",
    light: "光照强度",
    temperature: "环境温度",
  }
  return labels[type] ?? type
}

function todayInChina() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Shanghai" }).format(new Date())
}
