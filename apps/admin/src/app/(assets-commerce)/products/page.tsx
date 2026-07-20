"use client"

import { PackagePlus, RefreshCw, Store } from "lucide-react"
import { useEffect, useMemo, useState } from "react"

import {
  AdminDataTable,
  type TableColumn,
} from "@admin/components/admin-data-table"
import { AdminNotice } from "@admin/components/admin-page-shell"
import { AdminStatCard } from "@admin/components/admin-stat-card"
import {
  adminApiBase,
  fetchAdminApi,
  fetchWithTimeout,
  nodeDisplayName,
} from "@admin/lib/admin-api"
import { adminCopy } from "@admin/lib/admin-copy"

interface ProductRow extends Record<string, unknown> {
  id: string
  name: string
  category: string
  description: string
  price: number | null
  unit: string | null
  stockStatus: string
  nodeId: string | null
  status: string
  node?: { slug: string; nameKey: string } | null
}

interface NodeRow {
  id: string
  slug: string
  nameKey: string
}

export default function ProductsPage() {
  const [products, setProducts] = useState<ProductRow[]>([])
  const [nodes, setNodes] = useState<NodeRow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [message, setMessage] = useState("")
  const [isDemo, setIsDemo] = useState(false)
  const [form, setForm] = useState({
    name: "走马荔枝礼盒",
    category: "fresh",
    description: "季节礼盒占位产品，可关联消费节点和线下确认。",
    price: "168",
    unit: "盒",
    stockStatus: "available",
    nodeId: "",
    status: "active",
  })

  async function loadData() {
    setIsLoading(true)
    const [productResponse, nodeResponse] = await Promise.all([
      fetchWithTimeout(`${adminApiBase}/products?includeInactive=true`),
      fetchWithTimeout(`${adminApiBase}/nodes`),
    ])
    const productPayload = (await productResponse.json()) as {
      data?: ProductRow[]
      meta?: { degraded?: boolean; demo?: boolean }
    }
    const nodePayload = (await nodeResponse.json()) as { data?: NodeRow[] }
    setProducts(productPayload.data ?? [])
    setIsDemo(
      productPayload.meta?.degraded === true ||
        productPayload.meta?.demo === true,
    )
    setNodes(nodePayload.data ?? [])
    setIsLoading(false)
  }

  useEffect(() => {
    void loadData()
  }, [])

  async function saveProduct() {
    setMessage("")
    try {
      await fetchAdminApi("/products", {
        method: "POST",
        body: JSON.stringify({
          ...form,
          price: form.price.trim() ? Number(form.price) : null,
          nodeId: form.nodeId || null,
        }),
      })
      setMessage(adminCopy.products.saved)
      await loadData()
    } catch {
      setMessage(adminCopy.products.saveFailed)
    }
  }

  const columns = useMemo<Array<TableColumn<ProductRow>>>(
    () => [
      { key: "name", label: adminCopy.products.name },
      { key: "category", label: adminCopy.products.category },
      {
        key: "price",
        label: adminCopy.products.price,
        render: (value, row) =>
          value == null
            ? adminCopy.products.negotiable
            : `¥${value}/${row.unit ?? ""}`,
      },
      { key: "stockStatus", label: adminCopy.products.stockStatus },
      {
        key: "node",
        label: adminCopy.products.node,
        render: (_value, row) =>
          nodeDisplayName(row.node?.slug, row.node?.nameKey),
      },
      { key: "status", label: adminCopy.products.status },
    ],
    [],
  )

  return (
    <div className="grid gap-5">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-bold text-water">
            {adminCopy.products.subtitle}
          </p>
          <h1 className="mt-1 text-2xl font-extrabold">
            {adminCopy.products.title}
          </h1>
        </div>
        <button
          className="flex h-10 items-center gap-2 rounded-full border border-stone bg-white px-4 text-sm font-bold"
          onClick={loadData}
          type="button"
        >
          <RefreshCw className="h-4 w-4" />
          {adminCopy.common.refresh}
        </button>
      </header>

      {message ? (
        <div className="rounded-md bg-rice p-3 text-sm font-bold text-ink/70">
          {message}
        </div>
      ) : null}
      {isDemo ? (
        <AdminNotice>正式产品数据暂不可用，当前展示降级演示数据。</AdminNotice>
      ) : null}

      <div className="grid gap-3 md:grid-cols-3">
        <AdminStatCard
          icon={<Store className="h-4 w-4" />}
          label={adminCopy.products.title}
          value={isLoading ? "..." : products.length}
        />
        <AdminStatCard
          label={adminCopy.products.status}
          value={
            products.filter((product) => product.status === "active").length
          }
        />
        <AdminStatCard
          label={adminCopy.products.stockStatus}
          value={
            products.filter((product) => product.stockStatus === "available")
              .length
          }
        />
      </div>

      <section className="rounded-lg border border-stone bg-white p-5 shadow-soft">
        <div className="flex items-center gap-2 text-lg font-extrabold">
          <PackagePlus className="h-5 w-5 text-water" />
          {adminCopy.products.create}
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <input
            className="h-10 rounded-md border border-stone bg-rice px-3"
            onChange={(event) => setForm({ ...form, name: event.target.value })}
            placeholder={adminCopy.products.name}
            value={form.name}
          />
          <input
            className="h-10 rounded-md border border-stone bg-rice px-3"
            onChange={(event) =>
              setForm({ ...form, category: event.target.value })
            }
            placeholder={adminCopy.products.category}
            value={form.category}
          />
          <input
            className="h-10 rounded-md border border-stone bg-rice px-3"
            onChange={(event) =>
              setForm({ ...form, price: event.target.value })
            }
            placeholder={adminCopy.products.price}
            value={form.price}
          />
          <input
            className="h-10 rounded-md border border-stone bg-rice px-3"
            onChange={(event) => setForm({ ...form, unit: event.target.value })}
            placeholder={adminCopy.products.unit}
            value={form.unit}
          />
          <input
            className="h-10 rounded-md border border-stone bg-rice px-3"
            onChange={(event) =>
              setForm({ ...form, stockStatus: event.target.value })
            }
            placeholder={adminCopy.products.stockStatus}
            value={form.stockStatus}
          />
          <select
            className="h-10 rounded-md border border-stone bg-rice px-3"
            onChange={(event) =>
              setForm({ ...form, nodeId: event.target.value })
            }
            value={form.nodeId}
          >
            <option value="">{adminCopy.products.node}</option>
            {nodes.map((node) => (
              <option key={node.id} value={node.id}>
                {nodeDisplayName(node.slug, node.nameKey)}
              </option>
            ))}
          </select>
          <select
            className="h-10 rounded-md border border-stone bg-rice px-3"
            onChange={(event) =>
              setForm({ ...form, status: event.target.value })
            }
            value={form.status}
          >
            <option value="active">active</option>
            <option value="hidden">hidden</option>
          </select>
          <textarea
            className="min-h-24 rounded-md border border-stone bg-rice px-3 py-2 md:col-span-2"
            onChange={(event) =>
              setForm({ ...form, description: event.target.value })
            }
            placeholder={adminCopy.products.description}
            value={form.description}
          />
        </div>
        <button
          className="mt-4 h-10 rounded-full bg-ink px-5 text-sm font-bold text-white"
          onClick={saveProduct}
          type="button"
        >
          {adminCopy.products.save}
        </button>
      </section>

      <AdminDataTable
        columns={columns}
        emptyLabel={adminCopy.products.noData}
        isLoading={isLoading}
        rows={products}
      />
    </div>
  )
}
