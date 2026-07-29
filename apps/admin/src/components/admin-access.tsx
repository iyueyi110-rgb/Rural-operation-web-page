"use client"

import {
  createContext,
  useEffect,
  useReducer,
  useContext,
  type ReactNode,
} from "react"

export const ADMIN_WRITE_LOGIN_MESSAGE = "登录管理员后可操作"
export const ADMIN_SESSION_EXPIRED_EVENT = "zouma:admin-session-expired"

export interface AdminAccessState {
  canWrite: boolean
  sessionExpired: boolean
}

type AdminAccessAction =
  | { type: "server-access"; canWrite: boolean }
  | { type: "session-expired" }

export function adminAccessReducer(
  state: AdminAccessState,
  action: AdminAccessAction,
): AdminAccessState {
  if (action.type === "session-expired") {
    return { canWrite: false, sessionExpired: true }
  }
  if (
    state.canWrite === action.canWrite &&
    state.sessionExpired === false
  ) {
    return state
  }
  return { canWrite: action.canWrite, sessionExpired: false }
}

export function notifyAdminSessionExpired() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(ADMIN_SESSION_EXPIRED_EVENT))
  }
}

const AdminAccessContext = createContext<AdminAccessState>({
  canWrite: false,
  sessionExpired: false,
})

export function AdminAccessProvider({
  canWrite: initialCanWrite,
  children,
}: {
  canWrite: boolean
  children: ReactNode
}) {
  const [state, dispatch] = useReducer(adminAccessReducer, {
    canWrite: initialCanWrite,
    sessionExpired: false,
  })

  useEffect(() => {
    dispatch({ type: "server-access", canWrite: initialCanWrite })
  }, [initialCanWrite])

  useEffect(() => {
    function expireSession() {
      dispatch({ type: "session-expired" })
    }

    window.addEventListener(ADMIN_SESSION_EXPIRED_EVENT, expireSession)
    return () => {
      window.removeEventListener(ADMIN_SESSION_EXPIRED_EVENT, expireSession)
    }
  }, [])

  return (
    <AdminAccessContext.Provider value={state}>
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
