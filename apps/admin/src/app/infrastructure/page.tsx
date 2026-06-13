"use client"

import { useCallback, useEffect, useState } from "react"
import { CloudRain, Droplets, Gauge, Thermometer, Waves } from "lucide-react"

import { adminApiBase } from "@admin/lib/admin-api"
import { adminCopy } from "@admin/lib/admin-copy"

interface SensorReading {
  id: string
  sensorId: string
  type: string
  value: number
  unit: string
  nodeId?: string
  createdAt: string
}

interface ControlCommand {
  id: string
  type: string
  priority: string
  reason: string
  status: string
  triggeredBy: string
  createdAt: string
}

const sensorMeta = {
  rainfall: { label: "降雨量", icon: CloudRain },
  soil_moisture: { label: "土壤湿度", icon: Droplets },
  water_level: { label: "水位", icon: Waves },
  temperature: { label: "温度", icon: Thermometer },
  humidity: { label: "湿度", icon: Gauge },
} as const

const adminToken = process.env.NEXT_PUBLIC_ADMIN_API_TOKEN ?? "dev-admin-token"

export default function InfrastructurePage() {
  const [sensors, setSensors] = useState<SensorReading[]>([])
  const [commands, setCommands] = useState<ControlCommand[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isDeciding, setIsDeciding] = useState(false)
  const [message, setMessage] = useState("")

  const loadData = useCallback(async () => {
    setIsLoading(true)
    const [sensorResponse, commandResponse] = await Promise.all([
      fetch(`${adminApiBase}/infrastructure/sensors/latest`),
      fetch(`${adminApiBase}/infrastructure/commands`),
    ])
    const sensorPayload = (await sensorResponse.json()) as { data?: SensorReading[] }
    const commandPayload = (await commandResponse.json()) as { data?: ControlCommand[] }
    setSensors(sensorPayload.data ?? [])
    setCommands(commandPayload.data ?? [])
    setIsLoading(false)
  }, [])

  useEffect(() => {
    void loadData()
  }, [loadData])

  async function runDecision() {
    setIsDeciding(true)
    setMessage("")
    const response = await fetch(`${adminApiBase}/infrastructure/decide`, { method: "POST" })
    setMessage(response.ok ? "设施调度建议已生成。" : "设施调度建议生成失败。")
    setIsDeciding(false)
    await loadData()
  }

  async function updateCommand(id: string, status: "approved" | "rejected" | "executed") {
    const response = await fetch(`${adminApiBase}/infrastructure/commands`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "X-Admin-Token": adminToken },
      body: JSON.stringify({ id, status }),
    })
    setMessage(response.ok ? "控制指令状态已更新。" : "控制指令状态更新失败。")
    if (response.ok) await loadData()
  }

  return (
    <div className="grid gap-5">
      <header>
        <p className="text-sm font-bold text-water">{adminCopy.shell.subtitle}</p>
        <h1 className="mt-1 text-2xl font-extrabold">{adminCopy.infrastructure.title}</h1>
      </header>

      {message ? <div className="rounded-md bg-rice p-3 text-sm font-bold text-ink/70">{message}</div> : null}

      <section className="rounded-lg border border-stone bg-white p-5 shadow-soft">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-extrabold">{adminCopy.infrastructure.sensors}</h2>
          <button className="h-10 rounded-full border border-stone px-4 text-sm font-bold" onClick={loadData} type="button">
            {adminCopy.common.refresh}
          </button>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-5">
          {(sensors.length > 0 ? sensors : placeholderSensors()).map((sensor) => {
            const meta = sensorMeta[sensor.type as keyof typeof sensorMeta] ?? { label: sensor.type, icon: Gauge }
            const Icon = meta.icon
            const hasValue = sensors.length > 0
            return (
              <div className="rounded-md bg-rice p-4" key={`${sensor.sensorId}-${sensor.type}`}>
                <Icon className="h-5 w-5 text-water" />
                <div className="mt-3 text-sm font-extrabold">{meta.label}</div>
                <div className="mt-1 text-xs font-semibold text-ink/54">
                  {hasValue ? new Date(sensor.createdAt).toLocaleString("zh-CN") : adminCopy.infrastructure.pending}
                </div>
                <div className={hasValue ? "mt-3 text-2xl font-extrabold" : "mt-3 text-2xl font-extrabold text-ink/30"}>
                  {hasValue ? sensor.value : "--"} {sensor.unit}
                </div>
              </div>
            )
          })}
        </div>
        {sensors.length === 0 ? <p className="mt-4 text-sm font-semibold leading-6 text-ink/56">{adminCopy.infrastructure.noSensorData}</p> : null}
      </section>

      <section className="rounded-lg border border-stone bg-white p-5 shadow-soft">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-extrabold">{adminCopy.infrastructure.commands}</h2>
          <button className="h-10 rounded-full bg-ink px-4 text-sm font-bold text-white disabled:bg-ink/30" disabled={isDeciding} onClick={runDecision} type="button">
            {isDeciding ? "生成中" : "执行决策"}
          </button>
        </div>
        <div className="mt-4 grid gap-3">
          {commands.length > 0 ? (
            commands.map((command) => (
              <article className="rounded-md border border-stone bg-rice p-4" key={command.id}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="text-sm font-extrabold">{command.type} · {command.priority}</div>
                  <div className="text-xs font-bold text-water">{command.status} · {command.triggeredBy}</div>
                </div>
                <p className="mt-2 text-sm leading-6 text-ink/66">{command.reason}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {command.status === "pending" ? (
                    <>
                      <button className="rounded-full bg-moss px-3 py-1 text-xs font-bold text-white" onClick={() => updateCommand(command.id, "approved")} type="button">批准</button>
                      <button className="rounded-full border border-stone px-3 py-1 text-xs font-bold" onClick={() => updateCommand(command.id, "rejected")} type="button">驳回</button>
                    </>
                  ) : null}
                  {command.status === "approved" ? (
                    <button className="rounded-full bg-water px-3 py-1 text-xs font-bold text-white" onClick={() => updateCommand(command.id, "executed")} type="button">标记执行</button>
                  ) : null}
                </div>
              </article>
            ))
          ) : (
            <p className="rounded-md bg-rice p-4 text-sm font-semibold leading-6 text-ink/58">
              {adminCopy.infrastructure.noCommandData}
            </p>
          )}
        </div>
      </section>
    </div>
  )
}

function placeholderSensors(): SensorReading[] {
  return [
    { id: "rainfall", sensorId: "pending-rainfall", type: "rainfall", value: 0, unit: "mm", createdAt: "" },
    { id: "soil", sensorId: "pending-soil", type: "soil_moisture", value: 0, unit: "%", createdAt: "" },
    { id: "water", sensorId: "pending-water", type: "water_level", value: 0, unit: "m", createdAt: "" },
    { id: "temperature", sensorId: "pending-temperature", type: "temperature", value: 0, unit: "°C", createdAt: "" },
    { id: "humidity", sensorId: "pending-humidity", type: "humidity", value: 0, unit: "%", createdAt: "" },
  ]
}
