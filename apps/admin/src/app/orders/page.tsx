"use client"

import { useCallback, useEffect, useMemo, useState } from "react"

import { AdminDataTable, type TableColumn } from "@admin/components/admin-data-table"
import { AdminStatCard } from "@admin/components/admin-stat-card"
import { adminApiBase, nodeDisplayName } from "@admin/lib/admin-api"
import { adminCopy } from "@admin/lib/admin-copy"

interface SpaceNode {
  id: string
  slug: string
  nameKey: string
}

interface OrderRow extends Record<string, unknown> {
  id: string
  orderType: keyof typeof adminCopy.orders.types
  productName: string
  quantity: number
  totalAmount: number
  status: string
  createdAt: string
  node?: SpaceNode | null
}

interface ConsumptionRow extends Record<string, unknown> {
  id: string
  nodeName: string
  totalAmount: number
  orderCount: number
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<OrderRow[]>([])
  const [nodes, setNodes] = useState<SpaceNode[]>([])
  const [consumption, setConsumption] = useState<ConsumptionRow[]>([])
  const [orderType, setOrderType] = useState("")
  const [nodeId, setNodeId] = useState("")
  const [date, setDate] = useState(today())
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")

  const loadData = useCallback(async () => {
    setIsLoading(true)
    setError("")

    try {
      const params = new URLSearchParams()
      if (orderType) params.set("orderType", orderType)
      if (nodeId) params.set("nodeId", nodeId)
      if (date) params.set("date", date)

      const [ordersResponse, nodesResponse, consumptionResponse] = await Promise.all([
        fetch(`${adminApiBase}/orders?${params}`),
        fetch(`${adminApiBase}/nodes`),
        fetch(`${adminApiBase}/analytics/consumption/by-node`),
      ])

      if (!ordersResponse.ok || !nodesResponse.ok || !consumptionResponse.ok) throw new Error(adminCopy.common.error)

      const ordersResult = (await ordersResponse.json()) as { data: OrderRow[] }
      const nodesResult = (await nodesResponse.json()) as { data: SpaceNode[] }
      const consumptionResult = (await consumptionResponse.json()) as {
        data: Array<{ nodeId: string | null; node: SpaceNode | null; totalAmount: number; orderCount: number }>
      }

      setOrders(ordersResult.data)
      setNodes(nodesResult.data)
      setConsumption(
        consumptionResult.data.map((item) => ({
          id: item.nodeId ?? "unassigned",
          nodeName: nodeDisplayName(item.node?.slug, item.node?.nameKey),
          totalAmount: item.totalAmount,
          orderCount: item.orderCount,
        })),
      )
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : adminCopy.common.error)
    } finally {
      setIsLoading(false)
    }
  }, [date, nodeId, orderType])

  useEffect(() => {
    void loadData()
  }, [loadData])

  const totalRevenue = orders.reduce((sum, order) => sum + order.totalAmount, 0)
  const avgOrder = orders.length ? Math.round((totalRevenue / orders.length) * 100) / 100 : 0
  const columns = useMemo<Array<TableColumn<OrderRow>>>(
    () => [
      { key: "id", label: "ID", render: (value) => <span title={String(value)}>{String(value).slice(0, 8)}</span> },
      { key: "orderType", label: "类型", render: (value) => adminCopy.orders.types[value as keyof typeof adminCopy.orders.types] },
      { key: "productName", label: "商品" },
      { key: "quantity", label: "数量" },
      { key: "totalAmount", label: "金额", render: (value) => `¥${value}` },
      { key: "node", label: "点位", render: (_value, row) => nodeDisplayName(row.node?.slug, row.node?.nameKey) },
      { key: "status", label: "状态" },
      { key: "createdAt", label: "时间", render: (value) => new Date(String(value)).toLocaleString("zh-CN") },
    ],
    [],
  )

  return (
    <div className="grid gap-5">
      <header>
        <p className="text-sm font-bold text-water">{adminCopy.shell.subtitle}</p>
        <h1 className="mt-1 text-2xl font-extrabold">{adminCopy.orders.title}</h1>
      </header>

      <div className="grid gap-3 rounded-lg border border-stone bg-white p-4 shadow-soft md:grid-cols-3">
        <label className="grid gap-1 text-sm font-bold">
          {adminCopy.orders.filterByType}
          <select className="h-10 rounded-md border border-stone bg-rice px-3" onChange={(event) => setOrderType(event.target.value)} value={orderType}>
            <option value="">{adminCopy.orders.allTypes}</option>
            {Object.entries(adminCopy.orders.types).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
        <label className="grid gap-1 text-sm font-bold">
          {adminCopy.orders.filterByNode}
          <select className="h-10 rounded-md border border-stone bg-rice px-3" onChange={(event) => setNodeId(event.target.value)} value={nodeId}>
            <option value="">{adminCopy.orders.allTypes}</option>
            {nodes.map((node) => <option key={node.id} value={node.id}>{nodeDisplayName(node.slug, node.nameKey)}</option>)}
          </select>
        </label>
        <label className="grid gap-1 text-sm font-bold">
          日期
          <input className="h-10 rounded-md border border-stone bg-rice px-3" onChange={(event) => setDate(event.target.value)} type="date" value={date} />
        </label>
      </div>

      {error ? <div className="rounded-md bg-lychee/10 p-3 text-sm font-bold text-lychee">{error}</div> : null}

      <div className="grid gap-3 md:grid-cols-3">
        <AdminStatCard label={adminCopy.orders.totalRevenue} value={`¥${totalRevenue}`} />
        <AdminStatCard label={adminCopy.orders.totalOrders} value={orders.length} />
        <AdminStatCard label={adminCopy.orders.avgOrder} value={`¥${avgOrder}`} />
      </div>

      <AdminDataTable columns={columns} emptyLabel={adminCopy.orders.noData} isLoading={isLoading} rows={orders} />

      <section className="rounded-lg border border-stone bg-white p-5 shadow-soft">
        <h2 className="text-lg font-extrabold">按点位消费汇总</h2>
        <div className="mt-4">
          <AdminDataTable
            columns={[
              { key: "nodeName", label: "点位" },
              { key: "totalAmount", label: "收入", render: (value) => `¥${value}` },
              { key: "orderCount", label: "订单数" },
            ]}
            emptyLabel="暂无点位消费。"
            rows={consumption}
          />
        </div>
      </section>
    </div>
  )
}

function today() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Shanghai" }).format(new Date())
}
