"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { MapPin, MoveRight } from "lucide-react"
import { useLocale, useTranslations } from "next-intl"
import { useRouter } from "next/navigation"

import type { Locale } from "@web/i18n/routing"

type Coordinate = [longitude: number, latitude: number]
type MapProvider = "loading" | "amap" | "leaflet"

interface AMapShape {
  on(event: "click", handler: () => void): void
}

interface AMapInstance {
  add(overlays: AMapShape[]): void
  destroy(): void
}

interface AMapNamespace {
  Map: new (
    container: HTMLElement,
    options: Record<string, unknown>,
  ) => AMapInstance
  Marker: new (options: Record<string, unknown>) => AMapShape
  Polygon: new (options: Record<string, unknown>) => AMapShape
}

declare global {
  interface Window {
    AMap?: AMapNamespace
  }
}

const center: Coordinate = [106.321, 29.8512]

const realms = [
  {
    slug: "ancient-road",
    titleKey: "realms.ancientRoad.title",
    color: "#b93835",
    points: [
      [106.309, 29.857],
      [106.318, 29.861],
      [106.322, 29.854],
      [106.314, 29.85],
    ] as Coordinate[],
  },
  {
    slug: "lychee-field",
    titleKey: "realms.lycheeField.title",
    color: "#9a6c2f",
    points: [
      [106.322, 29.861],
      [106.332, 29.858],
      [106.331, 29.85],
      [106.322, 29.853],
    ] as Coordinate[],
  },
  {
    slug: "resilience-valley",
    titleKey: "realms.resilienceValley.title",
    color: "#2f7686",
    points: [
      [106.314, 29.849],
      [106.322, 29.853],
      [106.322, 29.842],
      [106.31, 29.84],
    ] as Coordinate[],
  },
  {
    slug: "ridge-dwelling",
    titleKey: "realms.ridgeDwelling.title",
    color: "#46624a",
    points: [
      [106.322, 29.852],
      [106.332, 29.85],
      [106.335, 29.841],
      [106.322, 29.842],
    ] as Coordinate[],
  },
] as const

const anchors = [
  {
    labelKey: "mapGateway.anchors.milestone",
    position: [106.314, 29.856] as Coordinate,
  },
  {
    labelKey: "mapGateway.anchors.ancientTree",
    position: [106.327, 29.855] as Coordinate,
  },
  {
    labelKey: "mapGateway.anchors.courtyard",
    position: [106.329, 29.845] as Coordinate,
  },
] as const

function loadAMap(key: string) {
  if (window.AMap) return Promise.resolve(window.AMap)

  return new Promise<AMapNamespace>((resolve, reject) => {
    const existing = document.getElementById(
      "zouma-amap-jsapi",
    ) as HTMLScriptElement | null
    const script = existing ?? document.createElement("script")

    if (existing?.dataset.loadState === "failed") {
      reject(new Error("AMap JSAPI previously failed to load"))
      return
    }
    if (existing?.dataset.loadState === "loaded") {
      reject(new Error("AMap loaded without exposing its API"))
      return
    }

    const handleLoad = () => {
      script.dataset.loadState = "loaded"
      if (window.AMap) resolve(window.AMap)
      else reject(new Error("AMap loaded without exposing its API"))
    }
    const handleError = () => {
      script.dataset.loadState = "failed"
      reject(new Error("AMap JSAPI failed to load"))
    }

    script.addEventListener("load", handleLoad, { once: true })
    script.addEventListener("error", handleError, { once: true })

    if (!existing) {
      script.id = "zouma-amap-jsapi"
      script.async = true
      script.src = `https://webapi.amap.com/maps?v=2.0&key=${encodeURIComponent(key)}`
      document.head.appendChild(script)
    }
  })
}

export function RealmMapGateway() {
  const t = useTranslations("home")
  const locale = useLocale() as Locale
  const router = useRouter()
  const containerRef = useRef<HTMLDivElement>(null)
  const [provider, setProvider] = useState<MapProvider>("loading")

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    let disposed = false
    let teardown: () => void = () => undefined
    const navigate = (slug: string) => router.push(`/${locale}/scenes/${slug}`)

    const initLeaflet = async () => {
      const L = await import("leaflet")
      if (disposed) return () => undefined

      container.innerHTML = ""
      const map = L.map(container, {
        scrollWheelZoom: false,
        zoomControl: true,
      }).setView([center[1], center[0]], 15)

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map)

      realms.forEach((realm) => {
        L.polygon(
          realm.points.map(([longitude, latitude]) => [latitude, longitude]),
          {
            color: realm.color,
            fillColor: realm.color,
            fillOpacity: 0.5,
            weight: 2,
          },
        )
          .addTo(map)
          .bindTooltip(t(realm.titleKey), {
            className: "realm-map-label",
            direction: "center",
            permanent: true,
          })
          .on("click", () => navigate(realm.slug))
      })

      anchors.forEach((anchor) => {
        L.circleMarker([anchor.position[1], anchor.position[0]], {
          color: "#ffffff",
          fillColor: "#19201b",
          fillOpacity: 1,
          radius: 6,
          weight: 2,
        })
          .addTo(map)
          .bindTooltip(t(anchor.labelKey))
      })

      setProvider("leaflet")
      return () => {
        map.remove()
      }
    }

    const initAMap = async (key: string) => {
      const AMap = await loadAMap(key)
      if (disposed) return () => undefined

      container.innerHTML = ""
      const map = new AMap.Map(container, {
        center,
        mapStyle: "amap://styles/whitesmoke",
        pitch: 48,
        viewMode: "3D",
        zoom: 15,
      })

      const overlays: AMapShape[] = realms.map((realm) => {
        const polygon = new AMap.Polygon({
          cursor: "pointer",
          fillColor: realm.color,
          fillOpacity: 0.52,
          path: realm.points,
          strokeColor: realm.color,
          strokeWeight: 2,
        })
        polygon.on("click", () => navigate(realm.slug))
        return polygon
      })

      anchors.forEach((anchor) => {
        const label = document.createElement("span")
        label.className = "realm-anchor-label"
        label.textContent = t(anchor.labelKey)
        overlays.push(
          new AMap.Marker({ content: label, position: anchor.position }),
        )
      })

      map.add(overlays)
      setProvider("amap")
      return () => map.destroy()
    }

    const start = async () => {
      const amapKey = process.env.NEXT_PUBLIC_AMAP_KEY?.trim()
      try {
        teardown = amapKey ? await initAMap(amapKey) : await initLeaflet()
      } catch (error) {
        console.warn("AMap unavailable; falling back to Leaflet", error)
        teardown = await initLeaflet()
      }

      if (disposed) teardown()
    }

    void start()
    return () => {
      disposed = true
      teardown()
    }
  }, [locale, router, t])

  return (
    <section className="bg-rice py-20 sm:py-28" id="realms">
      <div className="mx-auto w-full max-w-7xl px-5 sm:px-8">
        <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.28em] text-lychee">
              {t("mapGateway.eyebrow")}
            </p>
            <h2 className="hero-serif mt-4 max-w-3xl text-4xl font-semibold sm:text-5xl">
              {t("mapGateway.title")}
            </h2>
          </div>
          <p className="max-w-md text-sm leading-7 text-ink/64">
            {t("mapGateway.description")}
          </p>
        </div>

        <div className="relative mt-9 overflow-hidden rounded-lg border border-stone bg-[#dce4d8] shadow-soft">
          <div
            aria-label={t("mapGateway.mapAria")}
            className="h-[68svh] min-h-[520px] w-full"
            ref={containerRef}
            role="region"
          />
          <div className="pointer-events-none absolute left-4 top-4 z-[500] rounded-full border border-white/50 bg-white/90 px-3 py-1.5 text-xs font-bold text-ink shadow-soft backdrop-blur">
            {t(`mapGateway.provider.${provider}`)}
          </div>
          <nav
            aria-label={t("mapGateway.legendAria")}
            className="absolute inset-x-3 bottom-3 z-[500] grid gap-2 rounded-lg border border-white/50 bg-white/92 p-3 shadow-soft backdrop-blur sm:inset-x-auto sm:bottom-5 sm:left-5 sm:w-80"
          >
            {realms.map((realm) => (
              <Link
                className="group flex items-center gap-3 rounded-md px-3 py-2 text-sm font-bold text-ink transition hover:bg-rice focus-visible:outline focus-visible:outline-2 focus-visible:outline-water"
                href={`/${locale}/scenes/${realm.slug}`}
                key={realm.slug}
              >
                <span
                  aria-hidden="true"
                  className="h-3 w-3 rounded-sm"
                  style={{ backgroundColor: realm.color }}
                />
                <span className="flex-1">{t(realm.titleKey)}</span>
                <MoveRight
                  aria-hidden="true"
                  className="h-4 w-4 transition group-hover:translate-x-1"
                />
              </Link>
            ))}
          </nav>
          <div className="pointer-events-none absolute right-4 top-4 z-[500] hidden items-center gap-2 rounded-full bg-ink/78 px-3 py-1.5 text-xs text-white/78 backdrop-blur sm:flex">
            <MapPin aria-hidden="true" className="h-3.5 w-3.5" />
            {t("mapGateway.anchorHint")}
          </div>
        </div>
      </div>
    </section>
  )
}
