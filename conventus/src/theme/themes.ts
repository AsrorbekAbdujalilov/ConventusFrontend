export interface Palette {
  id: string
  name: string
  category: 'light' | 'dark'
  primary: string
  secondary: string
  accent: string
  description: string
}

export const PALETTES: Palette[] = [
  { id: 'campus', name: 'Warm Campus', category: 'light', primary: '#4F46E5', secondary: '#F97316', accent: '#FEF3C7', description: 'Cozy study-lounge feel (Default)' },
  { id: 'midnight', name: 'Midnight Focus', category: 'dark', primary: '#6366F1', secondary: '#FB923C', accent: '#FDE68A', description: 'Late-night sessions, low eye strain' },
  { id: 'emerald', name: 'Emerald Growth', category: 'light', primary: '#059669', secondary: '#10B981', accent: '#FEF9C3', description: 'Streaks & positive reinforcement' },
  { id: 'pastel', name: 'Soft Pastel', category: 'light', primary: '#7C3AED', secondary: '#EC4899', accent: '#E0E7FF', description: 'Calm look that lowers study anxiety' },
  { id: 'navy', name: 'Academic Navy', category: 'light', primary: '#1E3A8A', secondary: '#2563EB', accent: '#FEF3C7', description: 'Formal, for schools and teachers' },
  { id: 'sunset', name: 'Sunset Productivity', category: 'light', primary: '#EA580C', secondary: '#D97706', accent: '#FED7AA', description: 'Energy for timers and quizzes' },
  { id: 'ocean', name: 'Ocean Calm', category: 'light', primary: '#0284C7', secondary: '#0D9488', accent: '#BAE6FD', description: 'Clean, distraction-free reading' },
  { id: 'cyber', name: 'Cyber Student', category: 'dark', primary: '#8B5CF6', secondary: '#06B6D4', accent: '#F43F5E', description: 'High-contrast dark mode' },
  { id: 'paper', name: 'Paper & Ink', category: 'light', primary: '#18181B', secondary: '#71717A', accent: '#E4E4E7', description: 'Notes & Markdown view' },
  { id: 'mint', name: 'Mint & Coral', category: 'light', primary: '#0D9488', secondary: '#F43F5E', accent: '#FFE4E6', description: 'Friendly, balanced SaaS look' },
]

const STORAGE_KEY = 'conventus_palette'

export function getInitialPaletteId(): string {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved && PALETTES.some((p) => p.id === saved)) {
      return saved
    }
    // Auto-detect system dark mode -> Midnight Focus
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'midnight'
    }
  } catch {
    // ignore
  }
  return 'campus'
}

export function applyPaletteToDom(paletteId: string): void {
  try {
    if (paletteId === 'campus') {
      document.documentElement.removeAttribute('data-palette')
    } else {
      document.documentElement.dataset.palette = paletteId
    }
    localStorage.setItem(STORAGE_KEY, paletteId)
  } catch {
    // ignore
  }
}
