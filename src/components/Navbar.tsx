import { useState, useRef, useEffect } from 'react'
import { ThemePicker } from './ThemePicker'
import type { UserProfile } from '../api/types'

export interface NavbarProps {
  user: UserProfile | null
  onLoginClick: () => void
  onRegisterClick: () => void
  onLogout: () => void
  onProfileClick: () => void
}

export const NAV_ITEMS = [
  {
    key: 'classroom',
    title: 'Classroom',
    items: [
      { title: 'Open classroom', desc: 'Start a room for your class or study group', href: '/classrooms' },
      { title: 'Join classroom', desc: 'Enter with a room ID from your teacher', href: '/classrooms' },
      { title: 'Classroom hub', desc: 'Manage messages, tasks and student activity', href: '/classrooms' },
    ],
  },
  {
    key: 'games',
    title: 'Games',
    items: [
      { title: 'Join lobby', desc: 'Jump into a game with a PIN', href: '/arena?tab=join' },
      { title: 'Host match', desc: 'Launch a multiplayer session from your library', href: '/arena?tab=host' },
      { title: 'Deck creator', desc: 'Create questions & multiple choices', href: '/arena?tab=create' },
      { title: 'Deck library', desc: 'Browse your decks and community decks', href: '/arena?tab=decks' },
    ],
  },
  {
    key: 'notes',
    title: 'Notes',
    items: [
      { title: 'My notes', desc: 'Everything you have written', href: '/' },
      { title: 'Review', desc: 'Turn notes into flashcards and recall prompts', href: '/' },
      { title: 'Discover', desc: 'Notes shared by the community', href: '/' },
    ],
  },
  {
    key: 'assessments',
    title: 'Assessments',
    items: [
      { title: 'Create assessment', desc: 'Build a quiz or exam with custom rubrics', href: '/' },
      { title: 'Assessment checker', desc: 'Upload answers and get automated grading', href: '/' },
      { title: 'My assessments', desc: 'Drafts, published papers, and tests', href: '/' },
      { title: 'Library & question banks', desc: 'Reusable question banks & templates', href: '/' },
      { title: 'History & progress', desc: 'Analytics and student improvement curves', href: '/' },
    ],
  },
  {
    key: 'prepare',
    title: 'Prepare',
    items: [
      { title: 'Direct chat', desc: 'Ask questions about your material', href: '/' },
      { title: 'Tests', desc: 'Practice tests by subject', href: '/' },
      { title: 'Study plan', desc: 'A schedule that works back from your exam', href: '/' },
    ],
  },
  {
    key: 'focus',
    title: 'Focus',
    items: [
      { title: 'Focus timer', desc: 'Pomodoro timer and stopwatch for study sessions', href: '/focus' },
      { title: 'Deep Focus', desc: 'A calm workspace for your next study session', href: '/focus' },
      { title: 'Study music', desc: 'Gentle, locally generated focus music', href: '/focus' },
    ],
  },
]

export function Navbar({
  user,
  onLoginClick,
  onRegisterClick,
  onLogout,
  onProfileClick,
}: NavbarProps) {
  const [openMenuKey, setOpenMenuKey] = useState<string | null>(null)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false)
  const closeTimeoutRef = useRef<number | null>(null)
  const navRef = useRef<HTMLElement>(null)

  // Close menus on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (navRef.current && !navRef.current.contains(e.target as Node)) {
        setOpenMenuKey(null)
        setUserMenuOpen(false)
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setOpenMenuKey(null)
        setUserMenuOpen(false)
        setMobileDrawerOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  const handleMouseEnter = (key: string) => {
    if (window.matchMedia('(hover: hover)').matches) {
      if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current)
      setOpenMenuKey(key)
    }
  }

  const handleMouseLeave = () => {
    if (window.matchMedia('(hover: hover)').matches) {
      closeTimeoutRef.current = window.setTimeout(() => {
        setOpenMenuKey(null)
      }, 150)
    }
  }

  const getInitials = (name?: string) => {
    if (!name) return 'U'
    return name.slice(0, 2).toUpperCase()
  }

  return (
    <header
      ref={navRef}
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        backgroundColor: 'var(--bg)',
        borderBottom: '1px solid var(--border)',
        width: '100%',
      }}
    >
      <div className="wrap" style={{ height: '4rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem' }}>
        {/* Left: Logo & Wordmark */}
        <a
          href="/"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem',
            fontFamily: 'var(--f-display)',
            fontWeight: 700,
            fontSize: '1.25rem',
            color: 'var(--text)',
            textDecoration: 'none',
            flexShrink: 0,
          }}
          aria-label="Conventus home"
        >
          <span
            style={{
              display: 'grid',
              placeItems: 'center',
              width: '2rem',
              height: '2rem',
              borderRadius: '0.75rem',
              backgroundColor: 'var(--primary)',
              color: 'var(--primary-ink)',
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 8l9-4 9 4-9 4-9-4z" />
              <path d="M7 10.5V15c0 1.5 2.2 3 5 3s5-1.500 5-3v-4.500" />
            </svg>
          </span>
          Conventus
        </a>

        {/* Center: Desktop Navigation Menus */}
        <nav
          style={{ display: 'none', alignItems: 'center', gap: '0.2rem' }}
          className="desktop-menu-nav"
          aria-label="Main navigation"
        >
          {NAV_ITEMS.map((item) => {
            const isOpen = openMenuKey === item.key
            return (
              <div
                key={item.key}
                style={{ position: 'relative' }}
                onMouseEnter={() => handleMouseEnter(item.key)}
                onMouseLeave={handleMouseLeave}
              >
                <button
                  type="button"
                  onClick={() => setOpenMenuKey(isOpen ? null : item.key)}
                  aria-expanded={isOpen}
                  aria-haspopup="true"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.3rem',
                    border: 'none',
                    background: isOpen ? 'var(--primary-soft)' : 'none',
                    color: isOpen ? 'var(--primary)' : 'var(--text)',
                    padding: '0.5rem 0.65rem',
                    borderRadius: '0.75rem',
                    fontWeight: 500,
                    fontSize: '0.9375rem',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    flexShrink: 0,
                    transition: 'background 0.15s, color 0.15s',
                  }}
                >
                  {item.title}
                  <svg
                    width="13"
                    height="13"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{
                      transform: isOpen ? 'rotate(180deg)' : 'none',
                      transition: 'transform 0.2s',
                    }}
                  >
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </button>

                {/* Dropdown Panel */}
                {isOpen && (
                  <div
                    role="menu"
                    style={{
                      position: 'absolute',
                      left: 0,
                      top: 'calc(100% + 0.35rem)',
                      minWidth: '17.5rem',
                      padding: '0.5rem',
                      backgroundColor: 'var(--card)',
                      border: '1px solid var(--border)',
                      borderRadius: '1.25rem',
                      boxShadow: 'var(--shadow)',
                      zIndex: 100,
                    }}
                  >
                    {item.items.map((sub) => (
                      <a
                        key={sub.title}
                        role="menuitem"
                        href={sub.href}
                        onClick={() => setOpenMenuKey(null)}
                        style={{
                          display: 'block',
                          padding: '0.6rem 0.75rem',
                          borderRadius: '0.75rem',
                          textDecoration: 'none',
                          color: 'var(--text)',
                          transition: 'background 0.15s',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = 'var(--primary-soft)'
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'transparent'
                        }}
                      >
                        <b style={{ display: 'block', fontWeight: 600, fontSize: '0.9375rem' }}>
                          {sub.title}
                        </b>
                        <small style={{ display: 'block', color: 'var(--muted)', fontSize: '0.8125rem', lineHeight: 1.35, marginTop: '0.1rem' }}>
                          {sub.desc}
                        </small>
                      </a>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </nav>

        {/* Right: Theme picker + Auth + Mobile toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginLeft: 'auto' }}>
          {/* Theme Picker */}
          <ThemePicker />

          {/* Account Area (Desktop) */}
          <div className="auth-desktop-slot" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {user ? (
              <div style={{ position: 'relative' }}>
                <button
                  type="button"
                  onClick={() => setUserMenuOpen((prev) => !prev)}
                  aria-expanded={userMenuOpen}
                  aria-haspopup="true"
                  className="profile-btn"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    border: '1px solid var(--border)',
                    background: 'var(--card)',
                    borderRadius: '999px',
                    padding: '0.25rem 0.7rem 0.25rem 0.25rem',
                    cursor: 'pointer',
                  }}
                >
                  <span
                    style={{
                      display: 'grid',
                      placeItems: 'center',
                      width: '2rem',
                      height: '2rem',
                      borderRadius: '50%',
                      backgroundColor: 'var(--secondary)',
                      color: 'var(--on-secondary)',
                      fontFamily: 'var(--f-display)',
                      fontWeight: 600,
                      fontSize: '0.875rem',
                    }}
                  >
                    {getInitials(user.username)}
                  </span>
                  <span style={{ fontWeight: 500, fontSize: '0.9375rem', color: 'var(--text)' }}>
                    {user.username}
                  </span>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </button>

                {userMenuOpen && (
                  <div
                    role="menu"
                    style={{
                      position: 'absolute',
                      right: 0,
                      top: 'calc(100% + 0.35rem)',
                      minWidth: '15rem',
                      padding: '0.5rem',
                      backgroundColor: 'var(--card)',
                      border: '1px solid var(--border)',
                      borderRadius: '1.25rem',
                      boxShadow: 'var(--shadow)',
                      zIndex: 100,
                    }}
                  >
                    <div style={{ padding: '0.5rem 0.75rem' }}>
                      <b style={{ display: 'block', fontSize: '0.9375rem' }}>{user.username}</b>
                      <small style={{ color: 'var(--muted)', fontSize: '0.8125rem' }}>{user.email || 'Free Student Plan'}</small>
                    </div>
                    <span
                      style={{
                        fontFamily: 'var(--f-mono)',
                        fontSize: '0.8125rem',
                        fontWeight: 500,
                        color: 'var(--accent-ink)',
                        backgroundColor: 'var(--accent)',
                        borderRadius: '999px',
                        padding: '0.15rem 0.6rem',
                        display: 'inline-block',
                        margin: '0.2rem 0.75rem 0.4rem',
                      }}
                    >
                      🔥 12-day streak
                    </span>
                    <hr style={{ border: 0, borderTop: '1px solid var(--border)', margin: '0.4rem 0.25rem' }} />
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setUserMenuOpen(false)
                        onProfileClick()
                      }}
                      style={{
                        display: 'block',
                        width: '100%',
                        textAlign: 'left',
                        padding: '0.5rem 0.75rem',
                        borderRadius: '0.75rem',
                        border: 'none',
                        background: 'none',
                        cursor: 'pointer',
                        color: 'var(--text)',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = 'var(--primary-soft)'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent'
                      }}
                    >
                      <b>My Profile &amp; Bio</b>
                    </button>
                    <a
                      role="menuitem"
                      href="/"
                      onClick={() => setUserMenuOpen(false)}
                      style={{
                        display: 'block',
                        padding: '0.5rem 0.75rem',
                        borderRadius: '0.75rem',
                        color: 'var(--text)',
                        textDecoration: 'none',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = 'var(--primary-soft)'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent'
                      }}
                    >
                      <b>My Classrooms</b>
                    </a>
                    <hr style={{ border: 0, borderTop: '1px solid var(--border)', margin: '0.4rem 0.25rem' }} />
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setUserMenuOpen(false)
                        onLogout()
                      }}
                      style={{
                        display: 'block',
                        width: '100%',
                        textAlign: 'left',
                        padding: '0.5rem 0.75rem',
                        borderRadius: '0.75rem',
                        border: 'none',
                        background: 'none',
                        color: '#ef4444',
                        cursor: 'pointer',
                        fontWeight: 600,
                      }}
                    >
                      Log out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <>
                <button
                  type="button"
                  onClick={onLoginClick}
                  className="btn ghost"
                >
                  Log in
                </button>
                <button
                  type="button"
                  onClick={onRegisterClick}
                  className="btn primary"
                >
                  Register
                </button>
              </>
            )}
          </div>

          {/* Hamburger button on Mobile */}
          <button
            type="button"
            className="burger-btn"
            onClick={() => setMobileDrawerOpen((prev) => !prev)}
            aria-label="Toggle navigation drawer"
            aria-expanded={mobileDrawerOpen}
            style={{
              display: 'grid',
              placeItems: 'center',
              width: '2.5rem',
              height: '2.5rem',
              border: '1px solid var(--border)',
              background: 'var(--card)',
              borderRadius: '0.75rem',
              cursor: 'pointer',
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              {mobileDrawerOpen ? (
                <path d="M18 6L6 18M6 6l12 12" />
              ) : (
                <path d="M4 7h16M4 12h16M4 17h16" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile Drawer Navigation */}
      {mobileDrawerOpen && (
        <nav
          aria-label="Mobile navigation drawer"
          style={{
            borderTop: '1px solid var(--border)',
            backgroundColor: 'var(--bg)',
            maxHeight: 'calc(100dvh - 4rem)',
            overflowY: 'auto',
            padding: '0.75rem 1rem 1.5rem',
          }}
        >
          <div className="wrap">
            {NAV_ITEMS.map((section) => (
              <details
                key={section.key}
                style={{ borderBottom: '1px solid var(--border)' }}
              >
                <summary
                  style={{
                    listStyle: 'none',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '0.9rem 0.25rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    color: 'var(--text)',
                  }}
                >
                  <span>{section.title}</span>
                  <span style={{ fontFamily: 'var(--f-mono)', color: 'var(--muted)', fontSize: '1.25rem' }}>+</span>
                </summary>
                <div style={{ paddingBottom: '0.6rem' }}>
                  {section.items.map((sub) => (
                    <a
                      key={sub.title}
                      href={sub.href}
                      onClick={() => setMobileDrawerOpen(false)}
                      style={{
                        display: 'block',
                        padding: '0.55rem 0.75rem',
                        borderRadius: '0.75rem',
                        color: 'var(--muted)',
                        textDecoration: 'none',
                        fontSize: '0.9375rem',
                      }}
                    >
                      <strong style={{ display: 'block', color: 'var(--text)' }}>{sub.title}</strong>
                      <span style={{ fontSize: '0.8125rem' }}>{sub.desc}</span>
                    </a>
                  ))}
                </div>
              </details>
            ))}

            {/* Mobile Auth actions */}
            <div style={{ paddingTop: '1.25rem', display: 'flex', gap: '0.5rem' }}>
              {user ? (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setMobileDrawerOpen(false)
                      onProfileClick()
                    }}
                    className="btn line"
                    style={{ flex: 1 }}
                  >
                    Profile ({user.username})
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMobileDrawerOpen(false)
                      onLogout()
                    }}
                    className="btn ghost"
                    style={{ flex: 1, color: '#ef4444' }}
                  >
                    Log out
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setMobileDrawerOpen(false)
                      onLoginClick()
                    }}
                    className="btn line"
                    style={{ flex: 1 }}
                  >
                    Log in
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMobileDrawerOpen(false)
                      onRegisterClick()
                    }}
                    className="btn primary"
                    style={{ flex: 1 }}
                  >
                    Register
                  </button>
                </>
              )}
            </div>
          </div>
        </nav>
      )}

      {/* Style overrides for responsive media queries */}
      <style>{`
        @media (min-width: 68rem) {
          .desktop-menu-nav {
            display: flex !important;
          }
          .burger-btn {
            display: none !important;
          }
        }
        @media (max-width: 67.99rem) {
          .desktop-menu-nav {
            display: none !important;
          }
          .auth-desktop-slot {
            display: none !important;
          }
          .burger-btn {
            display: grid !important;
          }
        }
      `}</style>
    </header>
  )
}
