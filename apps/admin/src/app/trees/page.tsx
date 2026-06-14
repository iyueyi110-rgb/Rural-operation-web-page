"use client"

import { useCallback, useEffect, useMemo, useState } from "react"

import { AdminDataTable, type TableColumn } from "@admin/components/admin-data-table"
import { adminApiBase } from "@admin/lib/admin-api"
import { adminCopy } from "@admin/lib/admin-copy"

interface CareLog {
  id: string
  logType: string
  content: string
  operator: string
  createdAt: string
}

interface TreeRow extends Record<string, unknown> {
  id: string
  treeCode: string
  species: string
  age: number
  healthStatus: string
  adoptStatus: string
  fireMemory?: string
  newShootsRecord?: string
  growthPhotos: string[]
  careLogs: CareLog[]
}

const adminToken = process.env.NEXT_PUBLIC_ADMIN_API_TOKEN ?? "dev-admin-token"

export default function TreesAdminPage() {
  const [trees, setTrees] = useState<TreeRow[]>([])
  const [selected, setSelected] = useState<TreeRow | null>(null)
  const [fireMemory, setFireMemory] = useState("")
  const [newShootsRecord, setNewShootsRecord] = useState("")
  const [growthPhotosText, setGrowthPhotosText] = useState("")
  const [logContent, setLogContent] = useState("")
  const [logType, setLogType] = useState("watering")
  const [isLoading, setIsLoading] = useState(true)
  const [isUploading, setIsUploading] = useState(false)
  const [message, setMessage] = useState("")

  const loadTrees = useCallback(async () => {
    setIsLoading(true)
    const response = await fetch(`${adminApiBase}/trees`)
    const payload = (await response.json()) as { data: TreeRow[] }
    setTrees(payload.data)
    setSelected((current) => current ?? payload.data[0] ?? null)
    setIsLoading(false)
  }, [])

  useEffect(() => {
    void loadTrees()
  }, [loadTrees])

  useEffect(() => {
    setFireMemory(selected?.fireMemory ?? "")
    setNewShootsRecord(selected?.newShootsRecord ?? "")
    setGrowthPhotosText((selected?.growthPhotos ?? []).join("\n"))
    setLogContent("")
    setMessage("")
  }, [selected])

  async function saveTree() {
    if (!selected) return
    const response = await fetch(`${adminApiBase}/trees/${selected.treeCode}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "X-Admin-Token": adminToken },
      body: JSON.stringify({
        fireMemory,
        newShootsRecord,
        growthPhotos: growthPhotosText.split("\n").map((item) => item.trim()).filter(Boolean),
        adoptStatus: selected.adoptStatus,
      }),
    })
    setMessage(response.ok ? "档案已保存。" : "档案保存失败。")
    if (response.ok) await loadTrees()
  }

  async function addCareLog() {
    if (!selected || !logContent.trim()) return
    const response = await fetch(`${adminApiBase}/trees/${selected.treeCode}/care-logs`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Admin-Token": adminToken },
      body: JSON.stringify({ logType, content: logContent, operator: "运营后台" }),
    })
    setMessage(response.ok ? "养护日志已录入。" : "养护日志录入失败。")
    if (response.ok) await loadTrees()
  }

  async function uploadGrowthPhoto(file: File | null) {
    if (!selected || !file) return
    setIsUploading(true)
    setMessage("")

    const formData = new FormData()
    formData.set("file", file)

    const uploadResponse = await fetch(`${adminApiBase}/upload`, {
      method: "POST",
      headers: { "X-Admin-Token": adminToken },
      body: formData,
    })

    if (!uploadResponse.ok) {
      setMessage("图片上传失败。")
      setIsUploading(false)
      return
    }

    const uploadPayload = (await uploadResponse.json()) as { data?: { url?: string } }
    const imageUrl = uploadPayload.data?.url
    if (!imageUrl) {
      setMessage("图片上传失败。")
      setIsUploading(false)
      return
    }

    const growthPhotos = [...(selected.growthPhotos ?? []), imageUrl]
    const saveResponse = await fetch(`${adminApiBase}/trees/${selected.treeCode}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "X-Admin-Token": adminToken },
      body: JSON.stringify({
        fireMemory,
        newShootsRecord,
        growthPhotos,
        adoptStatus: selected.adoptStatus,
      }),
    })

    setMessage(saveResponse.ok ? "图片已追加到树档案。" : "图片已上传但档案保存失败。")
    setIsUploading(false)
    if (saveResponse.ok) await loadTrees()
  }

  const columns = useMemo<Array<TableColumn<TreeRow>>>(
    () => [
      { key: "treeCode", label: "编号" },
      { key: "species", label: "树种" },
      { key: "age", label: "树龄" },
      { key: "healthStatus", label: "健康" },
      { key: "adoptStatus", label: "认养" },
    ],
    [],
  )

  return (
    <div className="grid gap-5">
      <header>
        <p className="text-sm font-bold text-water">{adminCopy.shell.subtitle}</p>
        <h1 className="mt-1 text-2xl font-extrabold">{adminCopy.trees.title}</h1>
      </header>

      {message ? <div className="rounded-md bg-rice p-3 text-sm font-bold text-ink/70">{message}</div> : null}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
        <AdminDataTable
          columns={columns}
          emptyLabel={adminCopy.trees.noData}
          isLoading={isLoading}
          onRowClick={(row) => setSelected(row)}
          rows={trees}
          selectedId={selected?.id}
        />

        <aside className="rounded-lg border border-stone bg-white p-5 shadow-soft">
          {selected ? (
            <div className="grid gap-4">
              <div>
                <p className="text-sm font-bold text-water">{adminCopy.trees.detail}</p>
                <h2 className="mt-1 text-xl font-extrabold">{selected.treeCode}</h2>
              </div>
              <label className="grid gap-2 text-sm font-bold">
                山火记忆
                <textarea className="min-h-28 rounded-md border border-stone bg-rice p-3 font-semibold" onChange={(event) => setFireMemory(event.target.value)} value={fireMemory} />
              </label>
              <label className="grid gap-2 text-sm font-bold">
                新梢记录
                <textarea className="min-h-28 rounded-md border border-stone bg-rice p-3 font-semibold" onChange={(event) => setNewShootsRecord(event.target.value)} value={newShootsRecord} />
              </label>
              <label className="grid gap-2 text-sm font-bold">
                图片 URL 列表
                <textarea className="min-h-20 rounded-md border border-stone bg-rice p-3 font-mono text-xs" onChange={(event) => setGrowthPhotosText(event.target.value)} value={growthPhotosText} />
              </label>
              <label className="grid gap-2 text-sm font-bold">
                上传成长照片
                <input
                  accept="image/jpeg,image/png,image/webp"
                  className="rounded-md border border-stone bg-rice p-3 text-sm"
                  disabled={isUploading}
                  onChange={(event) => {
                    void uploadGrowthPhoto(event.target.files?.[0] ?? null)
                    event.currentTarget.value = ""
                  }}
                  type="file"
                />
              </label>
              <button className="h-11 rounded-full bg-ink px-5 text-sm font-bold text-white" onClick={saveTree} type="button">
                {isUploading ? "上传中..." : adminCopy.trees.save}
              </button>

              <div className="border-t border-stone pt-4">
                <p className="text-sm font-bold text-water">{adminCopy.trees.careLogs}</p>
                <select className="mt-3 h-10 w-full rounded-md border border-stone bg-rice px-3" onChange={(event) => setLogType(event.target.value)} value={logType}>
                  <option value="watering">浇灌</option>
                  <option value="pruning">修剪</option>
                  <option value="fertilizing">施肥</option>
                  <option value="pest_control">病虫害</option>
                  <option value="photo">照片</option>
                  <option value="harvest">采摘</option>
                </select>
                <textarea className="mt-3 min-h-20 w-full rounded-md border border-stone bg-rice p-3 text-sm font-semibold" onChange={(event) => setLogContent(event.target.value)} value={logContent} />
                <button className="mt-3 h-10 w-full rounded-full bg-moss px-5 text-sm font-bold text-white" onClick={addCareLog} type="button">
                  {adminCopy.trees.addLog}
                </button>
                <div className="mt-4 grid gap-3">
                  {selected.careLogs.map((log) => (
                    <article className="rounded-md bg-rice p-3 text-sm" key={log.id}>
                      <div className="font-bold">{log.logType}</div>
                      <p className="mt-1 text-ink/62">{log.content}</p>
                      <div className="mt-1 text-xs text-ink/46">{new Date(log.createdAt).toLocaleString()}</div>
                    </article>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm font-semibold text-ink/54">{adminCopy.common.noSelection}</p>
          )}
        </aside>
      </div>
    </div>
  )
}
