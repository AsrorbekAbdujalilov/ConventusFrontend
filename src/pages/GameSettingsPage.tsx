import { useState, useEffect } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { arenaApi } from '../api'
import type { GameModeId } from './GameTypeSelectPage'

export function GameSettingsPage() {
  const { code: routeCode, mode: routeMode } = useParams<{ code?: string; mode?: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const code = (routeCode || '').trim().toUpperCase()
  const mode = (routeMode || 'classic').toLowerCase() as GameModeId

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

  const [playerCount, setPlayerCount] = useState<number>(0)
  const [isLaunching, setIsLaunching] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  useEffect(() => {
    if (code) {
      arenaApi.getGamePlayers(code)
        .then((r) => setPlayerCount(r.length))
        .catch(() => {})
    }
  }, [code])

  // ==========================================
  // EXACT SETTINGS STATE MATCHING plain/games
  // ==========================================

  // 1. Classic Quiz State
  const [classic, setClassic] = useState({
    players: 12,
    questions: 10,
    qTime: 15,
    seat: 'player',
    difficulty: 'normal',
    seed: '',
    scoring: 'speed',
    maxPts: 100,
    slowPct: 50,
    flagAcc: 50,
  })

  // 2. Pharaoh's Labyrinth State
  const [pharaoh, setPharaoh] = useState({
    level: 'medium',
    n: 14,
    seed: 48213,
    dim: true,
  })

  // 3. Tic-Tac-Toe Ultimate State
  const [ttt, setTtt] = useState({
    n: 5,
    k: 4,
    count: 2,
    pt0: 8,
    pt1: 5,
    pt2: 2,
    pt3: 0,
  })

  // 4. Academic Deception State
  const [acad, setAcad] = useState({
    players: 12,
    saboteurs: 3,
    maxRounds: 12,
    answerCap: 3,
    seed: '',
    inv: true,
    men: true,
    openingQuest: true,
    humanRole: 'random',
    difficulty: 'normal',
    speed: 1,
    t_night: 10,
    t_quest: 30,
    t_discuss: 45,
    t_vote: 15,
  })

  // 5. Duel League State
  const [duel, setDuel] = useState({
    players: 8,
    endMode: 'rounds',
    rounds: 3,
    minutes: 5,
    seat: 'player',
    difficulty: 'normal',
    qTime: 15,
    seed: '',
    p_win: 2,
    p_fast: 2,
    p_slow: 1,
    p_bye: 1,
  })

  // 6. Land Rush State
  const [land, setLand] = useState({
    players: 6,
    size: 5,
    qTime: 15,
    tileValue: 50,
    seat: 'player',
    difficulty: 'normal',
    maxQ: 40,
    seed: '',
  })

  // Synchronize player counts if players joined
  useEffect(() => {
    if (playerCount > 1) {
      setClassic((prev) => ({ ...prev, players: Math.min(40, Math.max(2, playerCount)) }))
      setAcad((prev) => ({ ...prev, players: Math.min(16, Math.max(6, playerCount)) }))
      setDuel((prev) => ({ ...prev, players: Math.min(32, Math.max(4, playerCount)) }))
      setLand((prev) => ({
        ...prev,
        players: Math.min(30, Math.max(3, playerCount)),
        size: Math.min(20, Math.max(5, Math.ceil(Math.sqrt(4 * playerCount)))),
      }))
    }
  }, [playerCount])

  // Get active settings payload
  const getPayload = () => {
    switch (mode) {
      case 'classic': return classic
      case 'pharaoh': return pharaoh
      case 'tictactoe': return ttt
      case 'academic_deception': return acad
      case 'duel_league': return duel
      case 'land_rush': return land
      default: return classic
    }
  }

  const handleLaunch = async () => {
    if (!code || isLaunching) return
    setIsLaunching(true)
    setErrorMsg(null)

    try {
      await arenaApi.startGame(code, {
        game_mode: mode,
        game_settings: getPayload(),
      })
      navigate(`/arena/live/${code}`, {
        state: { isHost: true },
      })
    } catch (err: unknown) {
      setErrorMsg((err as Error)?.message || 'Failed to start game.')
      setIsLaunching(false)
    }
  }

  // Titles
  const titles: Record<GameModeId, string> = {
    classic: 'Classic Quiz Settings',
    pharaoh: "Pharaoh's Labyrinth Setup",
    tictactoe: 'Tic-Tac-Toe Ultimate Setup',
    academic_deception: 'Academic Deception Dossier Setup',
    duel_league: 'Duel League Tournament Setup',
    land_rush: 'Land Rush Game Setup',
  }

  return (
    <div className="arena-live-room" style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      {/* Top HUD */}
      <header className="arena-live-hud">
        <div className="arena-live-hud-brand">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
          <span>Step 2 of 2: {titles[mode] || 'Game Settings'}</span>
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
            onClick={() => navigate(`/arena/live/${code}/choose-mode`, { state: { isHost: true } })}
          >
            ← Change Game Type
          </button>
        </div>
      </header>

      {/* Main Settings Body */}
      <main style={{ maxWidth: '64rem', margin: '0 auto', width: '100%', padding: '2.5rem 1.5rem 4rem' }}>
        {errorMsg && (
          <div className="note error" style={{ marginBottom: '1.5rem', width: '100%' }}>
            {errorMsg}
          </div>
        )}

        {/* 1. CLASSIC QUIZ SETTINGS (EXTRACTED DESIGN) */}
        {mode === 'classic' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div>
              <h1 style={{ fontSize: '2.2rem', fontWeight: 800, margin: '0 0 0.5rem', letterSpacing: '-0.02em' }}>
                Classic Quiz
              </h1>
              <p style={{ color: 'var(--muted)', margin: 0, fontSize: '1rem', maxWidth: '44rem' }}>
                Answer fast and answer right. Correct answers score points, and a teacher dashboard shows how every player is doing as circles, bars, a table or a scatter plot.
              </p>
            </div>

            <div className="card stack" style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '14px', padding: '1.5rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>Game Parameters</h2>
              <div className="grid">
                <label className="field">
                  Players (2 to 40)
                  <input
                    type="number"
                    min="2"
                    max="40"
                    value={classic.players}
                    onChange={(e) => setClassic({ ...classic, players: Number(e.target.value) || 2 })}
                  />
                </label>
                <label className="field">
                  Questions (1 to 30)
                  <input
                    type="number"
                    min="1"
                    max="30"
                    value={classic.questions}
                    onChange={(e) => setClassic({ ...classic, questions: Number(e.target.value) || 1 })}
                  />
                </label>
                <label className="field">
                  Seconds per question (5 to 60)
                  <input
                    type="number"
                    min="5"
                    max="60"
                    value={classic.qTime}
                    onChange={(e) => setClassic({ ...classic, qTime: Number(e.target.value) || 5 })}
                  />
                </label>
                <label className="field">
                  Your seat
                  <select
                    value={classic.seat}
                    onChange={(e) => setClassic({ ...classic, seat: e.target.value })}
                  >
                    <option value="player">Play as Player 1</option>
                    <option value="spectator">Spectator (Host Deck)</option>
                  </select>
                </label>
                <label className="field">
                  Bot skill
                  <select
                    value={classic.difficulty}
                    onChange={(e) => setClassic({ ...classic, difficulty: e.target.value })}
                  >
                    <option value="easy">Easy</option>
                    <option value="normal">Normal</option>
                    <option value="hard">Hard</option>
                  </select>
                </label>
                <label className="field">
                  Seed (blank = random)
                  <input
                    type="text"
                    maxLength={24}
                    value={classic.seed}
                    placeholder="Random seed"
                    onChange={(e) => setClassic({ ...classic, seed: e.target.value })}
                  />
                </label>
              </div>
            </div>

            <div className="card stack" style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '14px', padding: '1.5rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>Scoring Rules</h2>
              <div className="grid">
                <label className="field">
                  Scoring mode
                  <select
                    value={classic.scoring}
                    onChange={(e) => setClassic({ ...classic, scoring: e.target.value })}
                  >
                    <option value="speed">Speed: points drop with answer time</option>
                    <option value="rank">Rank: points drop with finishing place</option>
                  </select>
                </label>
                <label className="field">
                  Points for best answer
                  <input
                    type="number"
                    min="10"
                    max="1000"
                    step="10"
                    value={classic.maxPts}
                    onChange={(e) => setClassic({ ...classic, maxPts: Number(e.target.value) || 10 })}
                  />
                </label>
                {classic.scoring === 'speed' && (
                  <label className="field">
                    Slowest correct answer (% of best)
                    <input
                      type="number"
                      min="0"
                      max="90"
                      step="5"
                      value={classic.slowPct}
                      onChange={(e) => setClassic({ ...classic, slowPct: Number(e.target.value) || 0 })}
                    />
                  </label>
                )}
                <label className="field">
                  Dashboard flag accuracy below (%)
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="5"
                    value={classic.flagAcc}
                    onChange={(e) => setClassic({ ...classic, flagAcc: Number(e.target.value) || 0 })}
                  />
                </label>
              </div>

              <div className="note" style={{ borderLeft: '3px solid var(--primary)', padding: '0.6rem 0.85rem', background: 'var(--surface)', fontSize: '0.85rem', color: 'var(--muted)' }}>
                {classic.scoring === 'speed'
                  ? `Speed score: A correct answer at 0s scores ${classic.maxPts}, and at ${classic.qTime}s scores ${Math.round(classic.maxPts * (classic.slowPct / 100))}. Wrong or missing answers score 0.`
                  : `Rank score: Fastest correct answer scores ${classic.maxPts}, descending by finishing rank among correct players.`}
              </div>
            </div>
          </div>
        )}

        {/* 2. PHARAOH'S LABYRINTH SETTINGS (PARCHMENT DESIGN) */}
        {mode === 'pharaoh' && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '1.25rem',
              background: '#efe9df',
              color: '#2a1f14',
              padding: '1.75rem',
              borderRadius: '16px',
              border: '1px solid #d8c9b2',
            }}
          >
            <div>
              <h1 style={{ fontSize: '2rem', fontWeight: 700, margin: '0 0 0.35rem', color: '#2a1f14' }}>
                🏺 Pharaoh's Labyrinth Setup
              </h1>
              <p style={{ color: '#7a6a58', margin: 0, fontSize: '0.95rem' }}>
                Configure the procedural growing-tree maze parameters.
              </p>
            </div>

            <div
              style={{
                background: '#fff8ec',
                border: '1px solid #d8c9b2',
                borderRadius: '14px',
                padding: '1.5rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '1.25rem',
              }}
            >
              <div className="grid">
                <label className="field" style={{ color: '#7a6a58' }}>
                  Level
                  <select
                    style={{ background: '#f3e9d6', border: '1px solid #d8c9b2', color: '#2a1f14' }}
                    value={pharaoh.level}
                    onChange={(e) => {
                      const lvl = e.target.value
                      let defN = 14
                      if (lvl === 'easy') defN = 8
                      else if (lvl === 'hard') defN = 20
                      else if (lvl === 'challenge') defN = 28
                      setPharaoh({ ...pharaoh, level: lvl, n: defN })
                    }}
                  >
                    <option value="easy">Easy (winding corridors)</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                    <option value="challenge">Challenge (many dead-ends)</option>
                  </select>
                </label>

                <label className="field" style={{ color: '#7a6a58' }}>
                  Map size N (N×N rooms)
                  <input
                    style={{ background: '#f3e9d6', border: '1px solid #d8c9b2', color: '#2a1f14' }}
                    type="number"
                    min="5"
                    max="40"
                    value={pharaoh.n}
                    onChange={(e) => setPharaoh({ ...pharaoh, n: Number(e.target.value) || 5 })}
                  />
                </label>

                <label className="field" style={{ color: '#7a6a58' }}>
                  Seed (5 digits)
                  <input
                    style={{ background: '#f3e9d6', border: '1px solid #d8c9b2', color: '#2a1f14' }}
                    type="number"
                    min="10000"
                    max="99999"
                    value={pharaoh.seed}
                    onChange={(e) => setPharaoh({ ...pharaoh, seed: Number(e.target.value) || 10000 })}
                  />
                </label>
              </div>

              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="btn"
                  style={{ background: '#f3e9d6', border: '1px solid #d8c9b2', color: '#2a1f14', fontWeight: 600 }}
                  onClick={() => setPharaoh({ ...pharaoh, seed: Math.floor(10000 + Math.random() * 89999) })}
                >
                  🎲 Random Seed
                </button>

                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', color: '#2a1f14', fontWeight: 600 }}>
                  <input
                    type="checkbox"
                    checked={pharaoh.dim}
                    onChange={(e) => setPharaoh({ ...pharaoh, dim: e.target.checked })}
                  />
                  <span>Torchlight Fog of War</span>
                </label>
              </div>
            </div>
          </div>
        )}

        {/* 3. TIC-TAC-TOE ULTIMATE SETTINGS (MODERN CARD DESIGN) */}
        {mode === 'tictactoe' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div>
              <h1 style={{ fontSize: '2.2rem', fontWeight: 800, margin: '0 0 0.5rem', letterSpacing: '-0.02em' }}>
                Tic-Tac-Toe Ultimate
              </h1>
              <p style={{ color: 'var(--muted)', margin: 0, fontSize: '1rem' }}>
                Configure board dimensions, winning streak, player marks and finishing place points.
              </p>
            </div>

            <div className="card stack" style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '16px', padding: '1.5rem' }}>
              <div className="grid">
                <label className="field">
                  Board size (N × N, N ≥ 3)
                  <input
                    type="number"
                    min="3"
                    max="20"
                    value={ttt.n}
                    onChange={(e) => {
                      const newN = Number(e.target.value) || 3
                      setTtt({ ...ttt, n: newN, k: Math.min(ttt.k, newN) })
                    }}
                  />
                </label>
                <label className="field">
                  Win streak (≥ 3, ≤ N)
                  <input
                    type="number"
                    min="3"
                    max={ttt.n}
                    value={ttt.k}
                    onChange={(e) => setTtt({ ...ttt, k: Number(e.target.value) || 3 })}
                  />
                </label>
                <label className="field">
                  Players count
                  <select
                    value={ttt.count}
                    onChange={(e) => setTtt({ ...ttt, count: Number(e.target.value) || 2 })}
                  >
                    <option value={2}>2 Players</option>
                    <option value={3}>3 Players</option>
                    <option value={4}>4 Players</option>
                  </select>
                </label>
              </div>

              {/* Points by finishing place */}
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--muted)', fontWeight: 600, display: 'block', marginBottom: '0.75rem' }}>
                  Points by Finishing Place (first to reach the streak scores highest)
                </span>
                <div className="grid">
                  <label className="field">
                    1st place
                    <input
                      type="number"
                      min="0"
                      value={ttt.pt0}
                      onChange={(e) => setTtt({ ...ttt, pt0: Number(e.target.value) || 0 })}
                    />
                  </label>
                  <label className="field">
                    2nd place
                    <input
                      type="number"
                      min="0"
                      value={ttt.pt1}
                      onChange={(e) => setTtt({ ...ttt, pt1: Number(e.target.value) || 0 })}
                    />
                  </label>
                  {ttt.count >= 3 && (
                    <label className="field">
                      3rd place
                      <input
                        type="number"
                        min="0"
                        value={ttt.pt2}
                        onChange={(e) => setTtt({ ...ttt, pt2: Number(e.target.value) || 0 })}
                      />
                    </label>
                  )}
                  {ttt.count >= 4 && (
                    <label className="field">
                      4th place
                      <input
                        type="number"
                        min="0"
                        value={ttt.pt3}
                        onChange={(e) => setTtt({ ...ttt, pt3: Number(e.target.value) || 0 })}
                      />
                    </label>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 4. ACADEMIC DECEPTION SETTINGS (DOSSIER STYLE) */}
        {mode === 'academic_deception' && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '1.25rem',
              background: '#0e1420',
              color: '#e8e4d6',
              padding: '1.75rem',
              borderRadius: '16px',
              border: '1px solid #2b3b55',
            }}
          >
            <div>
              <h1 style={{ fontSize: '2rem', fontWeight: 700, margin: '0 0 0.35rem', color: '#f0cf5a' }}>
                Academic Deception
              </h1>
              <p style={{ color: '#9aa7ba', margin: 0, fontSize: '0.95rem' }}>
                A social deduction match played over quiz questions. Saboteurs hide among scholars.
              </p>
            </div>

            {/* Presets */}
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn small"
                style={{ background: '#1e2b40', color: '#e8e4d6', border: '1px solid #2b3b55' }}
                onClick={() => setAcad({ ...acad, saboteurs: 3, answerCap: 3, maxRounds: 12, t_quest: 30 })}
              >
                Balanced (tested)
              </button>
              <button
                type="button"
                className="btn small"
                style={{ background: '#1e2b40', color: '#e8e4d6', border: '1px solid #2b3b55' }}
                onClick={() => setAcad({ ...acad, saboteurs: 4, answerCap: 6, maxRounds: 15, t_quest: 45 })}
              >
                Ruleset Numbers
              </button>
              <button
                type="button"
                className="btn small"
                style={{ background: '#1e2b40', color: '#e8e4d6', border: '1px solid #2b3b55' }}
                onClick={() => setAcad({ ...acad, t_night: 5, t_quest: 15, t_discuss: 25, t_vote: 10 })}
              >
                Fast Timers
              </button>
            </div>

            {/* Match details */}
            <details open style={{ background: '#16202f', border: '1px solid #2b3b55', borderRadius: '10px', padding: '1rem' }}>
              <summary style={{ cursor: 'pointer', fontWeight: 700, color: '#f0cf5a', marginBottom: '0.75rem' }}>
                Match Dossier
              </summary>
              <div className="grid">
                <label className="field" style={{ color: '#9aa7ba' }}>
                  Players (6 to 16)
                  <input
                    style={{ background: '#0e1420', border: '1px solid #2b3b55', color: '#e8e4d6' }}
                    type="number"
                    min="6"
                    max="16"
                    value={acad.players}
                    onChange={(e) => setAcad({ ...acad, players: Number(e.target.value) || 6 })}
                  />
                </label>
                <label className="field" style={{ color: '#9aa7ba' }}>
                  Saboteurs (1 Boss + Helpers)
                  <input
                    style={{ background: '#0e1420', border: '1px solid #2b3b55', color: '#e8e4d6' }}
                    type="number"
                    min="1"
                    max="5"
                    value={acad.saboteurs}
                    onChange={(e) => setAcad({ ...acad, saboteurs: Number(e.target.value) || 1 })}
                  />
                </label>
                <label className="field" style={{ color: '#9aa7ba' }}>
                  Round limit (0 = none)
                  <input
                    style={{ background: '#0e1420', border: '1px solid #2b3b55', color: '#e8e4d6' }}
                    type="number"
                    min="0"
                    max="50"
                    value={acad.maxRounds}
                    onChange={(e) => setAcad({ ...acad, maxRounds: Number(e.target.value) || 0 })}
                  />
                </label>
                <label className="field" style={{ color: '#9aa7ba' }}>
                  Scored answers per quest
                  <input
                    style={{ background: '#0e1420', border: '1px solid #2b3b55', color: '#e8e4d6' }}
                    type="number"
                    min="0"
                    max="30"
                    value={acad.answerCap}
                    onChange={(e) => setAcad({ ...acad, answerCap: Number(e.target.value) || 0 })}
                  />
                </label>
              </div>

              <div style={{ display: 'flex', gap: '1.25rem', marginTop: '1rem', flexWrap: 'wrap' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={acad.inv}
                    onChange={(e) => setAcad({ ...acad, inv: e.target.checked })}
                  />
                  <span>Investigator Role</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={acad.men}
                    onChange={(e) => setAcad({ ...acad, men: e.target.checked })}
                  />
                  <span>Mentor (Healer) Role</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={acad.openingQuest}
                    onChange={(e) => setAcad({ ...acad, openingQuest: e.target.checked })}
                  />
                  <span>Opening Quest before Night 1</span>
                </label>
              </div>
            </details>

            {/* Timers */}
            <details style={{ background: '#16202f', border: '1px solid #2b3b55', borderRadius: '10px', padding: '1rem' }}>
              <summary style={{ cursor: 'pointer', fontWeight: 700, color: '#f0cf5a', marginBottom: '0.75rem' }}>
                Phase Timers (Seconds)
              </summary>
              <div className="grid">
                <label className="field" style={{ color: '#9aa7ba' }}>
                  Night (5 to 30)
                  <input
                    style={{ background: '#0e1420', border: '1px solid #2b3b55', color: '#e8e4d6' }}
                    type="number"
                    min="5"
                    max="30"
                    value={acad.t_night}
                    onChange={(e) => setAcad({ ...acad, t_night: Number(e.target.value) || 5 })}
                  />
                </label>
                <label className="field" style={{ color: '#9aa7ba' }}>
                  Quest (10 to 120)
                  <input
                    style={{ background: '#0e1420', border: '1px solid #2b3b55', color: '#e8e4d6' }}
                    type="number"
                    min="10"
                    max="120"
                    value={acad.t_quest}
                    onChange={(e) => setAcad({ ...acad, t_quest: Number(e.target.value) || 10 })}
                  />
                </label>
                <label className="field" style={{ color: '#9aa7ba' }}>
                  Discussion (15 to 180)
                  <input
                    style={{ background: '#0e1420', border: '1px solid #2b3b55', color: '#e8e4d6' }}
                    type="number"
                    min="15"
                    max="180"
                    value={acad.t_discuss}
                    onChange={(e) => setAcad({ ...acad, t_discuss: Number(e.target.value) || 15 })}
                  />
                </label>
                <label className="field" style={{ color: '#9aa7ba' }}>
                  Vote (8 to 60)
                  <input
                    style={{ background: '#0e1420', border: '1px solid #2b3b55', color: '#e8e4d6' }}
                    type="number"
                    min="8"
                    max="60"
                    value={acad.t_vote}
                    onChange={(e) => setAcad({ ...acad, t_vote: Number(e.target.value) || 8 })}
                  />
                </label>
              </div>
            </details>
          </div>
        )}

        {/* 5. DUEL LEAGUE SETTINGS */}
        {mode === 'duel_league' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div>
              <h1 style={{ fontSize: '2.2rem', fontWeight: 800, margin: '0 0 0.5rem', letterSpacing: '-0.02em' }}>
                Duel League Tournament
              </h1>
              <p style={{ color: 'var(--muted)', margin: 0, fontSize: '1rem' }}>
                Swiss-style tournament with head-to-head speed duels.
              </p>
            </div>

            <div className="card stack" style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '16px', padding: '1.5rem' }}>
              <div className="grid">
                <label className="field">
                  Players (4 to 32)
                  <input
                    type="number"
                    min="4"
                    max="32"
                    value={duel.players}
                    onChange={(e) => setDuel({ ...duel, players: Number(e.target.value) || 4 })}
                  />
                </label>
                <label className="field">
                  Tournament ends after
                  <select
                    value={duel.endMode}
                    onChange={(e) => setDuel({ ...duel, endMode: e.target.value })}
                  >
                    <option value="rounds">Number of Rounds</option>
                    <option value="time">Minutes of Time</option>
                  </select>
                </label>
                {duel.endMode === 'rounds' ? (
                  <label className="field">
                    Rounds (1 to 29)
                    <input
                      type="number"
                      min="1"
                      max="29"
                      value={duel.rounds}
                      onChange={(e) => setDuel({ ...duel, rounds: Number(e.target.value) || 1 })}
                    />
                  </label>
                ) : (
                  <label className="field">
                    Minutes (1 to 120)
                    <input
                      type="number"
                      min="1"
                      max="120"
                      value={duel.minutes}
                      onChange={(e) => setDuel({ ...duel, minutes: Number(e.target.value) || 1 })}
                    />
                  </label>
                )}
                <label className="field">
                  Seconds per question (5 to 60)
                  <input
                    type="number"
                    min="5"
                    max="60"
                    value={duel.qTime}
                    onChange={(e) => setDuel({ ...duel, qTime: Number(e.target.value) || 5 })}
                  />
                </label>
              </div>

              {/* Points */}
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--muted)', fontWeight: 600, display: 'block', marginBottom: '0.75rem' }}>
                  Points per Duel
                </span>
                <div className="grid">
                  <label className="field">
                    Only you correct
                    <input
                      type="number"
                      min="0"
                      max="20"
                      value={duel.p_win}
                      onChange={(e) => setDuel({ ...duel, p_win: Number(e.target.value) || 0 })}
                    />
                  </label>
                  <label className="field">
                    Both correct, you were faster
                    <input
                      type="number"
                      min="0"
                      max="20"
                      value={duel.p_fast}
                      onChange={(e) => setDuel({ ...duel, p_fast: Number(e.target.value) || 0 })}
                    />
                  </label>
                  <label className="field">
                    Both correct, you were slower
                    <input
                      type="number"
                      min="0"
                      max="20"
                      value={duel.p_slow}
                      onChange={(e) => setDuel({ ...duel, p_slow: Number(e.target.value) || 0 })}
                    />
                  </label>
                  <label className="field">
                    Bye (no opponent)
                    <input
                      type="number"
                      min="0"
                      max="20"
                      value={duel.p_bye}
                      onChange={(e) => setDuel({ ...duel, p_bye: Number(e.target.value) || 0 })}
                    />
                  </label>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 6. LAND RUSH SETTINGS */}
        {mode === 'land_rush' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div>
              <h1 style={{ fontSize: '2.2rem', fontWeight: 800, margin: '0 0 0.5rem', letterSpacing: '-0.02em' }}>
                Land Rush Territory
              </h1>
              <p style={{ color: 'var(--muted)', margin: 0, fontSize: '1rem' }}>
                Hexagonal map conquest with tile claiming and border battles.
              </p>
            </div>

            <div className="card stack" style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '16px', padding: '1.5rem' }}>
              <div className="grid">
                <label className="field">
                  Players (3 to 30)
                  <input
                    type="number"
                    min="3"
                    max="30"
                    value={land.players}
                    onChange={(e) => {
                      const p = Number(e.target.value) || 3
                      const suggested = Math.min(20, Math.max(5, Math.ceil(Math.sqrt(4 * p))))
                      setLand({ ...land, players: p, size: suggested })
                    }}
                  />
                </label>
                <label className="field">
                  Map size (N × N tiles, 3 to 20)
                  <input
                    type="number"
                    min="3"
                    max="20"
                    value={land.size}
                    onChange={(e) => setLand({ ...land, size: Number(e.target.value) || 3 })}
                  />
                </label>
                <label className="field">
                  Seconds per question (5 to 60)
                  <input
                    type="number"
                    min="5"
                    max="60"
                    value={land.qTime}
                    onChange={(e) => setLand({ ...land, qTime: Number(e.target.value) || 5 })}
                  />
                </label>
                <label className="field">
                  Points per tile
                  <input
                    type="number"
                    min="1"
                    max="10000"
                    value={land.tileValue}
                    onChange={(e) => setLand({ ...land, tileValue: Number(e.target.value) || 1 })}
                  />
                </label>
                <label className="field">
                  Question limit (0 = play until 1 left)
                  <input
                    type="number"
                    min="0"
                    max="200"
                    value={land.maxQ}
                    onChange={(e) => setLand({ ...land, maxQ: Number(e.target.value) || 0 })}
                  />
                </label>
                <label className="field">
                  Seed (blank = random)
                  <input
                    type="text"
                    maxLength={24}
                    value={land.seed}
                    placeholder="Random seed"
                    onChange={(e) => setLand({ ...land, seed: e.target.value })}
                  />
                </label>
              </div>
            </div>
          </div>
        )}

        {/* Action Controls */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '2.5rem', flexWrap: 'wrap', gap: '1rem' }}>
          <button
            type="button"
            className="btn ghost"
            onClick={() => navigate(`/arena/live/${code}/choose-mode`, { state: { isHost: true } })}
          >
            ← Back to Choose Game Type
          </button>

          <button
            type="button"
            className="btn primary big"
            style={{ fontWeight: 800, paddingInline: '2.5rem', fontSize: '1.15rem' }}
            disabled={isLaunching}
            onClick={handleLaunch}
          >
            {isLaunching ? 'Starting Match...' : '🚀 Start Game & Open Lobby ▶'}
          </button>
        </div>
      </main>
    </div>
  )
}
