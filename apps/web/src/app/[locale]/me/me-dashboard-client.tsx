"use client"

import Link from "next/link"
import { useLocale, useTranslations } from "next-intl"
import { useEffect, useState } from "react"

import { fetchWithAuth, getAuthToken } from "@web/lib/auth-client"

interface OrderRow {
  id: string
  type: string
  title: string
  status: string
  amount: number
  createdAt: string
}

interface AdoptionRow {
  id: string
  plan: string
  status: string
  createdAt: string
  tree: {
    treeCode: string
    species: string
    healthStatus: string
    blurredLocation: string
  }
}

export function MeDashboardClient() {
  const locale = useLocale()
  const interactionsT = useTranslations("villagerSystem.interactions.dashboard")
  const [orders, setOrders] = useState<OrderRow[]>([])
  const [adoptions, setAdoptions] = useState<AdoptionRow[]>([])
  const [loading, setLoading] = useState(true)
  const [loggedIn, setLoggedIn] = useState(false)

  useEffect(() => {
    const token = getAuthToken()
    setLoggedIn(!!token)
    if (!token) {
      setLoading(false)
      return
    }

    Promise.all([
      fetchWithAuth("/api/v1/me/orders").then((response) =>
        response.ok ? response.json() : { data: [] },
      ),
      fetchWithAuth("/api/v1/me/adoptions").then((response) =>
        response.ok ? response.json() : { data: [] },
      ),
    ])
      .then(([ordersPayload, adoptionsPayload]) => {
        setOrders(Array.isArray(ordersPayload.data) ? ordersPayload.data : [])
        setAdoptions(
          Array.isArray(adoptionsPayload.data) ? adoptionsPayload.data : [],
        )
      })
      .catch(() => {
        setOrders([])
        setAdoptions([])
      })
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <p className="mt-8 text-sm font-semibold text-ink/58">
        正在读取个人订单与认养记录。
      </p>
    )
  }

  if (!loggedIn) {
    return (
      <div className="mt-8 rounded-lg border border-line bg-white p-5">
        <h2 className="text-xl font-extrabold">登录后查看您的订单和认养</h2>
        <p className="mt-2 text-sm leading-6 text-ink/62">
          当前没有检测到游客登录态。完成手机号登录后，这里会展示真实订单、认养树和权益状态。
        </p>
        <Link className="btn-primary mt-4 h-11 px-5" href={`/${locale}`}>
          返回首页登录
        </Link>
      </div>
    )
  }

  const empty = orders.length === 0 && adoptions.length === 0

  return (
    <div className="mt-8 grid gap-5">
      {empty ? (
        <div className="rounded-lg border border-line bg-white p-5">
          <h2 className="text-xl font-extrabold">
            您还没有订单，去认养一棵荔枝树吧
          </h2>
          <p className="mt-2 text-sm leading-6 text-ink/62">
            认养成功后，树档案、养护记录和活动提醒会汇总到这里。
          </p>
          <Link
            className="btn-primary mt-4 h-11 px-5"
            href={`/${locale}/trees`}
          >
            查看荔枝树认养
          </Link>
        </div>
      ) : null}

      {orders.map((order) => (
        <article
          className="choice-card grid gap-3 md:grid-cols-[1fr_auto]"
          key={order.id}
        >
          <div>
            <div className="text-sm font-bold text-water">{order.type}</div>
            <h2 className="mt-2 text-xl font-extrabold">{order.title}</h2>
            <p className="mt-2 text-sm text-ink/58">{order.id}</p>
          </div>
          <div className="grid gap-2 text-sm md:text-right">
            <span className="font-bold text-moss">{order.status}</span>
            <span className="text-ink/58">¥{order.amount.toFixed(2)}</span>
            <span className="text-ink/58">
              {new Date(order.createdAt).toLocaleString()}
            </span>
          </div>
        </article>
      ))}

      {adoptions.map((adoption) => (
        <article
          className="choice-card grid gap-3 md:grid-cols-[1fr_auto]"
          key={adoption.id}
        >
          <div>
            <div className="text-sm font-bold text-water">tree_adoption</div>
            <h2 className="mt-2 text-xl font-extrabold">
              {adoption.tree.treeCode}
            </h2>
            <p className="mt-2 text-sm text-ink/58">
              {adoption.tree.blurredLocation}
            </p>
          </div>
          <div className="grid gap-2 text-sm md:text-right">
            <span className="font-bold text-moss">{adoption.status}</span>
            <span className="text-ink/58">{adoption.plan}</span>
            <span className="text-ink/58">
              {new Date(adoption.createdAt).toLocaleString()}
            </span>
            {adoption.status === "active" ? (
              <Link
                className="btn-primary btn-sm mt-2 md:justify-self-end"
                href={`/${locale}/me/interactions`}
              >
                {interactionsT("viewAll")}
              </Link>
            ) : null}
          </div>
        </article>
      ))}
    </div>
  )
}
