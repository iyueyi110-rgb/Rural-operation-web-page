"use client"

import { MapContainer, TileLayer } from "react-leaflet"
import type { LatLngExpression } from "leaflet"

const zoumaCenter: LatLngExpression = [29.8255, 107.067]
const amapKey = process.env.NEXT_PUBLIC_AMAP_KEY ?? ""
const amapKeyQuery = amapKey ? `&key=${amapKey}` : ""
const satelliteTileUrl = `https://webst0{s}.is.autonavi.com/appmaptile?style=6&x={x}&y={y}&z={z}${amapKeyQuery}`
const annotationTileUrl = `https://webst0{s}.is.autonavi.com/appmaptile?style=8&x={x}&y={y}&z={z}${amapKeyQuery}`

export function RouteSatelliteMap() {
  return (
    <MapContainer
      center={zoumaCenter}
      className="h-full w-full"
      preferCanvas
      scrollWheelZoom
      zoom={15}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.amap.com/">高德地图</a>'
        subdomains={["1", "2", "3", "4"]}
        url={satelliteTileUrl}
      />
      <TileLayer
        attribution=""
        opacity={0.92}
        subdomains={["1", "2", "3", "4"]}
        url={annotationTileUrl}
      />
    </MapContainer>
  )
}
