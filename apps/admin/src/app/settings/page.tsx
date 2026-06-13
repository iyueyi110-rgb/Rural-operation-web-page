"use client"

import { adminApiBase } from "@admin/lib/admin-api"
import { adminCopy } from "@admin/lib/admin-copy"

const envItems = [
  { label: "NEXT_PUBLIC_WEB_API_BASE", configured: Boolean(process.env.NEXT_PUBLIC_WEB_API_BASE) },
  { label: "NEXT_PUBLIC_SITE_URL", configured: Boolean(process.env.NEXT_PUBLIC_SITE_URL) },
]

export default function SettingsPage() {
  return (
    <div className="grid gap-5">
      <header>
        <p className="text-sm font-bold text-water">{adminCopy.shell.subtitle}</p>
        <h1 className="mt-1 text-2xl font-extrabold">{adminCopy.settings.title}</h1>
      </header>

      <section className="rounded-lg border border-stone bg-white p-5 shadow-soft">
        <h2 className="text-lg font-extrabold">{adminCopy.settings.apiBase}</h2>
        <p className="mt-3 rounded-md bg-rice p-3 text-sm font-bold text-ink/70">{adminApiBase}</p>
      </section>

      <section className="rounded-lg border border-stone bg-white p-5 shadow-soft">
        <h2 className="text-lg font-extrabold">{adminCopy.settings.envStatus}</h2>
        <div className="mt-4 grid gap-3">
          {envItems.map((item) => (
            <div className="flex items-center justify-between rounded-md bg-rice p-3 text-sm font-bold" key={item.label}>
              <span>{item.label}</span>
              <span className={item.configured ? "text-moss" : "text-ink/40"}>
                {item.configured ? adminCopy.settings.configured : adminCopy.settings.notConfigured}
              </span>
            </div>
          ))}
          <div className="flex items-center justify-between rounded-md bg-rice p-3 text-sm font-bold">
            <span>{adminCopy.settings.dbStatus}</span>
            <span className="text-moss">{adminCopy.settings.dbConnected}</span>
          </div>
        </div>
      </section>
    </div>
  )
}
