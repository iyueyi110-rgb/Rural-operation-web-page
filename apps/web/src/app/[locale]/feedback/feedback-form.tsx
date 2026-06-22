"use client"

import { CheckCircle2, MessageCircle, SendHorizontal, Star } from "lucide-react"
import { useTranslations } from "next-intl"
import { useMemo, useState } from "react"

import type { FeedbackCategory, FeedbackSeverity } from "@web/lib/feedback-store"

interface SubmittedFeedback {
  id: string
  status: string
}

const categories: FeedbackCategory[] = ["content", "service", "facility", "payment", "other"]
const severities: FeedbackSeverity[] = ["low", "medium", "high", "urgent"]
const ratings = [1, 2, 3, 4, 5]

export function FeedbackForm() {
  const t = useTranslations("feedback")
  const [category, setCategory] = useState<FeedbackCategory>("service")
  const [severity, setSeverity] = useState<FeedbackSeverity>("low")
  const [rating, setRating] = useState(5)
  const [content, setContent] = useState("")
  const [submitted, setSubmitted] = useState<SubmittedFeedback | null>(null)
  const [error, setError] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const remaining = useMemo(() => Math.max(0, 500 - content.length), [content.length])
  const canSubmit = content.trim().length >= 8 && !isSubmitting

  async function submitFeedback() {
    if (!canSubmit) {
      setError(t("messages.contentRequired"))
      return
    }

    setIsSubmitting(true)
    setError("")

    try {
      const response = await fetch("/api/v1/feedback", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          category,
          severity,
          content,
          rating,
        }),
      })

      if (!response.ok) {
        throw new Error("submit failed")
      }

      const result = (await response.json()) as { data: SubmittedFeedback }
      setSubmitted({
        id: result.data.id,
        status: result.data.status,
      })
      setContent("")
    } catch (caughtError) {
      console.error(caughtError)
      setError(t("messages.submitFailed"))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,0.76fr)_minmax(300px,0.42fr)]">
      <section className="min-w-0 rounded-lg border border-stone bg-white p-5 shadow-soft sm:p-6">
        <div className="flex items-center gap-2 text-sm font-bold text-water">
          <MessageCircle aria-hidden="true" className="h-4 w-4" />
          {t("form.eyebrow")}
        </div>
        <h2 className="mt-3 break-words text-3xl font-extrabold">{t("form.title")}</h2>
        <p className="mt-3 break-words text-sm leading-7 text-ink/68">{t("form.body")}</p>

        <div className="mt-6 grid gap-5">
          <label className="grid gap-2">
            <span className="text-sm font-bold">{t("form.categoryLabel")}</span>
            <select
              className="h-12 rounded-md border border-stone bg-rice px-3 text-sm font-semibold outline-none transition focus:border-ink"
              onChange={(event) => setCategory(event.target.value as FeedbackCategory)}
              value={category}
            >
              {categories.map((item) => (
                <option key={item} value={item}>
                  {t(`categories.${item}`)}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-2">
            <span className="text-sm font-bold">{t("form.severityLabel")}</span>
            <select
              className="h-12 rounded-md border border-stone bg-rice px-3 text-sm font-semibold outline-none transition focus:border-ink"
              onChange={(event) => setSeverity(event.target.value as FeedbackSeverity)}
              value={severity}
            >
              {severities.map((item) => (
                <option key={item} value={item}>
                  {t(`severities.${item}`)}
                </option>
              ))}
            </select>
          </label>

          <div>
            <div className="text-sm font-bold">{t("form.ratingLabel")}</div>
            <div className="mt-2 grid grid-cols-5 gap-2">
              {ratings.map((value) => (
                <button
                  aria-label={t("form.ratingAria", { count: value })}
                  className={
                    rating === value
                      ? "flex h-11 items-center justify-center rounded-md bg-ink text-white"
                      : "flex h-11 items-center justify-center rounded-md border border-stone bg-rice text-ink/66 transition hover:border-ink"
                  }
                  key={value}
                  onClick={() => setRating(value)}
                  type="button"
                >
                  <Star aria-hidden="true" className="h-4 w-4" />
                  <span className="ml-1 text-sm font-bold">{value}</span>
                </button>
              ))}
            </div>
          </div>

          <label className="grid gap-2">
            <span className="text-sm font-bold">{t("form.contentLabel")}</span>
            <textarea
              className="min-h-[168px] resize-none rounded-md border border-stone bg-rice p-3 text-sm leading-7 outline-none transition focus:border-ink"
              maxLength={500}
              onChange={(event) => {
                setContent(event.target.value)
                setSubmitted(null)
                setError("")
              }}
              placeholder={t("form.contentPlaceholder")}
              value={content}
            />
            <span className="text-xs font-semibold text-ink/48">{t("form.remaining", { count: remaining })}</span>
          </label>

          {error ? <p className="rounded-md bg-lychee/10 p-3 text-sm font-semibold text-lychee">{error}</p> : null}

          <button
            className={
              canSubmit
                ? "flex h-12 w-full items-center justify-center gap-2 rounded-full bg-ink px-5 text-sm font-bold text-white transition hover:bg-moss"
                : "flex h-12 w-full items-center justify-center gap-2 rounded-full bg-ink/20 px-5 text-sm font-bold text-ink/46"
            }
            disabled={!canSubmit}
            onClick={submitFeedback}
            type="button"
          >
            <SendHorizontal aria-hidden="true" className="h-4 w-4" />
            {isSubmitting ? t("form.submitting") : t("form.submit")}
          </button>
        </div>
      </section>

      <aside className="min-w-0 rounded-lg border border-stone bg-ink p-5 text-white shadow-soft lg:sticky lg:top-20 lg:self-start">
        <h2 className="break-words text-2xl font-extrabold">{t("result.title")}</h2>
        <p className="mt-3 break-words text-sm leading-7 text-white/70">{t("result.body")}</p>

        {submitted ? (
          <div className="mt-5 rounded-lg border border-white/12 bg-white/8 p-4">
            <div className="flex items-center gap-2 text-sm font-extrabold text-[#b9d9c3]">
              <CheckCircle2 aria-hidden="true" className="h-4 w-4" />
              {t("result.success")}
            </div>
            <div className="mt-4 grid gap-3 text-sm">
              <div className="rounded-md bg-white p-3 text-ink">
                <div className="font-bold">{t("result.ticketId")}</div>
                <div className="mt-1 break-words text-ink/64">{submitted.id}</div>
              </div>
              <div className="rounded-md bg-white p-3 text-ink">
                <div className="font-bold">{t("result.status")}</div>
                <div className="mt-1 text-ink/64">{t(`statuses.${submitted.status}`)}</div>
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-5 rounded-lg border border-white/12 bg-white/8 p-4 text-sm leading-7 text-white/72">
            {t("result.empty")}
          </div>
        )}
      </aside>
    </div>
  )
}
