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
  TileLayer: {
    RoadNet: new () => unknown
    Satellite: new () => unknown
  }
}

declare global {
  interface Window {
    AMap?: AMapNamespace
  }
}

const zoumaVillageCenter: Coordinate = [107.1055, 29.8105]

const realms = [
  {
    slug: "ancient-road",
    titleKey: "realms.ancientRoad.title",
    color: "#b93835",
    position: [107.099141, 29.812567] satisfies Coordinate,
  },
  {
    slug: "lychee-field",
    titleKey: "realms.lycheeField.title",
    color: "#9a6c2f",
    position: [107.102516, 29.808982] satisfies Coordinate,
  },
  {
    slug: "resilience-valley",
    titleKey: "realms.resilienceValley.title",
    color: "#2f7686",
    position: [107.1038, 29.8063] satisfies Coordinate,
  },
  {
    slug: "ridge-dwelling",
    titleKey: "realms.ridgeDwelling.title",
    color: "#46624a",
    position: [107.1083, 29.8083] satisfies Coordinate,
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
    const createRealmLabel = (realm: (typeof realms)[number]) => {
      const label = document.createElement("span")
      label.className = "realm-region-label"

      const dot = document.createElement("span")
      dot.className = "realm-region-label__dot"
      dot.style.backgroundColor = realm.color

      label.textContent = t(realm.titleKey)
      label.prepend(dot)
      return label
    }

    const initLeaflet = async () => {
      const L = await import("leaflet")
      if (disposed) return () => undefined

      container.innerHTML = ""
      const map = L.map(container, {
        scrollWheelZoom: false,
        zoomControl: true,
      }).setView([zoumaVillageCenter[1], zoumaVillageCenter[0]], 16)

      L.tileLayer(
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
        {
          attribution:
            "Tiles &copy; Esri, Maxar, Earthstar Geographics, and the GIS User Community",
          maxZoom: 19,
        },
      ).addTo(map)

      realms.forEach((realm) => {
        L.marker([realm.position[1], realm.position[0]], {
          icon: L.divIcon({
            className: "realm-region-marker",
            html: createRealmLabel(realm),
          }),
        })
          .addTo(map)
          .on("click", () => navigate(realm.slug))
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
        center: zoumaVillageCenter,
        layers: [
          new AMap.TileLayer.Satellite(),
          new AMap.TileLayer.RoadNet(),
        ],
        pitch: 0,
        viewMode: "3D",
        zoom: 16,
      })

      const overlays: AMapShape[] = realms.map((realm) => {
        const label = createRealmLabel(realm)
        const marker = new AMap.Marker({
          content: label,
          cursor: "pointer",
          position: realm.position,
        })
        marker.on("click", () => navigate(realm.slug))
        return marker
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
          <div className="pointer-events-none absolute right-4 top-4 z-[500] hidden items-center gap-2 rounded-full bg-ink/78 px-3 py-1.5 text-xs font-bold text-white/88 backdrop-blur sm:flex">
            <MapPin aria-hidden="true" className="h-3.5 w-3.5" />
            {t("mapGateway.locationLabel")}
          </div>
        </div>
      </div>
    </section>
  )
}
