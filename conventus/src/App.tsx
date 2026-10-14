import { useState, useEffect, useCallback } from 'react'
import { Navbar } from './components/Navbar'
import { HeroSection } from './components/HeroSection'
import { FeaturesOverview } from './components/FeaturesOverview'
import { CommunitySection } from './components/CommunitySection'
import { Footer } from './components/Footer'
import { AuthView } from './components/AuthView'
import { ProfileModal } from './components/ProfileModal'
import { ApiDashboard } from './components/ApiDashboard'
import { authApi } from './api'
import type { UserProfile } from './api/types'
import './App.css'

function App() {
  const [user, setUser] = useState<UserProfile | null>(null)
  const [currentView, setCurrentView] = useState<'home' | 'auth'>(() => {
    const hash = window.location.hash
    return hash === '#login' || hash === '#register' ? 'auth' : 'home'
  })
  const [authMode, setAuthMode] = useState<'login' | 'register'>(() => {
    return window.location.hash === '#register' ? 'register' : 'login'
  })
  const [profileModalOpen, setProfileModalOpen] = useState(false)
  const [showDevApiDrawer, setShowDevApiDrawer] = useState(false)

  // Sync view state with URL hash
  useEffect(() => {
    function handleHashChange() {
      const hash = window.location.hash
      if (hash === '#register') {
        setCurrentView('auth')
        setAuthMode('register')
      } else if (hash === '#login') {
        setCurrentView('auth')
        setAuthMode('login')
      } else if (hash === '#top' || hash === '' || hash.startsWith('#feature')) {
        setCurrentView('home')
      }
    }

    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [])

  // Verify session on initial load via HttpOnly cookie
  const checkSession = useCallback(async () => {
    try {
      const res = await authApi.checkStatus()
      if (res.authenticated && res.user) {
        setUser(res.user)
      } else {
        setUser(null)
      }
    } catch {
      setUser(null)
    }
  }, [])

  useEffect(() => {
    checkSession()
  }, [checkSession])

  const handleLogout = async () => {
    try {
      await authApi.logout()
    } finally {
      setUser(null)
      setProfileModalOpen(false)
    }
  }

  const openLogin = () => {
    setAuthMode('login')
    setCurrentView('auth')
    window.location.hash = 'login'
  }

  const openRegister = () => {
    setAuthMode('register')
    setCurrentView('auth')
    window.location.hash = 'register'
  }

  const goToHome = () => {
    setCurrentView('home')
    window.location.hash = 'top'
  }

  return (
    <div className="app-container">
      {/* 1. Extracted Navbar (64px sticky, solid bg, 1px border, theme picker, dropdowns) */}
      <Navbar
        user={user}
        onLoginClick={openLogin}
        onRegisterClick={openRegister}
        onLogout={handleLogout}
        onProfileClick={() => setProfileModalOpen(true)}
      />

      {/* 2. Main Page Content */}
      <main className="main-content" id="top">
        {currentView === 'auth' ? (
          /* Conventus Auth Page (conventus-auth.html) */
          <AuthView
            initialMode={authMode}
            onSuccess={(newUser) => {
              setUser(newUser)
              goToHome()
            }}
            onSwitchToHome={goToHome}
          />
        ) : (
          /* Conventus Home Page */
          <div className="wrap">
            {/* Hero Section: Meaning of Conventus (Assembly/Meeting point of all study tools) + Flashcard */}
            <HeroSection
              onStartClick={() => {
                const el = document.getElementById('features')
                if (el) el.scrollIntoView({ behavior: 'smooth' })
              }}
            />

            {/* Section: Features Overview (Introducing all 7 Navbar suites) */}
            <FeaturesOverview />

            {/* Section: Co-Creator Shoutouts & Interactive Community Votes */}
            <CommunitySection />

            {/* Developer / API Connection Drawer Toggle */}
            <section
              style={{
                marginTop: '2rem',
                padding: '1.25rem',
                backgroundColor: 'var(--surface)',
                borderRadius: '1rem',
                border: '1px solid var(--border)',
                textAlign: 'center',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '0.75rem',
                }}
              >
                <div style={{ textAlign: 'left' }}>
                  <strong style={{ fontSize: '0.9375rem', color: 'var(--text)' }}>
                    Backend REST API Inspection &amp; Live Status
                  </strong>
                  <p style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--muted)' }}>
                    Verify live connection to Django backend with HttpOnly cookies.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setShowDevApiDrawer((prev) => !prev)}
                  className="btn line"
                  style={{ fontSize: '0.8125rem', padding: '0.4rem 0.8rem' }}
                >
                  {showDevApiDrawer ? 'Hide API Inspector ▲' : 'Open Live API Inspector ▼'}
                </button>
              </div>

              {showDevApiDrawer && (
                <div
                  style={{
                    marginTop: '1.25rem',
                    paddingTop: '1.25rem',
                    borderTop: '1px solid var(--border)',
                  }}
                >
                  <ApiDashboard />
                </div>
              )}
            </section>
          </div>
        )}
      </main>

      {/* 3. Extracted Footer */}
      <Footer />

      {/* Profile Details Modal */}
      <ProfileModal
        isOpen={profileModalOpen}
        user={user}
        onClose={() => setProfileModalOpen(false)}
        onLogout={handleLogout}
      />
    </div>
  )
}

export default App
