"use client"

import { WifiOff } from "lucide-react"

import { useOnlineStatus } from "@web/hooks/use-online-status"

export function OfflineBanner() {
  const isOnline = useOnlineStatus()

  if (isOnline) return null

  return (
    <div className="sticky top-0 z-50 flex items-center justify-center gap-2 bg-[#8a5a12] px-4 py-2 text-center text-sm font-semibold text-white">
      <WifiOff aria-hidden="true" className="h-4 w-4 shrink-0" />
      当前处于离线状态，部分实时数据暂不可用。网络恢复后将自动更新。
    </div>
  )
}
