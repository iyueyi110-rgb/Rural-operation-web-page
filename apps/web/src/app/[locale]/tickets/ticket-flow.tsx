"use client"

import { CalendarDays, CheckCircle2, CircleAlert, CreditCard, Ticket } from "lucide-react"
import { useTranslations } from "next-intl"
import { useMemo, useState } from "react"

import {
  quantityOptions,
  ticketDateOptions,
  ticketProducts,
} from "@web/lib/tickets-data"
import { MasterDetailLayout } from "@ui/index"

type TicketProduct = (typeof ticketProducts)[number]
type TicketProductId = TicketProduct["id"]
type TicketDate = (typeof ticketDateOptions)[number]["value"]

interface TicketOrder {
  id: string
  status: "pending_payment"
  productId: string
  date: string
  quantity: number
  createdAt: string
}

export function TicketFlow() {
  const t = useTranslations("tickets")
  const [selectedProductId, setSelectedProductId] = useState<TicketProductId>(ticketProducts[0].id)
  const [selectedDate, setSelectedDate] = useState<TicketDate>(ticketDateOptions[0].value)
  const [quantity, setQuantity] = useState<(typeof quantityOptions)[number]>(2)
  const [order, setOrder] = useState<TicketOrder | null>(null)
  const [submitError, setSubmitError] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const selectedProduct = useMemo(
    () => ticketProducts.find((product) => product.id === selectedProductId) ?? ticketProducts[0],
    [selectedProductId],
  )
  const selectedDateOption =
    ticketDateOptions.find((dateOption) => dateOption.value === selectedDate) ?? ticketDateOptions[0]

  function selectProduct(product: TicketProduct) {
    setSelectedProductId(product.id)
    setOrder(null)
    setSubmitError(false)
  }

  async function handleConfirm() {
    if (isSubmitting) {
      return
    }

    setIsSubmitting(true)
    setSubmitError(false)

    try {
      const response = await fetch("/api/v1/ticket-orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          productId: selectedProduct.id,
          date: selectedDate,
          quantity,
        }),
      })

      if (!response.ok) {
        throw new Error("ticket preorder request failed")
      }

      const result = (await response.json()) as { data: TicketOrder }
      setOrder(result.data)
    } catch (caughtError) {
      console.error("Ticket preorder failed:", caughtError)
      setOrder(null)
      setSubmitError(true)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <MasterDetailLayout
      master={
        <>
          <div className="flex items-center gap-2 text-sm font-bold text-water">
            <Ticket aria-hidden="true" className="h-4 w-4" />
            {t("list.eyebrow")}
          </div>
          <h2 className="mt-3 break-all text-3xl font-extrabold">{t("list.title")}</h2>
          <p className="mt-3 break-all text-sm leading-7 text-ink/68">{t("list.body")}</p>

          <div className="mt-6 grid gap-4">
            {ticketProducts.map((product) => {
              const active = product.id === selectedProduct.id

              return (
                <article
                  className={
                    active
                      ? "rounded-lg border-2 border-ink bg-white p-5 shadow-soft"
                      : "rounded-lg border border-stone bg-white p-5 shadow-soft"
                  }
                  key={product.id}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-xs font-bold uppercase tracking-[0.16em] text-water">
                        {t(product.sceneKey)}
                      </div>
                      <h3 className="mt-3 break-all text-2xl font-extrabold">{t(product.nameKey)}</h3>
                    </div>
                    <div className="rounded-md bg-rice px-3 py-2 text-right">
                      <div className="text-lg font-extrabold text-lychee">{t(product.priceKey)}</div>
                      <div className="text-xs text-ink/52">{t("card.price")}</div>
                    </div>
                  </div>

                  <p className="mt-3 break-all text-sm leading-7 text-ink/66">{t(product.summaryKey)}</p>

                  <div className="mt-5 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-center">
                    <div className="rounded-md bg-rice p-3">
                      <div className="text-sm font-bold">{t(product.stockKey)}</div>
                      <div className="mt-1 text-xs text-ink/52">{t("card.stock")}</div>
                    </div>
                    <button
                      className={
                        active
                          ? "h-10 rounded-full bg-ink px-5 text-sm font-bold text-white"
                          : "h-10 rounded-full border border-stone px-5 text-sm font-bold text-ink transition hover:border-ink"
                      }
                      onClick={() => selectProduct(product)}
                      type="button"
                    >
                      {active ? t("list.selected") : t("list.select")}
                    </button>
                  </div>
                </article>
              )
            })}
          </div>
        </>
      }
      detail={
        <>
          <div className="flex items-center gap-2 text-sm font-bold text-lychee">
            <CalendarDays aria-hidden="true" className="h-4 w-4" />
            {t("form.eyebrow")}
          </div>
          <h2 className="mt-3 break-all text-2xl font-extrabold">{t("form.title")}</h2>

          <div className="mt-5 grid gap-4">
            <label className="grid gap-2 text-sm font-semibold">
              {t("form.dateLabel")}
              <select
                className="h-12 w-full rounded-md border border-stone bg-rice px-3 text-sm outline-none transition focus:border-water"
                onChange={(event) => {
                  setSelectedDate(event.target.value as TicketDate)
                  setOrder(null)
                  setSubmitError(false)
                }}
                value={selectedDate}
              >
                {ticketDateOptions.map((dateOption) => (
                  <option key={dateOption.value} value={dateOption.value}>
                    {t(dateOption.labelKey)}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-2 text-sm font-semibold">
              {t("form.quantityLabel")}
              <select
                className="h-12 w-full rounded-md border border-stone bg-rice px-3 text-sm outline-none transition focus:border-water"
                onChange={(event) => {
                  setQuantity(Number(event.target.value) as (typeof quantityOptions)[number])
                  setOrder(null)
                  setSubmitError(false)
                }}
                value={quantity}
              >
                {quantityOptions.map((option) => (
                  <option key={option} value={option}>
                    {t("form.quantityValue", { count: option })}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="mt-5 rounded-md bg-rice p-4">
            <div className="text-sm font-bold">{t("summary.title")}</div>
            <dl className="mt-4 grid gap-3 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-ink/58">{t("summary.product")}</dt>
                <dd className="text-right font-semibold">{t(selectedProduct.nameKey)}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-ink/58">{t("summary.date")}</dt>
                <dd className="text-right font-semibold">{t(selectedDateOption.labelKey)}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-ink/58">{t("summary.quantity")}</dt>
                <dd className="text-right font-semibold">{t("form.quantityValue", { count: quantity })}</dd>
              </div>
            </dl>
          </div>

          <div className="mt-5 rounded-md border border-stone p-4">
            <div className="flex items-center gap-2 text-sm font-bold">
              <CircleAlert aria-hidden="true" className="h-4 w-4 text-water" />
              {t("notice.title")}
            </div>
            <p className="mt-2 break-all text-sm leading-6 text-ink/66">{t("notice.body")}</p>
          </div>

          {submitError ? (
            <p className="mt-4 rounded-md bg-lychee/10 p-3 text-sm font-semibold text-lychee">
              {t("messages.submitFailed")}
            </p>
          ) : null}

          <button
            className={
              !isSubmitting
                ? "mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-full bg-ink px-5 text-sm font-bold text-white transition hover:bg-moss"
                : "mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-full bg-ink/20 px-5 text-sm font-bold text-ink/46"
            }
            disabled={isSubmitting}
            onClick={handleConfirm}
            type="button"
          >
            <Ticket aria-hidden="true" className="h-4 w-4" />
            {isSubmitting ? t("form.confirming") : t("form.confirm")}
          </button>

          {order ? (
            <div className="mt-5 rounded-lg border border-moss/20 bg-moss/10 p-4">
              <div className="flex items-center gap-2 text-sm font-extrabold text-moss">
                <CheckCircle2 aria-hidden="true" className="h-4 w-4" />
                {t("order.title")}
              </div>
              <p className="mt-2 text-sm leading-6 text-ink/70">{t("order.body")}</p>
              <div className="mt-4 rounded-md bg-white p-3 text-sm">
                <div className="font-bold">{t("order.status")}</div>
                <div className="mt-2 font-semibold">{t("order.idLabel")}: {order.id}</div>
              </div>
              <button
                className="mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-full border border-stone bg-white px-4 text-sm font-bold text-ink/70"
                disabled
                type="button"
              >
                <CreditCard aria-hidden="true" className="h-4 w-4" />
                {t("order.paymentEntry")}
              </button>
            </div>
          ) : null}
        </>
      }
    />
  )
}
