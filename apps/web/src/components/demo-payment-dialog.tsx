"use client"

import { CreditCard, ShieldAlert, X } from "lucide-react"
import { useState } from "react"

import { fetchWithAuth } from "@web/lib/auth-client"

interface DemoPaymentDialogProps {
  orderId: string
  orderType: string
  amount: number
  orderTitle: string
  onPaid?: () => void
}

interface PrepareResponse {
  data?: {
    paymentOrderId: string
    hint: string
  }
}

export function DemoPaymentDialog({
  orderId,
  orderType,
  amount,
  orderTitle,
  onPaid,
}: DemoPaymentDialogProps) {
  const [open, setOpen] = useState(false)
  const [paymentOrderId, setPaymentOrderId] = useState("")
  const [busy, setBusy] = useState<"prepare" | "confirm" | null>(null)
  const [paid, setPaid] = useState(false)
  const [error, setError] = useState("")

  async function preparePayment() {
    setBusy("prepare")
    setError("")
    try {
      const response = await fetchWithAuth("/api/v1/payments/prepare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderType,
          orderId,
          amount,
          channel: "mock_demo",
        }),
      })
      const result = (await response.json()) as PrepareResponse
      if (!response.ok || !result.data?.paymentOrderId) {
        throw new Error("payment prepare failed")
      }
      setPaymentOrderId(result.data.paymentOrderId)
      setOpen(true)
    } catch {
      setError("演示支付初始化失败，请稍后重试。")
    } finally {
      setBusy(null)
    }
  }

  async function confirmPayment() {
    if (!paymentOrderId) return
    setBusy("confirm")
    setError("")
    try {
      const response = await fetchWithAuth("/api/v1/payments/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentOrderId }),
      })
      if (!response.ok) throw new Error("payment confirm failed")
      setPaid(true)
      onPaid?.()
    } catch {
      setError("演示支付确认失败，请稍后重试。")
    } finally {
      setBusy(null)
    }
  }

  return (
    <>
      <button
        className="mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-full border border-ink bg-white px-4 text-sm font-bold text-ink transition hover:bg-rice disabled:cursor-not-allowed disabled:opacity-50"
        disabled={busy !== null || paid}
        onClick={preparePayment}
        type="button"
      >
        <CreditCard aria-hidden="true" className="h-4 w-4" />
        {paid ? "已完成演示支付" : busy === "prepare" ? "正在进入演示支付" : "进入支付（演示模式）"}
      </button>
      {error && !open ? (
        <p className="mt-2 text-xs font-semibold text-[#b93835]">{error}</p>
      ) : null}

      {open ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-ink/45 p-4">
          <div className="w-full max-w-md rounded-lg bg-white p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-sm font-extrabold text-ink">演示支付确认</div>
                <h2 className="mt-2 break-words text-2xl font-extrabold text-ink">{orderTitle}</h2>
              </div>
              <button
                aria-label="关闭"
                className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-line text-ink/70"
                onClick={() => setOpen(false)}
                type="button"
              >
                <X aria-hidden="true" className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-5 rounded-md border border-[#f0c36a] bg-[#fff5d6] p-4 text-sm leading-6 text-[#6c4b00]">
              <div className="flex items-center gap-2 font-extrabold">
                <ShieldAlert aria-hidden="true" className="h-4 w-4" />
                演示模式：支付功能为模拟演示，不会产生真实交易
              </div>
              <p className="mt-1">点击确认支付即可模拟支付成功，并同步更新订单状态。</p>
            </div>

            <dl className="mt-5 grid gap-3 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-ink/58">支付金额</dt>
                <dd className="font-extrabold text-lychee">¥{amount.toFixed(2)}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-ink/58">订单编号</dt>
                <dd className="max-w-[220px] truncate font-semibold">{orderId}</dd>
              </div>
            </dl>

            {error ? <p className="mt-4 text-sm font-semibold text-[#b93835]">{error}</p> : null}
            {paid ? (
              <p className="mt-4 rounded-md bg-moss/10 p-3 text-sm font-bold text-moss">
                演示支付已完成，订单状态已更新。
              </p>
            ) : null}
            <button
              className="mt-5 h-12 w-full rounded-full bg-ink px-5 text-sm font-extrabold text-white disabled:opacity-45"
              disabled={busy !== null || paid}
              onClick={confirmPayment}
              type="button"
            >
              {busy === "confirm" ? "正在确认" : "确认支付（演示模式）"}
            </button>
          </div>
        </div>
      ) : null}
    </>
  )
}
