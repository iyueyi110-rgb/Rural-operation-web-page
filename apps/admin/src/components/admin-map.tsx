"use client"

import type { LatLngExpression } from "leaflet"
import { CircleMarker, MapContainer, Popup, TileLayer, Tooltip } from "react-leaflet"

import { nodeDisplayName } from "@admin/lib/admin-api"
import { adminCopy } from "@admin/lib/admin-copy"
import {
  normalizeZoumaVillageCoordinate,
  zoumaVillageCenter,
  zoumaVillageLabel,
} from "@admin/lib/map-location"

export type MapLayer = "heat" | "risk" | "spend"

export interface MapNode {
  id: string
  slug: string
  nameKey: string
  lat: number | null
  lng: number | null
  capacity: number
  terrainRisk: number
  watersideRisk: number
}

export interface MapNodeMetric {
  nodeId: string
  currentVisitors: number
  updatedAt: string | null
  attractiveness: number
  safetyRisk: number
  revenue: number
  orderCount: number
}

export interface AdminMapProps {
  activeLayer: MapLayer
  metrics: Map<string, MapNodeMetric>
  nodes: MapNode[]
}

const mapCenter: LatLngExpression = zoumaVillageCenter
const amapKey = process.env.NEXT_PUBLIC_AMAP_KEY ?? ""
const tileUrl = `https://webrd0{s}.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}${amapKey ? `&key=${amapKey}` : ""}`

export function AdminMap({ activeLayer, metrics, nodes }: AdminMapProps) {
  const geoNodes = nodes.filter(
    (node) => typeof node.lat === "number" && typeof node.lng === "number",
  )

  if (!geoNodes.length) {
    return (
      <div className="flex h-[560px] items-center justify-center rounded-lg border border-stone bg-white text-sm font-bold text-ink/54">
        {adminCopy.map.noGeoData}
      </div>
    )
  }

  return (
    <div className="relative">
      <MapContainer
        center={mapCenter}
        className="h-[560px] w-full rounded-lg border border-stone shadow-soft"
        preferCanvas
        scrollWheelZoom
        zoom={14}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.amap.com/">高德地图</a>'
          subdomains={["1", "2", "3", "4"]}
          url={tileUrl}
        />
        {geoNodes.map((node) => {
          const metric = metrics.get(node.id) ?? emptyMetric(node.id)
          const visual = layerVisual(activeLayer, metric)
          const name = nodeDisplayName(node.slug, node.nameKey)
          const position = normalizeZoumaVillageCoordinate(
            node.lat as number,
            node.lng as number,
          )

          return (
            <CircleMarker
              center={position}
              fillColor={visual.color}
              fillOpacity={0.62}
              key={node.id}
              pathOptions={{ color: visual.color, weight: 2 }}
              radius={visual.radius}
            >
              <Tooltip direction="top" offset={[0, -6]} opacity={0.95} permanent={false}>
                {name}
              </Tooltip>
              <Popup>
                <div className="min-w-48 text-sm">
                  <div className="font-bold">{name}</div>
                  <div className="mt-1 text-xs text-ink/58">{zoumaVillageLabel}</div>
                  <dl className="mt-2 grid gap-1 text-xs">
                    <Metric label={adminCopy.map.visitors} value={metric.currentVisitors} />
                    <Metric label={adminCopy.map.attractiveness} value={metric.attractiveness.toFixed(1)} />
                    <Metric label={adminCopy.map.safetyRisk} value={metric.safetyRisk.toFixed(1)} />
                    <Metric label={adminCopy.map.revenue} value={`¥${metric.revenue.toFixed(0)}`} />
                    <Metric label={adminCopy.map.orders} value={metric.orderCount} />
                    <Metric label={adminCopy.map.updatedAt} value={metric.updatedAt ?? "-"} />
                  </dl>
                </div>
              </Popup>
            </CircleMarker>
          )
        })}
      </MapContainer>
      <div className="pointer-events-none absolute left-4 top-4 z-[500] rounded-full border border-white/60 bg-white/92 px-3 py-2 text-xs font-bold text-ink shadow-soft backdrop-blur">
        {zoumaVillageLabel}
      </div>
    </div>
  )
}

function Metric({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="text-ink/58">{label}</dt>
      <dd className="font-bold text-ink">{value}</dd>
    </div>
  )
}

function emptyMetric(nodeId: string): MapNodeMetric {
  return {
    nodeId,
    currentVisitors: 0,
    updatedAt: null,
    attractiveness: 0,
    safetyRisk: 0,
    revenue: 0,
    orderCount: 0,
  }
}

function layerVisual(layer: MapLayer, metric: MapNodeMetric) {
  if (layer === "risk") {
    return {
      color:
        metric.safetyRisk >= 70
          ? "#c93a32"
          : metric.safetyRisk >= 35
            ? "#d99a20"
            : "#2d8a57",
      radius: 8 + Math.min(metric.safetyRisk / 7, 16),
    }
  }

  if (layer === "spend") {
    return {
      color: metric.revenue > 0 ? "#2f7f93" : "#7a8b7f",
      radius: 8 + Math.min(metric.revenue / 80, 18),
    }
  }

  return {
    color:
      metric.currentVisitors >= 60
        ? "#c93a32"
        : metric.currentVisitors >= 20
          ? "#d99a20"
          : "#2d8a57",
    radius: 8 + Math.min(metric.currentVisitors / 4, 18),
  }
}
