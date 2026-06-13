"use client"

import { CloudRain, Droplets, Gauge, Thermometer, Waves } from "lucide-react"

import { adminCopy } from "@admin/lib/admin-copy"

const sensors = [
  { label: "降雨量", unit: "mm", icon: CloudRain },
  { label: "土壤湿度", unit: "%", icon: Droplets },
  { label: "水位", unit: "m", icon: Waves },
  { label: "温度", unit: "°C", icon: Thermometer },
  { label: "湿度", unit: "%", icon: Gauge },
]

export default function InfrastructurePage() {
  return (
    <div className="grid gap-5">
      <header>
        <p className="text-sm font-bold text-water">{adminCopy.shell.subtitle}</p>
        <h1 className="mt-1 text-2xl font-extrabold">{adminCopy.infrastructure.title}</h1>
      </header>

      <section className="rounded-lg border border-stone bg-white p-5 shadow-soft">
        <h2 className="text-lg font-extrabold">{adminCopy.infrastructure.sensors}</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-5">
          {sensors.map((sensor) => {
            const Icon = sensor.icon
            return (
              <div className="rounded-md bg-rice p-4" key={sensor.label}>
                <Icon className="h-5 w-5 text-water" />
                <div className="mt-3 text-sm font-extrabold">{sensor.label}</div>
                <div className="mt-1 text-xs font-semibold text-ink/54">{adminCopy.infrastructure.pending}</div>
                <div className="mt-3 text-2xl font-extrabold text-ink/30">-- {sensor.unit}</div>
              </div>
            )
          })}
        </div>
        <p className="mt-4 text-sm font-semibold leading-6 text-ink/56">{adminCopy.infrastructure.noSensorData}</p>
      </section>

      <section className="rounded-lg border border-stone bg-white p-5 shadow-soft">
        <h2 className="text-lg font-extrabold">{adminCopy.infrastructure.commands}</h2>
        <p className="mt-4 rounded-md bg-rice p-4 text-sm font-semibold leading-6 text-ink/58">
          {adminCopy.infrastructure.noCommandData}
        </p>
      </section>
    </div>
  )
}
