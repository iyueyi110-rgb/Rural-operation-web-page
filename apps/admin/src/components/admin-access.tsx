"use client"

import {
  createContext,
  useContext,
  type ReactNode,
} from "react"

export const ADMIN_WRITE_LOGIN_MESSAGE = "登录管理员后可操作"

const AdminAccessContext = createContext({ canWrite: false })

export function AdminAccessProvider({
  canWrite,
  children,
}: {
  canWrite: boolean
  children: ReactNode
}) {
  return (
    <AdminAccessContext.Provider value={{ canWrite }}>
      {children}
    </AdminAccessContext.Provider>
  )
}

export function useAdminAccess() {
  return useContext(AdminAccessContext)
}

export function adminWriteControlProps(
  canWrite: boolean,
  disabled = false,
) {
  return {
    disabled: disabled || !canWrite,
    ...(canWrite ? {} : { title: ADMIN_WRITE_LOGIN_MESSAGE }),
  }
}
