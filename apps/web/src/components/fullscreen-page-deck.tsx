"use client"

import { ChevronDown, ChevronUp } from "lucide-react"
import {
  Children,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react"

const NEXT_PAGE_EVENT = "zouma:home-deck-next"
const TRANSITION_MS = 560
const SWIPE_THRESHOLD = 52

interface FullscreenPageDeckProps {
  children: ReactNode
  onPageChange?: (index: number) => void
  pageLabels?: string[]
}

export function FullscreenPageDeck({
  children,
  onPageChange,
  pageLabels,
}: FullscreenPageDeckProps) {
  const pages = Children.toArray(children)
  const [current, setCurrent] = useState(0)
  const pageRefs = useRef<Array<HTMLDivElement | null>>([])
  const transitionTimer = useRef<number | undefined>(undefined)
  const isTransitioning = useRef(false)
  const touchStartY = useRef<number | null>(null)

  const goTo = useCallback(
    (index: number) => {
      if (
        isTransitioning.current ||
        index < 0 ||
        index >= pages.length ||
        index === current
      ) {
        return
      }

      isTransitioning.current = true
      setCurrent(index)
      onPageChange?.(index)
      window.clearTimeout(transitionTimer.current)
      transitionTimer.current = window.setTimeout(() => {
        isTransitioning.current = false
      }, TRANSITION_MS)
    },
    [current, onPageChange, pages.length],
  )

  const goNext = useCallback(() => goTo(current + 1), [current, goTo])
  const goPrevious = useCallback(() => goTo(current - 1), [current, goTo])

  const canLeaveCurrentPage = useCallback(
    (direction: "next" | "previous") => {
      const page = pageRefs.current[current]
      if (!page) return true

      if (direction === "next") {
        return page.scrollTop + page.clientHeight >= page.scrollHeight - 4
      }

      return page.scrollTop <= 4
    },
    [current],
  )

  useEffect(() => {
    const htmlOverflow = document.documentElement.style.overflow
    const bodyOverflow = document.body.style.overflow
    document.documentElement.style.overflow = "hidden"
    document.body.style.overflow = "hidden"

    return () => {
      document.documentElement.style.overflow = htmlOverflow
      document.body.style.overflow = bodyOverflow
      window.clearTimeout(transitionTimer.current)
    }
  }, [])

  useEffect(() => {
    const handleKeyboard = (event: KeyboardEvent) => {
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement ||
        event.target instanceof HTMLSelectElement
      ) {
        return
      }

      if (
        (event.key === "ArrowDown" || event.key === "PageDown") &&
        canLeaveCurrentPage("next")
      ) {
        event.preventDefault()
        goNext()
      }
      if (
        (event.key === "ArrowUp" || event.key === "PageUp") &&
        canLeaveCurrentPage("previous")
      ) {
        event.preventDefault()
        goPrevious()
      }
    }
    const handleNextEvent = () => goNext()

    window.addEventListener("keydown", handleKeyboard)
    window.addEventListener(NEXT_PAGE_EVENT, handleNextEvent)
    return () => {
      window.removeEventListener("keydown", handleKeyboard)
      window.removeEventListener(NEXT_PAGE_EVENT, handleNextEvent)
    }
  }, [canLeaveCurrentPage, goNext, goPrevious])

  const handleWheel = useCallback(
    (event: React.WheelEvent<HTMLDivElement>) => {
      if (Math.abs(event.deltaY) < 36) return

      const direction = event.deltaY > 0 ? "next" : "previous"
      if (!canLeaveCurrentPage(direction)) return

      event.preventDefault()
      if (direction === "next") goNext()
      else goPrevious()
    },
    [canLeaveCurrentPage, goNext, goPrevious],
  )

  const handleTouchStart = useCallback(
    (event: React.TouchEvent<HTMLDivElement>) => {
      touchStartY.current = event.touches[0]?.clientY ?? null
    },
    [],
  )

  const handleTouchEnd = useCallback(
    (event: React.TouchEvent<HTMLDivElement>) => {
      const startY = touchStartY.current
      const endY = event.changedTouches[0]?.clientY
      touchStartY.current = null
      if (startY === null || endY === undefined) return

      const distance = startY - endY
      if (
        distance > SWIPE_THRESHOLD &&
        canLeaveCurrentPage("next")
      ) {
        goNext()
      } else if (
        distance < -SWIPE_THRESHOLD &&
        canLeaveCurrentPage("previous")
      ) {
        goPrevious()
      }
    },
    [canLeaveCurrentPage, goNext, goPrevious],
  )

  return (
    <div
      className="relative h-[100svh] w-full overflow-clip bg-ink"
      data-current-page={current}
      onTouchEnd={handleTouchEnd}
      onTouchStart={handleTouchStart}
      onWheel={handleWheel}
    >
      {pages.map((page, index) => (
        <div
          aria-hidden={index !== current}
          className="absolute inset-0 overflow-y-auto overscroll-contain transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none"
          data-home-deck-page={index}
          key={index}
          ref={(element) => {
            pageRefs.current[index] = element
          }}
          style={{
            transform: `translateY(${(index - current) * 100}%)`,
            zIndex: index === current ? 1 : 0,
          }}
        >
          {page}
        </div>
      ))}

      <p aria-live="polite" className="sr-only">
        {`Page ${current + 1} of ${pages.length}`}
      </p>

      <div className="absolute bottom-5 left-1/2 z-30 flex -translate-x-1/2 items-center gap-2 rounded-full border border-white/15 bg-ink/75 px-3 py-2 shadow-soft backdrop-blur-xl">
        {current > 0 ? (
          <button
            aria-label="Previous page"
            className="grid h-8 w-8 place-items-center rounded-full text-white/72 transition hover:bg-white/12 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
            onClick={goPrevious}
            type="button"
          >
            <ChevronUp aria-hidden="true" className="h-4 w-4" />
          </button>
        ) : null}

        <div className="flex items-center gap-2">
          {pages.map((_, index) => (
            <button
              aria-current={index === current ? "page" : undefined}
              aria-label={pageLabels?.[index] ?? `Page ${index + 1}`}
              className={
                index === current
                  ? "flex h-8 items-center gap-2 rounded-full bg-white/12 px-2.5 text-xs font-bold text-white transition-all"
                  : "h-2 w-2 rounded-full bg-white/38 transition hover:bg-white/68"
              }
              key={index}
              onClick={() => goTo(index)}
              type="button"
            >
              <span
                className={
                  index === current
                    ? "h-2 w-4 rounded-full bg-lychee"
                    : "sr-only"
                }
              />
              {index === current && pageLabels?.[index] ? (
                <span className="hidden whitespace-nowrap sm:inline">
                  {pageLabels[index]}
                </span>
              ) : null}
            </button>
          ))}
        </div>

        {current < pages.length - 1 ? (
          <button
            aria-label="Next page"
            className="grid h-8 w-8 place-items-center rounded-full text-white/72 transition hover:bg-white/12 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
            onClick={goNext}
            type="button"
          >
            <ChevronDown aria-hidden="true" className="h-4 w-4" />
          </button>
        ) : null}
      </div>
    </div>
  )
}
