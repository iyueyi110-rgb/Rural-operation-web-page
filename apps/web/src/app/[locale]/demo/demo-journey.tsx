"use client"

import Link from "next/link"
import {
  BadgeCheck,
  ArrowRight,
  CircleUserRound,
  ClipboardCheck,
  ExternalLink,
  Leaf,
  Sprout,
} from "lucide-react"
import { useLocale, useTranslations } from "next-intl"
import { useState } from "react"

import type { Locale } from "@web/i18n/routing"

type Role = "user" | "villager" | "operator"
type RoleFilter = "all" | Role

const steps: Array<{
  id: string
  href: (locale: Locale, adminBaseUrl: string) => string
  external?: boolean
  roles: Role[]
}> = [
  {
    id: "profile",
    href: (locale) => `/${locale}/trees/LZ-018`,
    roles: ["user"],
  },
  {
    id: "adopt",
    href: (locale) => `/${locale}/trees`,
    roles: ["user"],
  },
  {
    id: "accept",
    href: (locale) => `/${locale}/villager/login`,
    roles: ["villager"],
  },
  {
    id: "evidence",
    href: (locale) => `/${locale}/villager/tasks`,
    roles: ["villager"],
  },
  {
    id: "review",
    external: true,
    href: (_locale, adminBaseUrl) => `${adminBaseUrl}/tasks`,
    roles: ["operator"],
  },
  {
    id: "benefit",
    href: (locale) => `/${locale}/me/demo-login`,
    roles: ["user", "operator"],
  },
  {
    id: "badCase",
    external: true,
    href: (_locale, adminBaseUrl) => `${adminBaseUrl}/simulations`,
    roles: ["operator"],
  },
]

const roleIcons = {
  user: CircleUserRound,
  villager: Sprout,
  operator: ClipboardCheck,
} satisfies Record<Role, typeof CircleUserRound>

export function DemoJourney({
  adminBaseUrl,
  mode,
}: {
  adminBaseUrl: string
  mode: "full" | "readonly"
}) {
  const locale = useLocale() as Locale
  const t = useTranslations("portfolioDemo")
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all")
  const filters: RoleFilter[] = ["all", "user", "villager", "operator"]

  return (
    <div>
      <div className="flex flex-col gap-4 border-b border-[#8B9D83]/55 pb-6 md:flex-row md:items-end md:justify-between">
        <div className="max-w-2xl">
          <p className="text-sm font-bold text-[#606C38]">
            {t("journey.eyebrow")}
          </p>
          <h2 className="hero-serif mt-2 text-3xl font-bold leading-tight text-[#283618] sm:text-4xl">
            {t("journey.title")}
          </h2>
          <p className="mt-3 text-sm leading-7 text-[#283618]/72 sm:text-base">
            {t("journey.body")}
          </p>
        </div>

        <div
          aria-label={t("filters.aria")}
          className="grid w-full grid-cols-4 rounded-2xl bg-[#D4B895] p-1 md:w-auto"
          role="group"
        >
          {filters.map((filter) => (
            <button
              aria-pressed={roleFilter === filter}
              className={`min-h-10 px-2 text-xs font-bold transition duration-300 sm:px-4 ${
                roleFilter === filter
                  ? "rounded-xl bg-[#606C38] text-[#E8DCC7]"
                  : "text-[#283618]/70 hover:text-[#283618]"
              }`}
              key={filter}
              onClick={() => setRoleFilter(filter)}
              type="button"
            >
              {t(`filters.${filter}`)}
            </button>
          ))}
        </div>
      </div>

      <ol className="relative mt-2 before:absolute before:bottom-12 before:left-[1.45rem] before:top-12 before:w-px before:bg-[#8B9D83] sm:before:left-[2.2rem]">
        {steps.map((step, index) => {
          const matchesFilter =
            roleFilter === "all" || step.roles.includes(roleFilter)
          const href = step.href(locale, adminBaseUrl)

          return (
            <li
              className={`relative grid grid-cols-[3rem_minmax(0,1fr)] gap-3 border-b border-[#8B9D83]/45 py-7 transition duration-500 last:border-b-0 sm:grid-cols-[4.5rem_minmax(0,1fr)] sm:gap-5 sm:py-9 ${
                matchesFilter ? "opacity-100" : "opacity-35"
              }`}
              key={step.id}
            >
              <div
                aria-hidden="true"
                className={`relative z-10 grid h-12 w-12 place-items-center rounded-full border-4 border-[#E8DCC7] text-sm font-extrabold sm:ml-3 ${
                  matchesFilter
                    ? "bg-[#C66B3D] text-[#E8DCC7]"
                    : "bg-[#8B9D83] text-[#283618]"
                }`}
              >
                {String(index + 1).padStart(2, "0")}
              </div>

              <div className="min-w-0 lg:grid lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center lg:gap-8">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    {step.roles.map((role) => {
                      const Icon = roleIcons[role]
                      return (
                        <span
                          className="inline-flex items-center gap-1.5 rounded-full bg-[#D4B895] px-2.5 py-1 text-xs font-bold text-[#283618]"
                          key={role}
                        >
                          <Icon aria-hidden="true" className="h-3.5 w-3.5" />
                          {t(`roles.${role}`)}
                        </span>
                      )
                    })}
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#606C38]">
                      {mode === "full" ? (
                        <BadgeCheck aria-hidden="true" className="h-4 w-4" />
                      ) : (
                        <Leaf aria-hidden="true" className="h-4 w-4" />
                      )}
                      {t(`steps.${step.id}.status.${mode}`)}
                    </span>
                  </div>
                  <h3 className="mt-3 break-words text-xl font-extrabold leading-snug text-[#283618] sm:text-2xl">
                    {t(`steps.${step.id}.title`)}
                  </h3>
                  <p className="mt-2 max-w-2xl break-words text-sm leading-7 text-[#283618]/72">
                    {t(`steps.${step.id}.body`)}
                  </p>
                </div>

                {step.external ? (
                  <a
                    className="mt-5 inline-flex h-11 max-w-full items-center gap-2 rounded-full border border-[#606C38] px-4 text-sm font-bold text-[#283618] transition duration-300 hover:bg-[#606C38] hover:text-[#E8DCC7] lg:mt-0"
                    href={href}
                    rel="noreferrer"
                    target="_blank"
                  >
                    <span className="truncate">
                      {t(`steps.${step.id}.cta`)}
                    </span>
                    <ExternalLink
                      aria-hidden="true"
                      className="h-4 w-4 shrink-0"
                    />
                  </a>
                ) : (
                  <Link
                    className="mt-5 inline-flex h-11 max-w-full items-center gap-2 rounded-full border border-[#606C38] px-4 text-sm font-bold text-[#283618] transition duration-300 hover:bg-[#606C38] hover:text-[#E8DCC7] lg:mt-0"
                    href={href}
                  >
                    <span className="truncate">
                      {t(`steps.${step.id}.cta`)}
                    </span>
                    <ArrowRight
                      aria-hidden="true"
                      className="h-4 w-4 shrink-0"
                    />
                  </Link>
                )}
              </div>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
