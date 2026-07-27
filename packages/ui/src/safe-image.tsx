"use client"

import Image, { type ImageProps } from "next/image"
import { useEffect, useState } from "react"

const FALLBACK_IMAGE =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='300' viewBox='0 0 400 300'%3E%3Crect fill='%23e9e0d2' width='400' height='300'/%3E%3Cpath d='M96 205h208l-55-70-42 49-29-34-82 55Z' fill='%23cfc4b1'/%3E%3Ccircle cx='135' cy='104' r='24' fill='%23d8cfbf'/%3E%3Ctext x='50%25' y='258' dominant-baseline='middle' text-anchor='middle' fill='%237a7469' font-family='Arial,sans-serif' font-size='14'%3E图片加载失败%3C/text%3E%3C/svg%3E"

const PLACEHOLDER_BLUR =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 40 30'%3E%3Crect fill='%23e9e0d2' width='40' height='30'/%3E%3C/svg%3E"

export function SafeImage({
  alt,
  blurDataURL,
  loading,
  onError,
  placeholder,
  priority,
  src,
  ...rest
}: ImageProps) {
  const [hasError, setHasError] = useState(false)
  const [reducedData, setReducedData] = useState(false)

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-data: reduce)")
    const syncPreference = () => setReducedData(media.matches)

    syncPreference()
    media.addEventListener("change", syncPreference)
    return () => media.removeEventListener("change", syncPreference)
  }, [])

  return (
    <Image
      {...rest}
      alt={alt}
      blurDataURL={blurDataURL ?? PLACEHOLDER_BLUR}
      loading={priority ? undefined : loading ?? "lazy"}
      onError={(event) => {
        setHasError(true)
        onError?.(event)
      }}
      placeholder={placeholder ?? "blur"}
      priority={priority}
      quality={reducedData ? 58 : rest.quality}
      src={hasError ? FALLBACK_IMAGE : src}
    />
  )
}
