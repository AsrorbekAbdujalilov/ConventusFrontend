import { useState, useRef, useEffect } from 'react'

export type GameModeId =
  | 'classic'
  | 'pharaoh'
  | 'tictactoe'
  | 'academic_deception'
  | 'duel_league'
  | 'land_rush'

interface GameIframeViewProps {
  gameMode: GameModeId
  settings?: Record<string, any>
  isHost?: boolean
  myPlayerName?: string
  turnActive?: boolean
  onTurnComplete?: () => void
  turnSecondsRemaining?: number
}

const GAME_URL_MAP: Record<GameModeId, string> = {
  classic: '/games/classic-quiz.html',
  pharaoh: '/games/pharaoh.html',
  tictactoe: '/games/tictactoe.html',
  academic_deception: '/games/academic-deception.html',
  duel_league: '/games/duel-league.html',
  land_rush: '/games/land-rush.html',
}

const GAME_TITLES: Record<GameModeId, string> = {
  classic: 'Classic Quiz Arena',
  pharaoh: "Pharaoh's Labyrinth",
  tictactoe: 'Tic-Tac-Toe Ultimate',
  academic_deception: 'Academic Deception',
  duel_league: 'Duel League',
  land_rush: 'Land Rush',
}

export function GameIframeView({
  gameMode,
  settings,
  isHost = false,
  myPlayerName = 'Player',
  turnActive = true,
  onTurnComplete,
  turnSecondsRemaining,
}: GameIframeViewProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [isLoaded, setIsLoaded] = useState(false)
  const gameSrc = GAME_URL_MAP[gameMode] || GAME_URL_MAP.classic

  // Send settings to the iframe once loaded
  useEffect(() => {
    if (isLoaded && iframeRef.current && iframeRef.current.contentWindow) {
      try {
        iframeRef.current.contentWindow.postMessage(
          {
            type: 'CONVENTUS_INIT',
            settings: settings || {},
            isHost,
            playerName: myPlayerName,
          },
          '*'
        )
      } catch {
        // ignore cross-origin postMessage issues
      }
    }
  }, [isLoaded, settings, isHost, myPlayerName])

  return (
    <div
      style={{
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem',
        background: 'var(--surface)',
        borderRadius: 'var(--radius-xl)',
        border: '1px solid var(--border)',
        overflow: 'hidden',
        boxShadow: 'var(--shadow-md)',
      }}
    >
      {/* Game Header Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0.85rem 1.25rem',
          background: 'var(--card)',
          borderBottom: '1px solid var(--border)',
          flexWrap: 'wrap',
          gap: '0.75rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '1.75rem',
              height: '1.75rem',
              borderRadius: 'var(--radius-md)',
              background: 'var(--primary-soft, rgba(99, 102, 241, 0.12))',
              color: 'var(--primary)',
              fontWeight: 800,
              fontSize: '0.875rem',
            }}
          >
            🎮
          </span>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700 }}>
              {GAME_TITLES[gameMode] || 'Game Arena'}
            </h3>
            <span style={{ fontSize: '0.75rem', color: 'var(--muted)', fontWeight: 500 }}>
              {isHost ? 'Live Spectator View' : 'Interactive Player View'} · Original HTML/CSS Layout
            </span>
          </div>
        </div>

        {/* Action / Turn countdown controls for player */}
        {!isHost && turnActive && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {turnSecondsRemaining !== undefined && (
              <span
                style={{
                  fontFamily: 'var(--f-mono)',
                  fontSize: '0.875rem',
                  fontWeight: 700,
                  color: turnSecondsRemaining <= 5 ? 'var(--danger)' : 'var(--primary)',
                  background: 'var(--bg)',
                  padding: '0.3rem 0.65rem',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border)',
                }}
              >
                ⏱️ Turn: {turnSecondsRemaining}s
              </span>
            )}
            {onTurnComplete && (
              <button
                type="button"
                className="btn primary small"
                style={{ fontWeight: 700 }}
                onClick={onTurnComplete}
              >
                Next Question ➔
              </button>
            )}
          </div>
        )}
      </div>

      {/* Embedded Original Game Iframe */}
      <div style={{ position: 'relative', width: '100%', height: '640px', background: 'var(--bg)' }}>
        {!isLoaded && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.75rem',
              color: 'var(--muted)',
            }}
          >
            <span className="arena-pulse-dot" style={{ width: '1rem', height: '1rem' }} />
            <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>Loading game environment...</span>
          </div>
        )}
        <iframe
          ref={iframeRef}
          src={gameSrc}
          title={GAME_TITLES[gameMode]}
          onLoad={() => setIsLoaded(true)}
          style={{
            width: '100%',
            height: '100%',
            border: 'none',
            display: 'block',
          }}
        />
      </div>
    </div>
  )
}
