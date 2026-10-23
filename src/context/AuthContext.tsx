import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { authApi } from '../api'
import type { UserProfile } from '../api/types'
import {
  applyPaletteToDom,
  cacheCustomPalettes,
  clearPaletteCache,
  dbPaletteToFrontend,
  getCurrentPaletteId,
  type Palette,
} from '../theme/themes'

interface AuthContextValue {
  user: UserProfile | null
  setUser: (u: UserProfile | null) => void
  checkSession: () => Promise<void>
  handleLogout: () => Promise<void>
  syncPalettes: (activePaletteId?: string) => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

const USER_STORAGE_KEY = 'conventus_user'

/**
 * Fetch the user's custom palettes from DB, cache them in localStorage,
 * and apply the user's active palette to the DOM.
 */
async function syncPalettesFromDB(activePaletteId?: string): Promise<void> {
  try {
    const dbPalettes = await authApi.getPalettes()
    const frontendPalettes: Palette[] = dbPalettes.map(dbPaletteToFrontend)
    cacheCustomPalettes(frontendPalettes)

    // Apply the stored active palette (from DB or localStorage fallback)
    const idToApply = activePaletteId || getCurrentPaletteId()
    applyPaletteToDom(idToApply)

    // Notify ThemePicker + ProfileView to refresh their lists
    window.dispatchEvent(new CustomEvent('conventus_palettes_changed', { detail: { synced: true } }))
  } catch {
    // Non-critical — just apply whatever is cached
    applyPaletteToDom(getCurrentPaletteId())
  }
}

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
      } catch { /* ignore quota error */ }
    } else {
      localStorage.removeItem(USER_STORAGE_KEY)
    }
  }, [])

  /** Exposed so AuthPage/login flow can trigger palette sync after setUser */
  const syncPalettes = useCallback(async (activePaletteId?: string) => {
    await syncPalettesFromDB(activePaletteId)
  }, [])

  const checkSession = useCallback(async () => {
    try {
      const res = await authApi.checkStatus()
      if (res.authenticated && res.user) {
        setUser(res.user)
        // Sync custom palettes from DB and apply user's active theme
        await syncPalettesFromDB(res.user.active_palette_id)
      } else {
        setUser(null)
        clearPaletteCache()
        applyPaletteToDom('campus')
      }
    } catch {
      // Network error — keep cached user, apply whatever theme is cached
      applyPaletteToDom(getCurrentPaletteId())
    }
  }, [setUser])

  // On app mount: apply cached theme instantly (no flash), then verify session
  useEffect(() => {
    // Instant apply from cache so the correct theme shows before any API call
    applyPaletteToDom(getCurrentPaletteId())
    checkSession()
  }, [checkSession])

  const handleLogout = async () => {
    try {
      await authApi.logout()
    } finally {
      setUser(null)
      clearPaletteCache()
      applyPaletteToDom('campus')
    }
  }

  return (
    <AuthContext.Provider value={{ user, setUser, checkSession, handleLogout, syncPalettes }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
