"use client"

import Image from "next/image"
import Link from "next/link"
import { BadgeCheck, CalendarDays, CheckCircle2, CreditCard, FileText, Leaf, MapPin, ShieldCheck, Sprout } from "lucide-react"
import { useLocale, useTranslations } from "next-intl"
import { useMemo, useState } from "react"

import {
  adoptionPlanOptions,
  orchardTreeOptions,
  type AdoptionPlan,
  type OrchardTreeOption,
  type TreeAvailability,
} from "@web/lib/trees-data"
import { MasterDetailLayout } from "@ui/index"
import { fetchWithAuth, rememberTouristIdentity } from "@web/lib/auth-client"

const availabilityTone: Record<TreeAvailability, string> = {
  available: "bg-moss/12 text-moss border-moss/20",
  limited: "bg-lychee/10 text-lychee border-lychee/20",
  maintenance: "bg-water/10 text-water border-water/20",
}

interface TreeAdoptionOrder {
  id: string
  status: "pending_payment"
  createdAt: string
}

export function AdoptionFlow() {
  const t = useTranslations("trees")
  const systemT = useTranslations("villagerSystem")
  const locale = useLocale()
  const [selectedTreeId, setSelectedTreeId] = useState(orchardTreeOptions[0].id)
  const [selectedPlan, setSelectedPlan] = useState<AdoptionPlan>("seasonal")
  const [agreementAccepted, setAgreementAccepted] = useState(false)
  const [phone, setPhone] = useState("")
  const [order, setOrder] = useState<TreeAdoptionOrder | null>(null)
  const [submitError, setSubmitError] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const selectedTree = useMemo(
    () => orchardTreeOptions.find((tree) => tree.id === selectedTreeId) ?? orchardTreeOptions[0],
    [selectedTreeId],
  )
  const canConfirm = agreementAccepted && selectedTree.availability !== "maintenance" && /^1[3-9]\d{9}$/.test(phone.trim())

  function selectTree(tree: OrchardTreeOption) {
    setSelectedTreeId(tree.id)
    setAgreementAccepted(false)
    setOrder(null)
    setSubmitError(false)
  }

  async function handleConfirm() {
    if (!canConfirm || isSubmitting) {
      return
    }

    setIsSubmitting(true)
    setSubmitError(false)

    try {
      const response = await fetchWithAuth("/api/v1/tree-adoptions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          treeId: selectedTree.id,
          plan: selectedPlan,
          adopterPhone: phone.trim(),
        }),
      })

      if (!response.ok) {
        throw new Error("tree adoption request failed")
      }

      const result = (await response.json()) as { data: TreeAdoptionOrder }
      setOrder(result.data)
      rememberTouristIdentity(phone)
    } catch (caughtError) {
      console.error("Tree adoption failed:", caughtError)
      setOrder(null)
      setSubmitError(true)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <MasterDetailLayout
      className="lg:grid-cols-[minmax(0,0.95fr)_minmax(320px,0.65fr)]"
      master={
        <>
          <div className="flex items-center gap-2 text-sm font-bold text-water">
            <Sprout aria-hidden="true" className="h-4 w-4" />
            {t("list.eyebrow")}
          </div>
          <h2 className="mt-3 break-words text-3xl font-extrabold">{t("list.title")}</h2>
          <p className="mt-3 break-words text-sm leading-7 text-ink/68">{t("list.body")}</p>

          <div className="mt-6 grid gap-4">
            {orchardTreeOptions.map((tree) => {
              const active = tree.id === selectedTree.id

              return (
                <article
                  className={
                    active
                      ? "grid overflow-hidden rounded-lg border-2 border-ink bg-white shadow-soft md:grid-cols-[220px_1fr]"
                      : "grid overflow-hidden rounded-lg border border-stone bg-white shadow-soft md:grid-cols-[220px_1fr]"
                  }
                  key={tree.id}
                >
                  <div className="relative aspect-[4/3] md:aspect-auto">
                    <Image alt={t(tree.imageAltKey)} className="object-cover" fill sizes="(min-width: 768px) 220px, 100vw" src={tree.imageAsset} />
                  </div>
                  <div className="min-w-0 p-5">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="break-words text-xl font-extrabold">{t(tree.nameKey)}</h3>
                        <p className="mt-1 text-sm font-semibold text-ink/58">{tree.treeCode}</p>
                      </div>
                      <span className={`rounded-full border px-3 py-1 text-xs font-bold ${availabilityTone[tree.availability]}`}>
                        {t(`availability.${tree.availability}`)}
                      </span>
                    </div>
                    <p className="mt-3 break-words text-sm leading-6 text-ink/68">{t(tree.summaryKey)}</p>

                    <div className="mt-4 grid gap-3 sm:grid-cols-3">
                      <div className="rounded-md bg-rice p-3">
                        <div className="text-lg font-extrabold">{t(tree.species)}</div>
                        <div className="text-xs text-ink/58">{t("list.species")}</div>
                      </div>
                      <div className="rounded-md bg-rice p-3">
                        <div className="text-lg font-extrabold">{t("list.ageValue", { count: tree.age })}</div>
                        <div className="text-xs text-ink/58">{t("list.age")}</div>
                      </div>
                      <div className="rounded-md bg-rice p-3">
                        <div className="text-lg font-extrabold">{t(`health.${tree.healthStatus}`)}</div>
                        <div className="text-xs text-ink/58">{t("list.health")}</div>
                      </div>
                    </div>

                    <div className="mt-4 flex items-start gap-2 rounded-md border border-stone p-3 text-sm text-ink/68">
                      <MapPin aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-water" />
                      <span>{t(tree.blurredLocation)}</span>
                    </div>

                    <button
                      className={active ? "mt-5 h-10 rounded-full bg-ink px-5 text-sm font-bold text-white" : "mt-5 h-10 rounded-full border border-stone px-5 text-sm font-bold text-ink transition hover:border-ink"}
                      onClick={() => selectTree(tree)}
                      type="button"
                    >
                      {active ? t("list.selected") : t("list.select")}
                    </button>
                    <Link
                      className="ml-2 inline-flex h-10 items-center rounded-full border border-stone px-5 text-sm font-bold text-ink transition hover:border-ink"
                      href={`/${locale}/trees/${tree.id}`}
                    >
                      {t("profile.eyebrow")}
                    </Link>
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
            <Leaf aria-hidden="true" className="h-4 w-4" />
            {t("profile.eyebrow")}
          </div>
          <h2 className="mt-3 break-words text-2xl font-extrabold">{t(selectedTree.nameKey)}</h2>
          <p className="mt-2 text-sm text-ink/58">{selectedTree.treeCode}</p>

          <div className="mt-5 rounded-md bg-rice p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm font-bold">{t("profile.planTitle")}</div>
              <span className={`rounded-full border px-3 py-1 text-xs font-bold ${availabilityTone[selectedTree.availability]}`}>
                {t(`availability.${selectedTree.availability}`)}
              </span>
            </div>
            <div className="mt-3 grid gap-2">
              {adoptionPlanOptions.map((plan) => (
                <button
                  className={selectedPlan === plan.value ? "rounded-md border-2 border-ink bg-white p-3 text-left" : "rounded-md border border-stone bg-white/70 p-3 text-left transition hover:border-ink"}
                  key={plan.value}
                  onClick={() => {
                    setSelectedPlan(plan.value)
                    setOrder(null)
                    setSubmitError(false)
                  }}
                  type="button"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-extrabold">{t(plan.labelKey)}</span>
                    <span className="text-sm font-extrabold text-lychee">{t(selectedTree.planPriceKeys[plan.value])}</span>
                  </div>
                  <p className="mt-1 text-xs leading-5 text-ink/58">{t(plan.bodyKey)}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4 rounded-md border border-stone p-4">
            <div className="flex items-center gap-2 text-sm font-bold">
              <BadgeCheck aria-hidden="true" className="h-4 w-4 text-moss" />
              {t("rights.title")}
            </div>
            <ul className="mt-3 grid gap-2 text-sm leading-6 text-ink/70">
              {selectedTree.rights.map((right) => (
                <li className="flex gap-2" key={right}>
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-moss" />
                  <span>{t(right)}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-4 rounded-md border border-stone p-4">
            <div className="flex items-center gap-2 text-sm font-bold">
              <CalendarDays aria-hidden="true" className="h-4 w-4 text-water" />
              {t("timeline.title")}
            </div>
            <div className="mt-4 grid gap-3">
              {selectedTree.timeline.map((item) => (
                <div className="border-l-2 border-stone pl-4" key={item.titleKey}>
                  <div className="text-xs font-bold text-lychee">{t(item.dateKey)}</div>
                  <div className="mt-1 text-sm font-extrabold">{t(item.titleKey)}</div>
                  <p className="mt-1 text-sm leading-6 text-ink/62">{t(item.bodyKey)}</p>
                </div>
              ))}
            </div>
          </div>

          <label className="mt-4 grid gap-2 text-sm font-semibold">
            {systemT("touristIdentity.phone")}
            <input className="h-12 rounded-md border border-stone bg-rice px-3 outline-none focus:border-water" inputMode="tel" onChange={(event) => setPhone(event.target.value)} placeholder={systemT("touristIdentity.phonePlaceholder")} value={phone} />
          </label>

          <label className="mt-4 flex items-start gap-3 rounded-md bg-ink p-4 text-white">
            <input
              checked={agreementAccepted}
              className="mt-1 h-4 w-4 shrink-0 accent-[#b93835]"
              onChange={(event) => {
                setAgreementAccepted(event.target.checked)
                setOrder(null)
                setSubmitError(false)
              }}
              type="checkbox"
            />
            <span className="min-w-0">
              <span className="flex items-center gap-2 text-sm font-bold">
                <FileText aria-hidden="true" className="h-4 w-4" />
                {t("agreement.title")}
              </span>
              <span className="mt-2 block break-words text-sm leading-6 text-white/72">{t("agreement.body")}</span>
            </span>
          </label>

          {selectedTree.availability === "maintenance" ? (
            <p className="mt-4 rounded-md bg-lychee/10 p-3 text-sm font-semibold text-lychee">{t("messages.unavailable")}</p>
          ) : null}
          {!agreementAccepted ? (
            <p className="mt-4 rounded-md bg-rice p-3 text-sm font-semibold text-ink/68">{t("messages.needAgreement")}</p>
          ) : null}
          {submitError ? (
            <p className="mt-4 rounded-md bg-lychee/10 p-3 text-sm font-semibold text-lychee">{t("messages.submitFailed")}</p>
          ) : null}

          <button
            className={canConfirm && !isSubmitting ? "mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-full bg-ink px-5 text-sm font-bold text-white transition hover:bg-moss" : "mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-full bg-ink/20 px-5 text-sm font-bold text-ink/46"}
            disabled={!canConfirm || isSubmitting}
            onClick={handleConfirm}
            type="button"
          >
            <ShieldCheck aria-hidden="true" className="h-4 w-4" />
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
                <div className="mt-1 text-ink/62">{t("order.paymentStatus")}</div>
                <div className="mt-2 font-semibold">{t("order.idLabel")}: {order.id}</div>
                <div className="mt-1 text-ink/62">{t("order.createdAtLabel")}: {new Date(order.createdAt).toLocaleString()}</div>
              </div>
              <button className="mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-full border border-stone bg-white px-4 text-sm font-bold text-ink/70" disabled type="button">
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
