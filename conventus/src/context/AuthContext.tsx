import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { authApi } from '../api'
import type { UserProfile } from '../api/types'

interface AuthContextValue {
  user: UserProfile | null
  setUser: (u: UserProfile | null) => void
  checkSession: () => Promise<void>
  handleLogout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

const USER_STORAGE_KEY = 'conventus_user'

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUserState] = useState<UserProfile | null>(() => {
    try {
      const stored = localStorage.getItem(USER_STORAGE_KEY)
      return stored ? JSON.parse(stored) : null
    } catch {
      return null
    }
  })

  const setUser = useCallback((u: UserProfile | null) => {
    setUserState(u)
    if (u) {
      try {
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(u))
      } catch {
        // ignore quota error
      }
    } else {
      localStorage.removeItem(USER_STORAGE_KEY)
    }
  }, [])

  const checkSession = useCallback(async () => {
    try {
      const res = await authApi.checkStatus()
      if (res.authenticated && res.user) {
        setUser(res.user)
      } else {
        setUser(null)
      }
    } catch {
      // If network fails, don't immediately drop cached user unless it's a 401
    }
  }, [setUser])

  useEffect(() => {
    checkSession()
  }, [checkSession])

  const handleLogout = async () => {
    try {
      await authApi.logout()
    } finally {
      setUser(null)
    }
  }

  return (
    <AuthContext.Provider value={{ user, setUser, checkSession, handleLogout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
