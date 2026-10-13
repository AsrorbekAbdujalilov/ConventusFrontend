import { useState, useEffect, useCallback } from 'react'
import { Navbar } from './components/Navbar'
import { HeroSection } from './components/HeroSection'
import { FeaturesOverview } from './components/FeaturesOverview'
import { CommunitySection } from './components/CommunitySection'
import { Footer } from './components/Footer'
import { AuthModal } from './components/AuthModal'
import { ProfileModal } from './components/ProfileModal'
import { ApiDashboard } from './components/ApiDashboard'
import { authApi } from './api'
import type { UserProfile } from './api/types'
import './App.css'

function App() {
  const [user, setUser] = useState<UserProfile | null>(null)
  const [authModalOpen, setAuthModalOpen] = useState(false)
  const [authModalMode, setAuthModalMode] = useState<'login' | 'register'>('login')
  const [profileModalOpen, setProfileModalOpen] = useState(false)
  const [showDevApiDrawer, setShowDevApiDrawer] = useState(false)

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
    setAuthModalMode('login')
    setAuthModalOpen(true)
  }

  const openRegister = () => {
    setAuthModalMode('register')
    setAuthModalOpen(true)
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
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
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
              <div style={{ marginTop: '1.25rem', paddingTop: '1.25rem', borderTop: '1px solid var(--border)' }}>
                <ApiDashboard />
              </div>
            )}
          </section>
        </div>
      </main>

      {/* 3. Extracted Footer */}
      <Footer />

      {/* Auth Modal (Login / Register) */}
      <AuthModal
        isOpen={authModalOpen}
        initialMode={authModalMode}
        onClose={() => setAuthModalOpen(false)}
        onSuccess={(newUser) => {
          setUser(newUser)
        }}
      />

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
