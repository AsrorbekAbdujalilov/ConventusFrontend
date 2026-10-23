import { useState, useRef, useEffect } from 'react'
import {
  getAllPalettes,
  getCurrentPaletteId,
  applyPaletteToDom,
  type Palette,
} from '../theme/themes'
import { authApi } from '../api'

export function ThemePicker() {
  const [open,      setOpen]      = useState(false)
  const [palettes,  setPalettes]  = useState<Palette[]>(getAllPalettes)
  const [currentId, setCurrentId] = useState<string>(getCurrentPaletteId)
  const menuRef = useRef<HTMLDivElement>(null)

  const activePalette = palettes.find((p) => p.id === currentId) || palettes[0]

  // Apply on mount
  useEffect(() => {
    applyPaletteToDom(currentId)
  }, [currentId])

  // Refresh list whenever palettes change (login sync, studio save, delete)
  useEffect(() => {
    const handler = () => {
      setPalettes(getAllPalettes())
      setCurrentId(getCurrentPaletteId())
    }
    window.addEventListener('conventus_palettes_changed', handler)
    return () => window.removeEventListener('conventus_palettes_changed', handler)
  }, [])

  // Close on outside click / Escape
  useEffect(() => {
    if (!open) return
    function onClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false)
    }
    function onEsc(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    document.addEventListener('keydown', onEsc)
    return () => {
      document.removeEventListener('mousedown', onClickOutside)
      document.removeEventListener('keydown', onEsc)
    }
  }, [open])

  const handleSelect = async (palette: Palette) => {
    setCurrentId(palette.id)
    applyPaletteToDom(palette.id)
    setOpen(false)
    // Persist active palette to DB (fire-and-forget, non-blocking)
    try {
      await authApi.setActivePalette(palette.id)
    } catch { /* non-critical */ }
  }

  const Dot = ({ color, first = false }: { color: string; first?: boolean }) => (
    <span style={{
      width: '0.9rem', height: '0.9rem',
      borderRadius: '50%', backgroundColor: color,
      border: '1px solid var(--card)',
      marginLeft: first ? 0 : '-0.25rem',
      flexShrink: 0,
    }} />
  )

  return (
    <div ref={menuRef} style={{ position: 'relative' }}>
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        aria-haspopup="true"
        aria-label="Change color palette"
        className="btn line"
        style={{ padding: '0.4rem 0.6rem', display: 'flex', alignItems: 'center', gap: '0.5rem', borderRadius: '0.75rem', border: '1px solid var(--border)', background: 'var(--card)' }}
      >
        <span style={{ display: 'flex' }}>
          <Dot color={activePalette.primary} first />
          <Dot color={activePalette.secondary} />
          <Dot color={activePalette.accent} />
          {activePalette.fourth && <Dot color={activePalette.fourth} />}
        </span>
        <span style={{ fontSize: '0.8125rem', fontWeight: 500, display: 'none' }} className="theme-label">
          {activePalette.name}
        </span>
      </button>

      {/* Dropdown */}
      {open && (
        <div
          role="menu"
          style={{
            position: 'absolute', right: 0, top: 'calc(100% + 0.4rem)',
            width: '18rem', padding: '0.4rem',
            background: 'var(--card)', border: '1px solid var(--border)',
            borderRadius: '1.25rem', boxShadow: 'var(--shadow)',
            zIndex: 100, maxHeight: '24rem', overflowY: 'auto',
          }}
        >
          <div style={{ padding: '0.4rem 0.6rem 0.5rem', fontSize: '0.75rem', fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Switch Color Theme
          </div>

          {palettes.map((pal) => {
            const isSelected = pal.id === currentId
            return (
              <button
                key={pal.id}
                type="button"
                role="menuitem"
                onClick={() => handleSelect(pal)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.75rem',
                  width: '100%', border: 'none',
                  background: isSelected ? 'var(--primary-soft)' : 'transparent',
                  color: isSelected ? 'var(--primary)' : 'var(--text)',
                  textAlign: 'left', padding: '0.5rem 0.75rem',
                  borderRadius: '0.75rem', cursor: 'pointer',
                  fontSize: '0.875rem', transition: 'background 0.15s',
                }}
              >
                <span style={{ display: 'flex', flexShrink: 0 }}>
                  <Dot color={pal.primary} first />
                  <Dot color={pal.secondary} />
                  <Dot color={pal.accent} />
                  {pal.fourth && <Dot color={pal.fourth} />}
                </span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontWeight: isSelected ? 600 : 500 }}>
                    <span>{pal.name}</span>
                    {pal.category === 'dark' && '🌙'}
                    {pal.isCustom && (
                      <span style={{ fontSize: '0.6875rem', padding: '0.1rem 0.35rem', borderRadius: '0.25rem', background: 'var(--primary)', color: 'var(--primary-ink)', fontWeight: 700, lineHeight: 1 }}>
                        Custom
                      </span>
                    )}
                  </span>
                  <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {pal.description}
                  </span>
                </span>
                {isSelected && <span style={{ fontSize: '0.875rem', color: 'var(--primary)', fontWeight: 'bold' }}>✓</span>}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
