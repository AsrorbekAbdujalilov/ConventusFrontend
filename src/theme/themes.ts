import type { UserPaletteDB } from '../api/types'

export interface Palette {
  id: string            // preset: 'campus' | 'midnight' | … ; custom: 'custom-<dbId>'
  name: string
  category: 'light' | 'dark'
  primary: string
  secondary: string
  accent: string        // Third color
  fourth?: string       // Optional 4th color (at max 4)
  description: string
  isCustom?: boolean
  dbId?: number         // The DB primary key for custom palettes
}

// ──────────────────────────────────────────────────
// BUILT-IN PRESET PALETTES
// ──────────────────────────────────────────────────
export const PALETTES: Palette[] = [
  { id: 'campus',   name: 'Warm Campus',          category: 'light', primary: '#4F46E5', secondary: '#F97316', accent: '#FEF3C7', description: 'Cozy study-lounge feel (Default)' },
  { id: 'midnight', name: 'Midnight Focus',        category: 'dark',  primary: '#6366F1', secondary: '#FB923C', accent: '#FDE68A', description: 'Late-night sessions, low eye strain' },
  { id: 'emerald',  name: 'Emerald Growth',        category: 'light', primary: '#059669', secondary: '#10B981', accent: '#FEF9C3', description: 'Streaks & positive reinforcement' },
  { id: 'pastel',   name: 'Soft Pastel',           category: 'light', primary: '#7C3AED', secondary: '#EC4899', accent: '#E0E7FF', description: 'Calm look that lowers study anxiety' },
  { id: 'navy',     name: 'Academic Navy',         category: 'light', primary: '#1E3A8A', secondary: '#2563EB', accent: '#FEF3C7', description: 'Formal, for schools and teachers' },
  { id: 'sunset',   name: 'Sunset Productivity',   category: 'light', primary: '#EA580C', secondary: '#D97706', accent: '#FED7AA', description: 'Energy for timers and quizzes' },
  { id: 'ocean',    name: 'Ocean Calm',            category: 'light', primary: '#0284C7', secondary: '#0D9488', accent: '#BAE6FD', description: 'Clean, distraction-free reading' },
  { id: 'cyber',    name: 'Cyber Student',         category: 'dark',  primary: '#8B5CF6', secondary: '#06B6D4', accent: '#F43F5E', description: 'High-contrast dark mode' },
  { id: 'paper',    name: 'Paper & Ink',           category: 'light', primary: '#18181B', secondary: '#71717A', accent: '#E4E4E7', description: 'Notes & Markdown view' },
  { id: 'mint',     name: 'Mint & Coral',          category: 'light', primary: '#0D9488', secondary: '#F43F5E', accent: '#FFE4E6', description: 'Friendly, balanced SaaS look' },
]

// ──────────────────────────────────────────────────
// STORAGE KEYS (localStorage = fast-start cache only)
// ──────────────────────────────────────────────────
const STORAGE_KEY_ACTIVE   = 'conventus_palette'
const STORAGE_KEY_CUSTOMS  = 'conventus_custom_palettes_cache'

// ──────────────────────────────────────────────────
// HELPERS
// ──────────────────────────────────────────────────

/** Convert a DB row into a frontend Palette object */
export function dbPaletteToFrontend(db: UserPaletteDB): Palette {
  return {
    id:          `custom-${db.id}`,
    dbId:        db.id,
    name:        db.name,
    category:    db.category,
    primary:     db.color_primary,
    secondary:   db.color_secondary,
    accent:      db.color_accent,
    fourth:      db.color_fourth || undefined,
    description: `Custom ${db.category} theme`,
    isCustom:    true,
  }
}

/** High-contrast readable ink for a given hex background */
export function getContrastColor(hex: string): string {
  try {
    const clean = hex.replace('#', '')
    const full  = clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean
    const r = parseInt(full.substring(0, 2), 16)
    const g = parseInt(full.substring(2, 4), 16)
    const b = parseInt(full.substring(4, 6), 16)
    return (r * 299 + g * 587 + b * 114) / 1000 >= 135 ? '#111827' : '#FFFFFF'
  } catch { return '#FFFFFF' }
}

/** hex → rgba(r,g,b,a) */
export function hexToRgba(hex: string, alpha: number): string {
  try {
    const clean = hex.replace('#', '')
    const full  = clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean
    const r = parseInt(full.substring(0, 2), 16) || 0
    const g = parseInt(full.substring(2, 4), 16) || 0
    const b = parseInt(full.substring(4, 6), 16) || 0
    return `rgba(${r}, ${g}, ${b}, ${alpha})`
  } catch { return hex }
}

// ──────────────────────────────────────────────────
// CACHE HELPERS (localStorage as session cache)
// ──────────────────────────────────────────────────

/** Write custom palettes to localStorage cache */
export function cacheCustomPalettes(palettes: Palette[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_CUSTOMS, JSON.stringify(palettes))
  } catch { /* ignore quota */ }
}

/** Read custom palettes from localStorage cache */
export function getCachedCustomPalettes(): Palette[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CUSTOMS)
    if (raw) return JSON.parse(raw) as Palette[]
  } catch { /* ignore */ }
  return []
}

/** Merge preset + cached-custom palettes */
export function getAllPalettes(): Palette[] {
  return [...PALETTES, ...getCachedCustomPalettes()]
}

/** Clear the custom palette cache (call on logout) */
export function clearPaletteCache(): void {
  try {
    localStorage.removeItem(STORAGE_KEY_CUSTOMS)
    localStorage.removeItem(STORAGE_KEY_ACTIVE)
  } catch { /* ignore */ }
}

// ──────────────────────────────────────────────────
// ACTIVE PALETTE ID
// ──────────────────────────────────────────────────

export function getCurrentPaletteId(): string {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_ACTIVE)
    if (saved) return saved
  } catch { /* ignore */ }
  return getInitialPaletteId()
}

export function getInitialPaletteId(): string {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_ACTIVE)
    if (saved && getAllPalettes().some((p) => p.id === saved)) return saved
    if (window.matchMedia?.('(prefers-color-scheme: dark)').matches) return 'midnight'
  } catch { /* ignore */ }
  return 'campus'
}

// ──────────────────────────────────────────────────
// DOM APPLICATION
// ──────────────────────────────────────────────────

const INLINE_PROPS = [
  '--bg', '--surface', '--card', '--text', '--muted', '--border',
  '--primary', '--primary-ink', '--primary-soft',
  '--secondary', '--on-secondary',
  '--accent', '--accent-ink', '--accent-2',
  'color-scheme',
]

export function applyPaletteToDom(paletteId: string): void {
  try {
    const all   = getAllPalettes()
    const found = all.find((p) => p.id === paletteId)

    if (found?.isCustom) {
      const root    = document.documentElement.style
      const isDark  = found.category === 'dark'

      root.setProperty('--primary',      found.primary)
      root.setProperty('--primary-ink',  getContrastColor(found.primary))
      root.setProperty('--primary-soft', hexToRgba(found.primary, isDark ? 0.25 : 0.12))

      root.setProperty('--secondary',    found.secondary)
      root.setProperty('--on-secondary', getContrastColor(found.secondary))

      root.setProperty('--accent',       found.accent)
      root.setProperty('--accent-ink',   getContrastColor(found.accent))

      if (found.fourth) {
        root.setProperty('--accent-2', found.fourth)
        root.setProperty('--border', isDark ? hexToRgba(found.fourth, 0.35) : hexToRgba(found.fourth, 0.5))
      } else {
        root.setProperty('--accent-2', found.accent)
        root.setProperty('--border', isDark ? '#334155' : '#E5E7EB')
      }

      if (isDark) {
        root.setProperty('--bg',           '#0F172A')
        root.setProperty('--surface',      '#1E293B')
        root.setProperty('--card',         '#1E293B')
        root.setProperty('--text',         '#F8FAFC')
        root.setProperty('--muted',        '#A5B1C5')
        root.setProperty('color-scheme',   'dark')
      } else {
        root.setProperty('--bg',           '#FFFFFF')
        root.setProperty('--surface',      '#F6F7FB')
        root.setProperty('--card',         '#FFFFFF')
        root.setProperty('--text',         '#111827')
        root.setProperty('--muted',        '#5B6472')
        root.setProperty('color-scheme',   'light')
      }
      document.documentElement.dataset.palette = found.id
    } else {
      // Preset — strip inline overrides so CSS classes take over
      const root = document.documentElement.style
      INLINE_PROPS.forEach((p) => root.removeProperty(p))
      if (paletteId === 'campus') {
        document.documentElement.removeAttribute('data-palette')
      } else {
        document.documentElement.dataset.palette = paletteId
      }
    }

    localStorage.setItem(STORAGE_KEY_ACTIVE, paletteId)
    window.dispatchEvent(new CustomEvent('conventus_palettes_changed', { detail: { activeId: paletteId } }))
  } catch { /* ignore */ }
}
