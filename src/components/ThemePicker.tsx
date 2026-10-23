import { useState, useRef, useEffect } from 'react'
import { PALETTES, getInitialPaletteId, applyPaletteToDom, type Palette } from '../theme/themes'

export function ThemePicker() {
  const [open, setOpen] = useState(false)
  const [currentId, setCurrentId] = useState(getInitialPaletteId)
  const menuRef = useRef<HTMLDivElement>(null)

  const activePalette = PALETTES.find((p) => p.id === currentId) || PALETTES[0]

  useEffect(() => {
    applyPaletteToDom(currentId)
  }, [currentId])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setOpen(false)
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('keydown', handleKeyDown)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  const handleSelect = (palette: Palette) => {
    setCurrentId(palette.id)
    applyPaletteToDom(palette.id)
    setOpen(false)
  }

  return (
    <div ref={menuRef} style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        aria-haspopup="true"
        aria-label="Change color palette"
        className="btn line"
        style={{
          padding: '0.4rem 0.6rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          borderRadius: '0.75rem',
          border: '1px solid var(--border)',
          background: 'var(--card)',
        }}
      >
        <span style={{ display: 'flex' }} aria-hidden="true">
          <span style={{
            width: '1rem',
            height: '1rem',
            borderRadius: '50%',
            backgroundColor: activePalette.primary,
            border: '2px solid var(--card)',
          }} />
          <span style={{
            width: '1rem',
            height: '1rem',
            borderRadius: '50%',
            backgroundColor: activePalette.secondary,
            border: '2px solid var(--card)',
            marginLeft: '-0.35rem',
          }} />
          <span style={{
            width: '1rem',
            height: '1rem',
            borderRadius: '50%',
            backgroundColor: activePalette.accent,
            border: '2px solid var(--card)',
            marginLeft: '-0.35rem',
          }} />
        </span>
        <span style={{ fontSize: '0.8125rem', fontWeight: 500, display: 'none' }} className="theme-label">
          {activePalette.name}
        </span>
      </button>

      {open && (
        <div
          role="menu"
          style={{
            position: 'absolute',
            right: 0,
            top: 'calc(100% + 0.4rem)',
            width: '16.5rem',
            padding: '0.4rem',
            background: 'var(--card)',
            border: '1px solid var(--border)',
            borderRadius: '1.25rem',
            boxShadow: 'var(--shadow)',
            zIndex: 100,
            maxHeight: '22rem',
            overflowY: 'auto',
          }}
        >
          <div style={{ padding: '0.4rem 0.6rem 0.5rem', fontSize: '0.75rem', fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Switch Color Theme
          </div>
          {PALETTES.map((pal) => {
            const isSelected = pal.id === currentId
            return (
              <button
                key={pal.id}
                type="button"
                role="menuitem"
                onClick={() => handleSelect(pal)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  width: '100%',
                  border: 'none',
                  background: isSelected ? 'var(--primary-soft)' : 'transparent',
                  color: isSelected ? 'var(--primary)' : 'var(--text)',
                  textAlign: 'left',
                  padding: '0.5rem 0.75rem',
                  borderRadius: '0.75rem',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  transition: 'background 0.15s',
                }}
              >
                <span style={{ display: 'flex', flexShrink: 0 }}>
                  <span style={{ width: '0.9rem', height: '0.9rem', borderRadius: '50%', backgroundColor: pal.primary, border: '1px solid var(--card)' }} />
                  <span style={{ width: '0.9rem', height: '0.9rem', borderRadius: '50%', backgroundColor: pal.secondary, border: '1px solid var(--card)', marginLeft: '-0.25rem' }} />
                  <span style={{ width: '0.9rem', height: '0.9rem', borderRadius: '50%', backgroundColor: pal.accent, border: '1px solid var(--card)', marginLeft: '-0.25rem' }} />
                </span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: 'block', fontWeight: isSelected ? 600 : 500 }}>
                    {pal.name} {pal.category === 'dark' ? '🌙' : ''}
                  </span>
                  <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {pal.description}
                  </span>
                </span>
                {isSelected && (
                  <span style={{ fontSize: '0.875rem', color: 'var(--primary)', fontWeight: 'bold' }}>✓</span>
                )}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
