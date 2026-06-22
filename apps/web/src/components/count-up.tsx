"use client"

import { useEffect, useMemo, useState } from "react"

interface CountUpProps {
  value: number
  decimals?: number
  durationMs?: number
  storageKey?: string
}

export function CountUp({
  value,
  decimals = 0,
  durationMs = 1200,
  storageKey,
}: CountUpProps) {
  const [displayValue, setDisplayValue] = useState(value)

  const formatter = useMemo(
    () =>
      new Intl.NumberFormat(undefined, {
        maximumFractionDigits: decimals,
        minimumFractionDigits: decimals,
      }),
    [decimals],
  )

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)")
    const hasPlayed = storageKey
      ? window.sessionStorage.getItem(storageKey) === "played"
      : false

    if (media.matches || hasPlayed) {
      setDisplayValue(value)
      return
    }

    setDisplayValue(0)
    const startedAt = performance.now()
    let frameId = window.requestAnimationFrame(function tick(now) {
      const progress = Math.min((now - startedAt) / durationMs, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplayValue(value * eased)

      if (progress < 1) {
        frameId = window.requestAnimationFrame(tick)
      } else if (storageKey) {
        window.sessionStorage.setItem(storageKey, "played")
      }
    })

    return () => window.cancelAnimationFrame(frameId)
  }, [durationMs, storageKey, value])

  return <>{formatter.format(displayValue)}</>
}
