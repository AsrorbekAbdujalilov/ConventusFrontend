import { useState, useEffect } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { arenaApi } from '../api'

export type GameModeId =
  | 'classic'
  | 'pharaoh'
  | 'tictactoe'
  | 'academic_deception'
  | 'duel_league'
  | 'land_rush'

interface GameTypeOption {
  id: GameModeId
  title: string
  badge: string
  subtitle: string
  description: string
  icon: string
  themeColor: string
}

const GAME_TYPES: GameTypeOption[] = [
  {
    id: 'classic',
    title: 'Classic Quiz Arena',
    badge: 'Default Mode',
    subtitle: 'Answer fast, score points & live dashboard',
    description: 'Fast-paced trivia with speed and rank scoring. The host gets a teacher dashboard with touching circles, vertical/horizontal bars, tables and scatter plots.',
    icon: '📊',
    themeColor: '#4338ca',
  },
  {
    id: 'pharaoh',
    title: "Pharaoh's Labyrinth",
    badge: 'Adventure',
    subtitle: 'Procedural maze exploration with step economy',
    description: 'Players navigate an ancient labyrinth using the growing-tree algorithm. Correct answers earn steps, wall passes, and teleports to reach the golden exit.',
    icon: '🏺',
    themeColor: '#c2691a',
  },
  {
    id: 'tictactoe',
    title: 'Tic-Tac-Toe Ultimate',
    badge: 'Strategy',
    subtitle: 'N×N grid with K-in-a-row multi-player streaks',
    description: 'Compete on custom N×N grids (3×3 up to 20×20) to score K consecutive marks. Points awarded by finish order with smart bot heuristics.',
    icon: '❌',
    themeColor: '#5c5ce6',
  },
  {
    id: 'academic_deception',
    title: 'Academic Deception',
    badge: 'Social Mystery',
    subtitle: 'Town vs Saboteurs social deduction',
    description: 'Saboteurs hide among scholars. Quests earn team pools; night phases trigger secret inspections, shields, and eliminations with discussion and voting.',
    icon: '🕵️',
    themeColor: '#ee7164',
  },
  {
    id: 'duel_league',
    title: 'Duel League',
    badge: 'Swiss League',
    subtitle: 'Head-to-head speed duels with Swiss pairings',
    description: 'Non-repeating Swiss tournament pairings where players duel simultaneously. Points reward both correctness and reaction speed.',
    icon: '⚔️',
    themeColor: '#1862ab',
  },
  {
    id: 'land_rush',
    title: 'Land Rush',
    badge: 'Territory Conquest',
    subtitle: 'Hexagonal map claiming and border battles',
    description: 'Claim neutral hexagonal tiles by answering correctly, then battle opponents to steal their border tiles until only the victor remains.',
    icon: '⬡',
    themeColor: '#2b6cb0',
  },
]

export function GameTypeSelectPage() {
  const { code: routeCode } = useParams<{ code?: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const code = (routeCode || '').trim().toUpperCase()

  const navState = (location.state || {}) as { isHost?: boolean }
  const storageKey = `conventus_game_${code}`
  const savedState = (() => {
    try {
      const data = sessionStorage.getItem(storageKey)
      return data ? JSON.parse(data) : {}
    } catch {
      return {}
    }
  })()

  const isHost = navState.isHost ?? savedState.isHost ?? false

  useEffect(() => {
    if (!code) {
      navigate('/arena')
    } else if (!isHost) {
      navigate(`/arena/live/${code}`)
    }
  }, [code, isHost, navigate])

  const [selectedType, setSelectedType] = useState<GameModeId>('classic')
  const [playerCount, setPlayerCount] = useState<number>(0)

  useEffect(() => {
    if (code) {
      arenaApi.getGamePlayers(code)
        .then((r) => setPlayerCount(r.length))
        .catch(() => {})
    }
  }, [code])

  const handleProceedToSettings = () => {
    navigate(`/arena/live/${code}/settings/${selectedType}`, {
      state: { isHost: true },
    })
  }

  return (
    <div className="arena-live-room" style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      {/* Top HUD */}
      <header className="arena-live-hud">
        <div className="arena-live-hud-brand">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
          <span>Step 1 of 2: Choose Game Type</span>
        </div>

        <div className="arena-live-hud-center">
          <span className="arena-live-pin-chip">
            <span className="arena-pulse-dot" />
            PIN: {code}
          </span>
          <span style={{ fontSize: '0.875rem', color: 'var(--muted)', fontWeight: 600 }}>
            {playerCount} {playerCount === 1 ? 'player' : 'players'} waiting
          </span>
        </div>

        <div className="arena-live-hud-right">
          <button
            type="button"
            className="btn ghost"
            onClick={() => navigate(`/arena/live/${code}`)}
          >
            ← Back to Lobby
          </button>
        </div>
      </header>

      {/* Main Choice Section */}
      <main style={{ maxWidth: '64rem', margin: '0 auto', width: '100%', padding: '2.5rem 1.5rem 4rem' }}>
        <div style={{ marginBottom: '2rem' }}>
          <span style={{ fontSize: '0.8125rem', fontFamily: 'var(--f-mono)', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Host Match Configuration
          </span>
          <h1 style={{ fontSize: '2.2rem', fontWeight: 800, margin: '0.25rem 0 0.5rem', letterSpacing: '-0.02em' }}>
            Select Game Type
          </h1>
          <p style={{ color: 'var(--muted)', margin: 0, fontSize: '1rem', maxWidth: '44rem' }}>
            First select which game type to host. On the next page, you will configure its exact native settings.
          </p>
        </div>

        {/* 6 Game Mode Cards */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(18rem, 1fr))',
            gap: '1.25rem',
            marginBottom: '2.5rem',
          }}
        >
          {GAME_TYPES.map((type) => {
            const isSelected = selectedType === type.id
            return (
              <div
                key={type.id}
                onClick={() => setSelectedType(type.id)}
                style={{
                  background: isSelected ? 'var(--card)' : 'var(--surface)',
                  border: isSelected ? `2px solid ${type.themeColor}` : '1px solid var(--border)',
                  borderRadius: 'var(--radius-xl)',
                  padding: '1.5rem',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  boxShadow: isSelected ? `0 0 0 1px ${type.themeColor}, 0 10px 24px rgba(0,0,0,0.12)` : 'var(--shadow-sm)',
                  transition: 'all 0.18s ease-in-out',
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
                    <span
                      style={{
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        padding: '0.25rem 0.6rem',
                        borderRadius: '999px',
                        background: isSelected ? type.themeColor : 'var(--surface2, rgba(0,0,0,0.06))',
                        color: isSelected ? '#fff' : 'var(--muted)',
                        border: '1px solid transparent',
                      }}
                    >
                      {type.badge}
                    </span>
                    <span style={{ fontSize: '1.5rem' }}>{type.icon}</span>
                  </div>

                  <h3 style={{ fontSize: '1.3rem', fontWeight: 700, margin: '0 0 0.35rem' }}>
                    {type.title}
                  </h3>
                  <p style={{ fontSize: '0.875rem', color: 'var(--muted)', margin: '0 0 0.75rem', fontWeight: 500 }}>
                    {type.subtitle}
                  </p>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text)', opacity: 0.85, margin: 0, lineHeight: 1.45 }}>
                    {type.description}
                  </p>
                </div>

                <div style={{ marginTop: '1.25rem', paddingTop: '0.85rem', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.8125rem', color: isSelected ? type.themeColor : 'var(--muted)', fontWeight: 600 }}>
                    {isSelected ? '✓ Selected' : 'Click to select'}
                  </span>
                  <span style={{ fontSize: '1rem', color: isSelected ? type.themeColor : 'var(--muted)' }}>
                    ➔
                  </span>
                </div>
              </div>
            )
          })}
        </div>

        {/* Footer controls */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <button
            type="button"
            className="btn ghost"
            onClick={() => navigate(`/arena/live/${code}`)}
          >
            ← Cancel & Return to Lobby
          </button>

          <button
            type="button"
            className="btn primary big"
            style={{ fontWeight: 800, paddingInline: '2.5rem', fontSize: '1.1rem' }}
            onClick={handleProceedToSettings}
          >
            Configure Settings for {GAME_TYPES.find((g) => g.id === selectedType)?.title} ➔
          </button>
        </div>
      </main>
    </div>
  )
}
