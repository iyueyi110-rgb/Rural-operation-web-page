"use client"

import { AdminPageShell, AdminPanel } from "@admin/components/admin-page-shell"
import { adminApiBase } from "@admin/lib/admin-api"
import { adminCopy } from "@admin/lib/admin-copy"

const envItems = [
  { label: "NEXT_PUBLIC_WEB_API_BASE", configured: Boolean(process.env.NEXT_PUBLIC_WEB_API_BASE) },
  { label: "NEXT_PUBLIC_SITE_URL", configured: Boolean(process.env.NEXT_PUBLIC_SITE_URL) },
]

export default function SettingsPage() {
  return (
    <AdminPageShell
      description="集中查看后台 API、数据库和运行环境配置状态。"
      eyebrow={adminCopy.shell.subtitle}
      title={adminCopy.settings.title}
    >
      <AdminPanel>
        <h2 className="text-lg font-extrabold">{adminCopy.settings.apiBase}</h2>
        <p className="mt-3 rounded-md bg-rice p-3 text-sm font-bold text-ink/70">{adminApiBase}</p>
      </AdminPanel>

      <AdminPanel>
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
      </AdminPanel>
    </AdminPageShell>
  )
}
