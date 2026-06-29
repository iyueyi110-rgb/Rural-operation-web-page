"use client"

import { KeyRound, Smartphone } from "lucide-react"
import { useRouter } from "next/navigation"
import { useLocale, useTranslations } from "next-intl"
import { useState } from "react"

import { saveVillagerToken } from "@web/lib/villager-auth-client"
import { FieldLabel, InlineNotice, PanelTitle, SurfacePanel } from "@web/components/subpage-ui"

export function VillagerLoginClient() {
  const t = useTranslations("villagerSystem")
  const locale = useLocale()
  const router = useRouter()
  const [phone, setPhone] = useState("")
  const [otp, setOtp] = useState("")
  const [developmentOtp, setDevelopmentOtp] = useState("")
  const [busy, setBusy] = useState<"request" | "verify" | null>(null)
  const [error, setError] = useState("")

  async function requestOtp() {
    setBusy("request")
    setError("")
    try {
      const response = await fetch("/api/v1/villager-auth/request-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: normalizedPhone }),
      })
      const result = (await response.json()) as {
        demoMode?: boolean
        error?: string
        otp?: string
      }
      if (!response.ok) throw new Error(result.error)
      setDevelopmentOtp(result.otp ?? "")
      if (result.demoMode && result.otp) {
        setOtp(result.otp)
      }
    } catch {
      setError(t("login.requestError"))
    } finally {
      setBusy(null)
    }
  }

  async function verifyOtp() {
    setBusy("verify")
    setError("")
    try {
      const response = await fetch("/api/v1/villager-auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: normalizedPhone, otp: otp.trim() }),
      })
      const result = (await response.json()) as { token?: string }
      if (!response.ok || !result.token) throw new Error("invalid otp")
      saveVillagerToken(result.token)
      router.replace(`/${locale}/villager/dashboard`)
    } catch {
      setError(t("login.verifyError"))
    } finally {
      setBusy(null)
    }
  }

  const normalizedPhone = phone.replace(/\D/g, "")
  const validPhone = /^1[3-9]\d{9}$/.test(normalizedPhone)

  return (
    <main className="grid min-h-screen place-items-center bg-[linear-gradient(135deg,#f5f0e6_0%,#e8dfcf_52%,#f8f5ee_100%)] p-5 text-ink">
      <SurfacePanel className="w-full max-w-md sm:p-8">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-moss/10 text-moss">
          <KeyRound aria-hidden="true" className="h-6 w-6" />
        </div>
        <div className="mt-5">
          <PanelTitle tone="moss">{t("login.eyebrow")}</PanelTitle>
        </div>
        <h1 className="mt-2 text-3xl font-extrabold">{t("login.title")}</h1>
        <p className="mt-3 text-sm leading-7 text-ink/62">{t("login.body")}</p>

        <FieldLabel className="mt-6" label={t("login.phone")}>
          <div className="flex rounded-md border border-stone bg-rice focus-within:border-water">
            <Smartphone aria-hidden="true" className="ml-3 mt-3.5 h-5 w-5 text-ink/40" />
            <input
              className="h-12 min-w-0 flex-1 bg-transparent px-3 outline-none"
              inputMode="tel"
              onChange={(event) => setPhone(event.target.value)}
              placeholder={t("login.phonePlaceholder")}
              value={phone}
            />
          </div>
        </FieldLabel>
        <button
          className="mt-3 h-11 w-full rounded-full border border-ink px-5 text-sm font-bold disabled:opacity-40"
          disabled={!validPhone || busy !== null}
          onClick={requestOtp}
          type="button"
        >
          {busy === "request" ? t("login.requesting") : t("login.request")}
        </button>

        {developmentOtp ? (
          <InlineNotice className="mt-4" tone="info">
            {t("login.developmentOtp", { otp: developmentOtp })}
          </InlineNotice>
        ) : null}

        <FieldLabel className="mt-5" label={t("login.otp")}>
          <input
            className="input-control tracking-[0.35em]"
            inputMode="numeric"
            maxLength={6}
            onChange={(event) => setOtp(event.target.value)}
            placeholder={t("login.otpPlaceholder")}
            value={otp}
          />
        </FieldLabel>
        {error ? <InlineNotice className="mt-4" tone="danger">{error}</InlineNotice> : null}
        <button
          className="mt-5 h-12 w-full rounded-full bg-ink px-5 text-sm font-bold text-white disabled:opacity-40"
          disabled={!validPhone || otp.trim().length !== 6 || busy !== null}
          onClick={verifyOtp}
          type="button"
        >
          {busy === "verify" ? t("login.verifying") : t("login.verify")}
        </button>
      </SurfacePanel>
    </main>
  )
}
