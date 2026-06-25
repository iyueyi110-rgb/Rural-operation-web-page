"use client"

import { CheckCircle2, CircleAlert, PackageCheck, Store } from "lucide-react"
import { useTranslations } from "next-intl"
import { useEffect, useMemo, useState } from "react"

import { EmptyState, FieldLabel, InlineNotice, PanelTitle, SurfacePanel } from "@web/components/subpage-ui"
import { MasterDetailLayout } from "@ui/index"

interface Product {
  id: string
  name: string
  category: string
  description: string
  price: number | null
  unit: string | null
  stockStatus: string
  nodeId: string | null
}

interface ProductOrder {
  id: string
  status: string
  productName: string
  quantity: number
  totalAmount: number
}

export function ProductFlow() {
  const t = useTranslations("products")
  const [products, setProducts] = useState<Product[]>([])
  const [selectedId, setSelectedId] = useState("")
  const [quantity, setQuantity] = useState(1)
  const [guestName, setGuestName] = useState("")
  const [guestPhone, setGuestPhone] = useState("")
  const [order, setOrder] = useState<ProductOrder | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    async function loadProducts() {
      try {
        const response = await fetch("/api/v1/products")
        if (!response.ok) throw new Error("products unavailable")
        const payload = (await response.json()) as { data?: Product[] }
        const nextProducts = payload.data ?? []
        setProducts(nextProducts)
        setSelectedId(nextProducts[0]?.id ?? "")
      } catch (caughtError) {
        console.error("Product load failed:", caughtError)
        setError(t("messages.loadFailed"))
      } finally {
        setIsLoading(false)
      }
    }

    void loadProducts()
  }, [t])

  const selectedProduct = useMemo(
    () => products.find((product) => product.id === selectedId) ?? products[0],
    [products, selectedId],
  )
  const totalAmount = selectedProduct?.price == null ? 0 : selectedProduct.price * quantity

  async function submitOrder() {
    if (!selectedProduct || isSubmitting) return
    if (!guestName.trim() || !guestPhone.trim()) {
      setError(t("messages.contactRequired"))
      return
    }

    setIsSubmitting(true)
    setError("")

    try {
      const response = await fetch("/api/v1/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderType: "product_order",
          productId: selectedProduct.id,
          productName: selectedProduct.name,
          quantity,
          totalAmount,
          status: "pending_offline",
          nodeId: selectedProduct.nodeId,
          metadata: {
            guestName: guestName.trim(),
            guestPhone: guestPhone.trim(),
          },
        }),
      })

      if (!response.ok) throw new Error("product order failed")
      const payload = (await response.json()) as { data: ProductOrder }
      setOrder(payload.data)
    } catch (caughtError) {
      console.error("Product order failed:", caughtError)
      setError(t("messages.submitFailed"))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <MasterDetailLayout
      master={
        <>
          <PanelTitle icon={<Store aria-hidden="true" className="h-4 w-4" />}>{t("list.eyebrow")}</PanelTitle>
          <h2 className="mt-3 break-words text-3xl font-extrabold">{t("list.title")}</h2>
          <p className="mt-3 break-words text-sm leading-7 text-ink/68">{t("list.body")}</p>

          <div className="mt-6 grid gap-4">
            {isLoading ? <SurfacePanel>{t("messages.loading")}</SurfacePanel> : null}
            {!isLoading && products.length === 0 ? <EmptyState title={t("messages.loadFailed")} /> : null}
            {products.map((product) => {
              const active = product.id === selectedProduct?.id

              return (
                <article className={active ? "choice-card choice-card-active" : "choice-card"} key={product.id}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-bold text-water">{product.category}</div>
                      <h3 className="mt-3 break-words text-2xl font-extrabold">{product.name}</h3>
                    </div>
                    <div className="rounded-md bg-rice px-3 py-2 text-right">
                      <div className="text-lg font-extrabold text-lychee">{formatPrice(product, t("list.negotiable"))}</div>
                      <div className="text-xs text-ink/52">{product.stockStatus}</div>
                    </div>
                  </div>
                  <p className="mt-3 break-words text-sm leading-7 text-ink/66">{product.description}</p>
                    <button className={active ? "btn-primary mt-5 h-10 px-5" : "btn-secondary mt-5 h-10 px-5"} onClick={() => { setSelectedId(product.id); setOrder(null); setError("") }} type="button">
                    {active ? t("list.selected") : t("list.select")}
                  </button>
                </article>
              )
            })}
          </div>
        </>
      }
      detail={
        <>
          <PanelTitle icon={<PackageCheck aria-hidden="true" className="h-4 w-4" />} tone="lychee">{t("form.eyebrow")}</PanelTitle>
          <h2 className="mt-3 break-words text-2xl font-extrabold">{t("form.title")}</h2>

          <div className="mt-5 grid gap-4">
            <FieldLabel label={t("form.nameLabel")}>
              <input className="input-control" onChange={(event) => setGuestName(event.target.value)} value={guestName} />
            </FieldLabel>
            <FieldLabel label={t("form.phoneLabel")}>
              <input className="input-control" onChange={(event) => setGuestPhone(event.target.value)} value={guestPhone} />
            </FieldLabel>
            <FieldLabel label={t("form.quantityLabel")}>
              <select className="select-control" onChange={(event) => setQuantity(Number(event.target.value))} value={quantity}>
                {[1, 2, 3, 4, 5, 8, 10].map((count) => <option key={count} value={count}>{t("form.quantityValue", { count })}</option>)}
              </select>
            </FieldLabel>
          </div>

          <div className="mt-5 rounded-md bg-rice p-4">
            <div className="text-sm font-bold">{t("summary.title")}</div>
            <dl className="mt-4 grid gap-3 text-sm">
              <SummaryLine label={t("summary.product")} value={selectedProduct?.name ?? "-"} />
              <SummaryLine label={t("summary.quantity")} value={t("form.quantityValue", { count: quantity })} />
              <SummaryLine label={t("summary.amount")} value={selectedProduct?.price == null ? t("list.negotiable") : `¥${totalAmount}`} />
            </dl>
          </div>

          <div className="mt-5 rounded-md border border-stone p-4">
            <div className="flex items-center gap-2 text-sm font-bold">
              <CircleAlert aria-hidden="true" className="h-4 w-4 text-water" />
              {t("notice.title")}
            </div>
            <p className="mt-2 break-words text-sm leading-6 text-ink/66">{t("notice.body")}</p>
          </div>

          {error ? <InlineNotice className="mt-4" tone="danger">{error}</InlineNotice> : null}

          <button className="btn-primary mt-5 w-full bg-ink hover:bg-moss" disabled={isSubmitting || !selectedProduct} onClick={submitOrder} type="button">
            {isSubmitting ? t("form.submitting") : t("form.confirm")}
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
            </div>
          ) : null}
        </>
      }
    />
  )
}

function SummaryLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-ink/58">{label}</dt>
      <dd className="text-right font-semibold">{value}</dd>
    </div>
  )
}

function formatPrice(product: Product, fallback: string) {
  if (product.price == null) return fallback
  return `¥${product.price}${product.unit ? `/${product.unit}` : ""}`
}
