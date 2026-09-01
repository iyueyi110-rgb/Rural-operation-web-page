"use client"

import { useCallback, useEffect, useMemo, useState } from "react"

import {
  AdminDataTable,
  type TableColumn,
} from "@admin/components/admin-data-table"
import {
  adminWriteControlProps,
  useAdminAccess,
} from "@admin/components/admin-access"
import {
  adminApiBase,
  fetchAdminApi,
  fetchWithTimeout,
} from "@admin/lib/admin-api"
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

export default function TreesAdminPage() {
  const { canWrite } = useAdminAccess()
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
    const response = await fetchWithTimeout(`${adminApiBase}/trees`)
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
    try {
      await fetchAdminApi(`/trees/${selected.treeCode}`, {
        method: "PATCH",
        body: JSON.stringify({
          fireMemory,
          newShootsRecord,
          growthPhotos: growthPhotosText
            .split("\n")
            .map((item) => item.trim())
            .filter(Boolean),
          adoptStatus: selected.adoptStatus,
        }),
      })
      setMessage("树档案已保存，认养人重新打开页面后可看到更新。")
      await loadTrees()
    } catch {
      setMessage("树档案没有保存成功，请检查网络后重新保存。")
    }
  }

  async function addCareLog() {
    if (!selected) return
    if (!logContent.trim()) {
      setMessage("请先填写本次养护内容，再添加养护记录。")
      return
    }
    try {
      await fetchAdminApi(`/trees/${selected.treeCode}/care-logs`, {
        method: "POST",
        body: JSON.stringify({
          logType,
          content: logContent,
          operator: "运营后台",
        }),
      })
      setMessage("养护记录已添加，认养人可以在树档案中查看。")
      await loadTrees()
    } catch {
      setMessage("养护记录没有添加成功，请检查内容和网络后重试。")
    }
  }

  async function uploadGrowthPhoto(file: File | null) {
    if (!selected || !file) return
    setIsUploading(true)
    setMessage("")

    const formData = new FormData()
    formData.set("file", file)

    const uploadResponse = await fetchWithTimeout(`${adminApiBase}/upload`, {
      method: "POST",
      body: formData,
    })

    if (!uploadResponse.ok) {
      setMessage("成长照片上传失败，请检查网络和图片格式后重新选择。")
      setIsUploading(false)
      return
    }

    const uploadPayload = (await uploadResponse.json()) as {
      data?: { url?: string }
    }
    const imageUrl = uploadPayload.data?.url
    if (!imageUrl) {
      setMessage("上传结果中没有图片地址，请重新选择照片上传。")
      setIsUploading(false)
      return
    }

    const growthPhotos = [...(selected.growthPhotos ?? []), imageUrl]
    try {
      await fetchAdminApi(`/trees/${selected.treeCode}`, {
        method: "PATCH",
        body: JSON.stringify({
          fireMemory,
          newShootsRecord,
          growthPhotos,
          adoptStatus: selected.adoptStatus,
        }),
      })
      setMessage("成长照片已添加到树档案。")
      await loadTrees()
    } catch {
      setMessage("照片已上传，但树档案没有更新成功，请重新保存档案。")
    } finally {
      setIsUploading(false)
    }
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
        <p className="text-sm font-bold text-water">
          {adminCopy.shell.subtitle}
        </p>
        <h1 className="mt-1 text-2xl font-extrabold">
          {adminCopy.trees.title}
        </h1>
      </header>

      {message ? (
        <div className="rounded-md bg-rice p-3 text-sm font-bold text-ink/70">
          {message}
        </div>
      ) : null}

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
                <p className="text-sm font-bold text-water">
                  {adminCopy.trees.detail}
                </p>
                <h2 className="mt-1 text-xl font-extrabold">
                  {selected.treeCode}
                </h2>
              </div>
              <fieldset
                className="m-0 grid min-w-0 gap-4 border-0 p-0"
                {...adminWriteControlProps(canWrite)}
              >
                <label className="grid gap-2 text-sm font-bold">
                  山火记忆
                  <textarea
                    className="min-h-28 rounded-md border border-stone bg-rice p-3 font-semibold"
                    onChange={(event) => setFireMemory(event.target.value)}
                    value={fireMemory}
                  />
                </label>
                <label className="grid gap-2 text-sm font-bold">
                  新梢记录
                  <textarea
                    className="min-h-28 rounded-md border border-stone bg-rice p-3 font-semibold"
                    onChange={(event) => setNewShootsRecord(event.target.value)}
                    value={newShootsRecord}
                  />
                </label>
                <label className="grid gap-2 text-sm font-bold">
                  图片 URL 列表
                  <textarea
                    className="min-h-20 rounded-md border border-stone bg-rice p-3 font-mono text-xs"
                    onChange={(event) =>
                      setGrowthPhotosText(event.target.value)
                    }
                    value={growthPhotosText}
                  />
                </label>
                <label className="grid gap-2 text-sm font-bold">
                  上传成长照片
                  <input
                    accept="image/jpeg,image/png,image/webp"
                    className="rounded-md border border-stone bg-rice p-3 text-sm"
                    {...adminWriteControlProps(canWrite, isUploading)}
                    onChange={(event) => {
                      void uploadGrowthPhoto(event.target.files?.[0] ?? null)
                      event.currentTarget.value = ""
                    }}
                    type="file"
                  />
                </label>
                <button
                  className="h-11 rounded-full bg-ink px-5 text-sm font-bold text-white"
                  {...adminWriteControlProps(canWrite, isUploading)}
                  onClick={saveTree}
                  type="button"
                >
                  {isUploading ? "上传中..." : adminCopy.trees.save}
                </button>
              </fieldset>

              <div className="border-t border-stone pt-4">
                <p className="text-sm font-bold text-water">
                  {adminCopy.trees.careLogs}
                </p>
                <fieldset
                  className="m-0 min-w-0 border-0 p-0"
                  {...adminWriteControlProps(canWrite)}
                >
                  <select
                    className="mt-3 h-10 w-full rounded-md border border-stone bg-rice px-3"
                    onChange={(event) => setLogType(event.target.value)}
                    value={logType}
                  >
                    <option value="watering">浇灌</option>
                    <option value="pruning">修剪</option>
                    <option value="fertilizing">施肥</option>
                    <option value="pest_control">病虫害</option>
                    <option value="photo">照片</option>
                    <option value="harvest">采摘</option>
                  </select>
                  <textarea
                    className="mt-3 min-h-20 w-full rounded-md border border-stone bg-rice p-3 text-sm font-semibold"
                    onChange={(event) => setLogContent(event.target.value)}
                    value={logContent}
                  />
                  <button
                    className="mt-3 h-10 w-full rounded-full bg-moss px-5 text-sm font-bold text-white"
                    {...adminWriteControlProps(canWrite)}
                    onClick={addCareLog}
                    type="button"
                  >
                    {adminCopy.trees.addLog}
                  </button>
                </fieldset>
                <div className="mt-4 grid gap-3">
                  {selected.careLogs.map((log) => (
                    <article
                      className="rounded-md bg-rice p-3 text-sm"
                      key={log.id}
                    >
                      <div className="font-bold">{log.logType}</div>
                      <p className="mt-1 text-ink/62">{log.content}</p>
                      <div className="mt-1 text-xs text-ink/46">
                        {new Date(log.createdAt).toLocaleString()}
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm font-semibold text-ink/54">
              {adminCopy.common.noSelection}
            </p>
          )}
        </aside>
      </div>
    </div>
  )
}
