import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { arenaApi, connectArenaWebSocket } from '../api'
import type { Player, Question, LeaderboardEntry } from '../api/types'

export function ArenaLivePage() {
  const { code: routeCode } = useParams<{ code?: string }>()
  const location = useLocation()
  const navigate = useNavigate()
  const { user } = useAuth()

  const code = (routeCode || '').trim().toUpperCase()

  // Retrieve state passed via navigation or fallback to sessionStorage
  const navState = (location.state || {}) as {
    isHost?: boolean
    token?: string
    displayName?: string
  }

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
  const playerToken: string | null = navState.token || savedState.token || null
  const myPlayerName: string =
    navState.displayName || savedState.displayName || (user ? user.username : 'Player')

  // Persist session
  useEffect(() => {
    if (code) {
      try {
        sessionStorage.setItem(
          storageKey,
          JSON.stringify({ isHost, token: playerToken, displayName: myPlayerName })
        )
      } catch {
        // ignore
      }
    }
  }, [code, isHost, playerToken, myPlayerName, storageKey])

  // Game UI State
  const [stage, setStage] = useState<'lobby' | 'play' | 'podium'>('lobby')
  const [playerRoster, setPlayerRoster] = useState<Player[]>([])
  const [copiedPin, setCopiedPin] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // In-Game Play State
  const [questions, setQuestions] = useState<Question[]>([])
  const [currentQIndex, setCurrentQIndex] = useState(0)
  const [selectedChoiceId, setSelectedChoiceId] = useState<number | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [answerResult, setAnswerResult] = useState<{ isCorrect: boolean; choiceId: number } | null>(null)
  const [myScore, setMyScore] = useState(0)
  const [secondsRemaining, setSecondsRemaining] = useState<number>(30)
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])

  const timerRef = useRef<number | null>(null)
  const wsCleanupRef = useRef<(() => void) | null>(null)

  // Fetch Questions for play
  const loadGameQuestions = useCallback(async () => {
    if (!code) return
    try {
      const token = playerToken || 'host_preview'
      const qList = await arenaApi.getGameQuestions(code, token)
      setQuestions(qList)
      if (qList.length > 0) {
        setSecondsRemaining(qList[0].time_seconds || 30)
      }
    } catch {
      // If host or questions not yet loaded
    }
  }, [code, playerToken])

  // Timer Tick
  useEffect(() => {
    if (stage !== 'play' || questions.length === 0) return

    if (timerRef.current) clearInterval(timerRef.current)

    timerRef.current = window.setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!)
          // Timeout: advance or finish
          setTimeout(() => {
            setCurrentQIndex((curr) => {
              if (curr + 1 < questions.length) {
                const nextQ = questions[curr + 1]
                setSelectedChoiceId(null)
                setAnswerResult(null)
                setSecondsRemaining(nextQ.time_seconds || 30)
                return curr + 1
              } else {
                setStage('podium')
                return curr
              }
            })
          }, 1200)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [stage, currentQIndex, questions])

  // Initial Sync and WebSocket setup
  useEffect(() => {
    if (!code) {
      navigate('/arena?tab=join')
      return
    }

    // 1. Fetch Players in Lobby
    arenaApi.getGamePlayers(code)
      .then((roster) => setPlayerRoster(roster))
      .catch(() => {})

    // 2. Fetch Status
    arenaApi.getGameStatus(code, playerToken || undefined)
      .then((status) => {
        if (status.is_started) {
          setStage('play')
          loadGameQuestions()
        }
      })
      .catch(() => {})

    // 3. Connect WebSocket for Real-Time synchronization
    const cleanup = connectArenaWebSocket(code, {
      onPlayerJoined: (payload) => {
        arenaApi.getGamePlayers(code)
          .then((r) => setPlayerRoster(r))
          .catch(() => {
            setPlayerRoster((prev) => [
              ...prev,
              { id: Date.now(), display_name: payload.display_name, points: 0, joined_at: '' },
            ])
          })
      },
      onPlayerLeft: () => {
        arenaApi.getGamePlayers(code)
          .then((r) => setPlayerRoster(r))
          .catch(() => {})
      },
      onGameStarted: () => {
        setStage('play')
        loadGameQuestions()
      },
      onGameStopped: () => {
        setStage('podium')
        arenaApi.getLeaderboard(code, playerToken || undefined)
          .then((lb) => setLeaderboard(lb.leaderboard))
          .catch(() => {})
      },
      onLeaderboardUpdate: (data) => {
        setLeaderboard(data)
      },
    })

    wsCleanupRef.current = cleanup

    return () => {
      if (cleanup) cleanup()
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [code, playerToken, navigate, loadGameQuestions])

  // Host: Start Game
  const handleStartGame = async () => {
    if (!code || !isHost) return
    try {
      await arenaApi.startGame(code)
      setStage('play')
      loadGameQuestions()
    } catch (err: unknown) {
      setErrorMsg((err as Error)?.message || 'Failed to start game.')
    }
  }

  // Host: Stop / End Game
  const handleStopGame = async () => {
    if (!code || !isHost) return
    if (!window.confirm('Are you sure you want to end this game session?')) return
    try {
      await arenaApi.stopGame(code)
      setStage('podium')
      try {
        const lb = await arenaApi.getLeaderboard(code, playerToken || undefined)
        setLeaderboard(lb.leaderboard)
      } catch {
        // ignore
      }
    } catch (err: unknown) {
      setErrorMsg((err as Error)?.message || 'Failed to stop game.')
    }
  }

  // Player: Submit Answer Choice
  const handleSelectChoice = async (choiceId: number) => {
    if (selectedChoiceId !== null || isSubmitting || !playerToken) return

    setSelectedChoiceId(choiceId)
    setIsSubmitting(true)

    const curQ = questions[currentQIndex]
    try {
      const res = await arenaApi.submitAnswer(code, {
        token: playerToken,
        question_id: curQ.id,
        choice_id: choiceId,
      })

      setAnswerResult({ isCorrect: res.is_correct, choiceId })
      if (res.is_correct) {
        setMyScore((s) => s + 100)
      }

      // Automatically advance to next question after a brief delay
      setTimeout(() => {
        if (currentQIndex + 1 < questions.length) {
          const nextQ = questions[currentQIndex + 1]
          setCurrentQIndex((i) => i + 1)
          setSelectedChoiceId(null)
          setAnswerResult(null)
          setSecondsRemaining(nextQ.time_seconds || 30)
        } else {
          setStage('podium')
          arenaApi.getLeaderboard(code, playerToken)
            .then((lb) => setLeaderboard(lb.leaderboard))
            .catch(() => {})
        }
      }, 1500)
    } catch {
      // Submission error handling
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCopyPin = () => {
    if (!code) return
    navigator.clipboard.writeText(code)
    setCopiedPin(true)
    setTimeout(() => setCopiedPin(false), 2000)
  }

  const handleLeaveMatch = () => {
    if (window.confirm('Are you sure you want to leave this game?')) {
      if (wsCleanupRef.current) wsCleanupRef.current()
      try {
        sessionStorage.removeItem(storageKey)
      } catch {
        // ignore
      }
      navigate('/arena')
    }
  }

  const curQ = questions[currentQIndex]

  return (
    <div className="arena-live-room">
      {/* ── TOP IMMERSIVE HUD (NO NAVBAR / NO FOOTER) ── */}
      <header className="arena-live-hud">
        <div className="arena-live-hud-brand">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
          <span>Conventus Live Match</span>
        </div>

        <div className="arena-live-hud-center">
          <button
            type="button"
            className="arena-live-pin-chip"
            onClick={handleCopyPin}
            title="Click to copy game PIN"
          >
            <span className="arena-pulse-dot" />
            <span>PIN: {code}</span>
            <span style={{ fontSize: '0.75rem', fontWeight: 500, opacity: 0.8 }}>
              {copiedPin ? '✓ Copied' : '📋 Copy'}
            </span>
          </button>
        </div>

        <div className="arena-live-hud-right">
          <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--muted)' }}>
            {isHost ? (
              <span style={{ color: 'var(--primary)', fontWeight: 700 }}>👑 Host Room</span>
            ) : (
              <span>{myPlayerName} · <strong style={{ color: 'var(--primary)' }}>{myScore} pts</strong></span>
            )}
          </span>

          <button
            type="button"
            className="btn ghost danger"
            style={{ fontSize: '0.8125rem', padding: '0.35rem 0.75rem' }}
            onClick={handleLeaveMatch}
          >
            Leave Match
          </button>
        </div>
      </header>

      {/* ── IMMERSIVE WORKSPACE: LOBBY, PLAY, OR PODIUM ── */}
      <main className="arena-live-content">
        {errorMsg && (
          <div className="note error" style={{ width: '100%', marginBottom: '1.5rem' }}>
            {errorMsg}
          </div>
        )}

        {/* 1. LOBBY WAITING ROOM */}
        {stage === 'lobby' && (
          <div className="arena-lobby-card" style={{ width: '100%' }}>
            <div className="arena-lobby-banner">
              <div>
                <span style={{ fontSize: '0.8125rem', fontFamily: 'var(--f-mono)', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  {isHost ? 'Host Session Active' : 'Connected to Game Lobby'}
                </span>
                <h2 style={{ fontSize: '1.75rem', fontWeight: 700, margin: '0.2rem 0 0' }}>
                  Live Match Waiting Room
                </h2>
              </div>

              <div className="arena-code-pill" onClick={handleCopyPin} style={{ cursor: 'pointer' }}>
                <span className="arena-pulse-dot" />
                <span>PIN: {code}</span>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 600, margin: 0 }}>
                Joined Players ({playerRoster.length})
              </h3>
              {isHost ? (
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button
                    type="button"
                    className="btn line danger"
                    onClick={handleStopGame}
                  >
                    End Session
                  </button>
                  <button
                    type="button"
                    className="btn ok big"
                    onClick={handleStartGame}
                    style={{ fontWeight: 700, paddingInline: '1.5rem' }}
                  >
                    Start Game Now ▶
                  </button>
                </div>
              ) : (
                <span style={{ color: 'var(--muted)', fontSize: '0.9375rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span className="arena-pulse-dot" />
                  Waiting for host to launch the match...
                </span>
              )}
            </div>

            <div className="arena-roster-grid">
              {playerRoster.map((p) => (
                <div key={p.id} className="arena-player-chip">
                  <span className="arena-player-avatar">
                    {p.display_name.slice(0, 2).toUpperCase()}
                  </span>
                  <span>{p.display_name}</span>
                </div>
              ))}
              {playerRoster.length === 0 && (
                <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '2.5rem', color: 'var(--muted)', background: 'var(--surface)', borderRadius: 'var(--radius-lg)' }}>
                  Waiting for players to enter PIN <strong>#{code}</strong>...
                </div>
              )}
            </div>
          </div>
        )}

        {/* 2. REAL-TIME QUIZ PLAY */}
        {stage === 'play' && (
          <div className="arena-play-container" style={{ width: '100%' }}>
            {/* Countdown Timer bar */}
            <div className="arena-timer-bar">
              <div
                className={`arena-timer-fill ${secondsRemaining <= 5 ? 'urgent' : ''}`}
                style={{
                  width: `${(secondsRemaining / (curQ?.time_seconds || 30)) * 100}%`,
                }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontFamily: 'var(--f-mono)', fontSize: '0.9375rem', color: 'var(--muted)' }}>
                Question {currentQIndex + 1} of {questions.length}
              </span>
              <span style={{ fontFamily: 'var(--f-mono)', fontWeight: 700, color: secondsRemaining <= 5 ? 'var(--danger)' : 'var(--text)' }}>
                ⏱️ {secondsRemaining}s remaining
              </span>
            </div>

            {/* Question Card */}
            <div className="arena-q-card">
              <h2 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0, lineHeight: 1.3 }}>
                {curQ?.text || 'Loading question...'}
              </h2>
            </div>

            {/* 4 Large Choice Buttons */}
            <div className="arena-choices-grid">
              {(curQ?.choices || []).map((choice, cIdx) => {
                const isSelected = selectedChoiceId === choice.id
                let stateClass = ''
                if (answerResult) {
                  if (choice.id === answerResult.choiceId) {
                    stateClass = answerResult.isCorrect ? 'correct' : 'wrong'
                  }
                } else if (isSelected) {
                  stateClass = 'selected'
                }

                return (
                  <button
                    key={choice.id}
                    type="button"
                    className={`arena-choice-btn arena-choice-${cIdx % 4} ${stateClass}`}
                    disabled={selectedChoiceId !== null || isSubmitting || isHost}
                    onClick={() => handleSelectChoice(choice.id)}
                  >
                    <span className={`arena-choice-letter letter-${['a', 'b', 'c', 'd'][cIdx % 4]}`}>
                      {['A', 'B', 'C', 'D'][cIdx % 4]}
                    </span>
                    <span style={{ flex: 1, textAlign: 'left', fontWeight: 600, fontSize: '1.0625rem' }}>
                      {choice.text}
                    </span>
                  </button>
                )
              })}
            </div>

            {/* Instant Answer Feedback */}
            {answerResult && (
              <div className={`arena-result-banner ${answerResult.isCorrect ? 'correct' : 'wrong'}`}>
                {answerResult.isCorrect ? '🎉 Correct! +100 Points!' : '❌ Incorrect recall'}
              </div>
            )}

            {isHost && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem', padding: '1rem', background: 'var(--surface)', borderRadius: 'var(--radius-lg)' }}>
                <span style={{ color: 'var(--muted)', fontSize: '0.875rem' }}>
                  Host Mode: Players are submitting their live responses
                </span>
                <button
                  type="button"
                  className="btn line danger"
                  onClick={handleStopGame}
                >
                  End Match Early
                </button>
              </div>
            )}
          </div>
        )}

        {/* 3. PODIUM CELEBRATION & FINAL LEADERBOARD */}
        {stage === 'podium' && (
          <div className="arena-podium-container" style={{ width: '100%' }}>
            <div style={{ textAlign: 'center' }}>
              <h2 style={{ fontSize: '2rem', fontWeight: 700, margin: '0 0 0.5rem' }}>
                🏆 Match Complete!
              </h2>
              <p style={{ color: 'var(--muted)', margin: 0 }}>
                Final standings for Session PIN #{code}
              </p>
            </div>

            {/* Podium for Top 3 */}
            <div className="arena-podium-wrap">
              {/* 2nd Place */}
              <div className="arena-podium-col">
                <span style={{ fontWeight: 600, fontSize: '0.9375rem' }}>
                  {leaderboard[1]?.display_name || '—'}
                </span>
                <span style={{ fontSize: '0.8125rem', color: 'var(--muted)', fontFamily: 'var(--f-mono)' }}>
                  {leaderboard[1] ? `${leaderboard[1].points} pts` : '—'}
                </span>
                <div className="arena-podium-box podium-second">2</div>
              </div>

              {/* 1st Place */}
              <div className="arena-podium-col">
                <span style={{ fontSize: '1.5rem' }}>👑</span>
                <span style={{ fontWeight: 700, fontSize: '1.125rem', color: 'var(--primary)' }}>
                  {leaderboard[0]?.display_name || myPlayerName || 'Champion'}
                </span>
                <span style={{ fontSize: '0.875rem', fontWeight: 600, fontFamily: 'var(--f-mono)' }}>
                  {leaderboard[0] ? `${leaderboard[0].points} pts` : `${myScore} pts`}
                </span>
                <div className="arena-podium-box podium-first">1</div>
              </div>

              {/* 3rd Place */}
              <div className="arena-podium-col">
                <span style={{ fontWeight: 600, fontSize: '0.9375rem' }}>
                  {leaderboard[2]?.display_name || '—'}
                </span>
                <span style={{ fontSize: '0.8125rem', color: 'var(--muted)', fontFamily: 'var(--f-mono)' }}>
                  {leaderboard[2] ? `${leaderboard[2].points} pts` : '—'}
                </span>
                <div className="arena-podium-box podium-third">3</div>
              </div>
            </div>

            {/* Leaderboard Table */}
            <table className="arena-score-table">
              <tbody>
                {(leaderboard.length > 0
                  ? leaderboard
                  : myPlayerName
                  ? [{ display_name: myPlayerName, points: myScore }]
                  : []
                ).map((entry, idx) => (
                  <tr key={idx} className="arena-score-row">
                    <td style={{ width: '3rem' }}>#{idx + 1}</td>
                    <td>{entry.display_name}</td>
                    <td>{entry.points} pts</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Actions */}
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn primary"
                onClick={() => navigate('/arena?tab=join')}
              >
                Join Another Game
              </button>
              <button
                type="button"
                className="btn line"
                onClick={() => navigate('/arena?tab=host')}
              >
                Host New Match
              </button>
              <button
                type="button"
                className="btn ghost"
                onClick={() => navigate('/arena')}
              >
                Back to Arena Hub
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
