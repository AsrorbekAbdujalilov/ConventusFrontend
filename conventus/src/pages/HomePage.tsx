import { useState } from 'react'
import { HeroSection } from '../components/HeroSection'
import { FeaturesOverview } from '../components/FeaturesOverview'
import { CommunitySection } from '../components/CommunitySection'
import { ApiDashboard } from '../components/ApiDashboard'

export function HomePage() {
  const [showDevApiDrawer, setShowDevApiDrawer] = useState(false)

  return (
    <div className="wrap">
      <HeroSection
        onStartClick={() => {
          const el = document.getElementById('features')
          if (el) el.scrollIntoView({ behavior: 'smooth' })
        }}
      />

      <FeaturesOverview />

      <CommunitySection />

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
              Verify live connection to Django backend with HttpOnly cookies &amp; WebSockets.
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
  )
}
