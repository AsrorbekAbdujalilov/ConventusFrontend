import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { arenaApi, connectArenaWebSocket } from '../api'
import type { Player, Question, LeaderboardEntry } from '../api/types'
import { GameIframeView } from '../components/games/GameIframeView'
import { HostGameTracker } from '../components/games/HostGameTracker'
import type { GameModeId } from '../pages/GameTypeSelectPage'

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

  // Game Mode & Settings (Default: classic)
  const [gameMode, setGameMode] = useState<GameModeId>('classic')
  const [gameSettings, setGameSettings] = useState<Record<string, any>>({})

  // Strict Screen Separation:
  // When isPlayingGameTurn === true: QUIZ IS HIDDEN, GAME IS LOADED
  // When isPlayingGameTurn === false: GAME IS HIDDEN, QUIZ IS LOADED
  const [isPlayingGameTurn, setIsPlayingGameTurn] = useState(false)
  const [turnSecondsRemaining, setTurnSecondsRemaining] = useState<number>(15)

  // In-Game Play State
  const [questions, setQuestions] = useState<Question[]>([])
  const [currentQIndex, setCurrentQIndex] = useState(0)
  const [selectedChoiceId, setSelectedChoiceId] = useState<number | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [answerResult, setAnswerResult] = useState<{ isCorrect: boolean; choiceId: number } | null>(null)
  const [myScore, setMyScore] = useState(0)
  const [questionSecondsRemaining, setQuestionSecondsRemaining] = useState<number>(30)
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])

  const questionTimerRef = useRef<number | null>(null)
  const turnTimerRef = useRef<number | null>(null)
  const wsCleanupRef = useRef<(() => void) | null>(null)

  // Refresh Leaderboard
  const refreshLeaderboard = useCallback(async () => {
    if (!code) return
    try {
      const lb = await arenaApi.getLeaderboard(code, playerToken || undefined)
      if (lb && lb.leaderboard) {
        setLeaderboard(lb.leaderboard)
      }
    } catch {
      // ignore
    }
  }, [code, playerToken])

  // Fetch Questions for play (anti-cheat: choices omit is_correct)
  const loadGameQuestions = useCallback(async () => {
    if (!code) return
    try {
      const token = playerToken || 'host_preview'
      const qList = await arenaApi.getGameQuestions(code, token)
      setQuestions(qList)
      if (qList.length > 0) {
        setQuestionSecondsRemaining(qList[0].time_seconds || 30)
      }
    } catch {
      // host preview or awaiting questions
    }
  }, [code, playerToken])

  // Active Question calculation: IF TIME OR INDEX > QUESTIONS LENGTH -> REPEAT IN LOOP!
  const activeQuestionIndex = questions.length > 0 ? currentQIndex % questions.length : 0
  const curQ = questions[activeQuestionIndex]
  const questionRepeatCount = questions.length > 0 ? Math.floor(currentQIndex / questions.length) + 1 : 1

  // Advance to next question cleanly
  const advanceToNextQuestion = useCallback(() => {
    if (turnTimerRef.current) clearInterval(turnTimerRef.current)
    setIsPlayingGameTurn(false)
    setSelectedChoiceId(null)
    setAnswerResult(null)
    setCurrentQIndex((prev) => prev + 1)
    setQuestionSecondsRemaining((questions[0]?.time_seconds) || 30)
  }, [questions])

  // Question Countdown Loop (runs ONLY when Quiz is visible)
  useEffect(() => {
    if (stage !== 'play' || isPlayingGameTurn || questions.length === 0 || isHost) return

    if (questionTimerRef.current) clearInterval(questionTimerRef.current)

    questionTimerRef.current = window.setInterval(() => {
      setQuestionSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(questionTimerRef.current!)
          setTimeout(() => {
            advanceToNextQuestion()
          }, 1200)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => {
      if (questionTimerRef.current) clearInterval(questionTimerRef.current)
    }
  }, [stage, isPlayingGameTurn, currentQIndex, questions, isHost, advanceToNextQuestion])

  // Game Turn Countdown Loop (runs ONLY when Game is visible)
  useEffect(() => {
    if (!isPlayingGameTurn) return

    setTurnSecondsRemaining(15)
    if (turnTimerRef.current) clearInterval(turnTimerRef.current)

    turnTimerRef.current = window.setInterval(() => {
      setTurnSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(turnTimerRef.current!)
          advanceToNextQuestion()
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => {
      if (turnTimerRef.current) clearInterval(turnTimerRef.current)
    }
  }, [isPlayingGameTurn, advanceToNextQuestion])

  // Initial Sync, Polling Fallback, and WebSocket setup
  useEffect(() => {
    if (!code) {
      navigate('/arena?tab=join')
      return
    }

    // 1. Initial Fetch of Players in Lobby
    arenaApi.getGamePlayers(code)
      .then((roster) => setPlayerRoster(roster))
      .catch(() => {})

    // 2. Fetch Status
    arenaApi.getGameStatus(code, playerToken || undefined)
      .then((status) => {
        if (status.game_mode) setGameMode(status.game_mode as GameModeId)
        if (status.game_settings) setGameSettings(status.game_settings)
        if (status.is_started) {
          setStage('play')
          loadGameQuestions()
        }
      })
      .catch(() => {})

    // 3. Polling safety-net while in 'lobby' (syncs host & player without refresh)
    const lobbySyncInterval = window.setInterval(() => {
      if (stage === 'lobby') {
        arenaApi.getGamePlayers(code).then(setPlayerRoster).catch(() => {})
        arenaApi.getGameStatus(code, playerToken || undefined)
          .then((status) => {
            if (status.game_mode) setGameMode(status.game_mode as GameModeId)
            if (status.game_settings) setGameSettings(status.game_settings)
            if (status.is_started) {
              setStage('play')
              loadGameQuestions()
            }
          })
          .catch(() => {})
      }
    }, 2000)

    // 4. Connect WebSocket for Instant Real-Time synchronization
    const cleanup = connectArenaWebSocket(code, {
      onPlayerJoined: (payload, roster) => {
        if (roster && roster.length > 0) {
          setPlayerRoster(roster)
        } else {
          arenaApi.getGamePlayers(code)
            .then((r) => setPlayerRoster(r))
            .catch(() => {
              setPlayerRoster((prev) => [
                ...prev,
                { id: Date.now(), display_name: payload.display_name, points: 0, joined_at: '' },
              ])
            })
        }
      },
      onPlayerLeft: () => {
        arenaApi.getGamePlayers(code).then((r) => setPlayerRoster(r)).catch(() => {})
      },
      onGameStarted: (payload) => {
        if (payload.game_mode) {
          setGameMode(payload.game_mode as GameModeId)
        }
        if (payload.game_settings) {
          setGameSettings(payload.game_settings)
        }
        setStage('play')
        loadGameQuestions()
      },
      onGameStopped: (payload) => {
        setStage('podium')
        if (typeof payload === 'object' && payload?.leaderboard && payload.leaderboard.length > 0) {
          setLeaderboard(payload.leaderboard)
        } else {
          arenaApi.getLeaderboard(code, playerToken || undefined)
            .then((lb) => setLeaderboard(lb.leaderboard))
            .catch(() => {})
        }
      },
      onLeaderboardUpdate: (data) => {
        setLeaderboard(data)
      },
    })

    wsCleanupRef.current = cleanup

    return () => {
      if (cleanup) cleanup()
      if (questionTimerRef.current) clearInterval(questionTimerRef.current)
      if (turnTimerRef.current) clearInterval(turnTimerRef.current)
      clearInterval(lobbySyncInterval)
    }
  }, [code, playerToken, navigate, loadGameQuestions, stage])

  // Host: Navigate to Choose Game Type
  const handleOpenChooseMode = () => {
    navigate(`/arena/live/${code}/choose-mode`, {
      state: { isHost: true },
    })
  }

  // Host: Stop / End Game
  const handleStopGame = async () => {
    if (!code || !isHost) return
    if (!window.confirm('Are you sure you want to end this game session and show the podium?')) return
    try {
      const res = await arenaApi.stopGame(code)
      setStage('podium')
      if ((res as any)?.leaderboard) {
        setLeaderboard((res as any).leaderboard)
      } else {
        await refreshLeaderboard()
      }
    } catch (err: unknown) {
      setErrorMsg((err as Error)?.message || 'Failed to stop game.')
    }
  }

  // Player: Submit Answer Choice (Anti-Cheat Server Validation)
  const handleSelectChoice = async (choiceId: number) => {
    if (selectedChoiceId !== null || isSubmitting || !playerToken || isHost || !curQ) return

    setSelectedChoiceId(choiceId)
    setIsSubmitting(true)

    try {
      const res = await arenaApi.submitAnswer(code, {
        token: playerToken,
        question_id: curQ.id,
        choice_id: choiceId,
      })

      setAnswerResult({ isCorrect: res.is_correct, choiceId })

      if (res.is_correct) {
        setMyScore((s) => s + 100)

        // CORRECT ANSWER: HIDE QUIZ, LOAD GAME ON SCREEN
        setTimeout(() => {
          setIsPlayingGameTurn(true)
        }, 1100)
      } else {
        // INCORRECT ANSWER: Turn locked. Advance after brief feedback.
        setTimeout(() => {
          advanceToNextQuestion()
        }, 2200)
      }
    } catch {
      // Submission fallback
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

  // Guaranteed Podium Rankings
  const sortedRankings = (() => {
    if (leaderboard && leaderboard.length > 0) {
      return leaderboard
    }
    if (playerRoster && playerRoster.length > 0) {
      return [...playerRoster]
        .map((p) => ({ display_name: p.display_name, points: (p as any).points || 0 }))
        .sort((a, b) => b.points - a.points)
    }
    return [{ display_name: myPlayerName || 'Player 1', points: myScore }]
  })()

  return (
    <div className="arena-live-room">
      {/* ── TOP IMMERSIVE HUD ── */}
      <header className="arena-live-hud">
        <div className="arena-live-hud-brand">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
          <span>Conventus Arena</span>
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

      {/* ── MAIN WORKSPACE: LOBBY, PLAY, OR PODIUM ── */}
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
                    onClick={handleOpenChooseMode}
                    style={{ fontWeight: 700, paddingInline: '1.5rem' }}
                  >
                    Choose Game Mode & Settings ▶
                  </button>
                </div>
              ) : (
                <span style={{ color: 'var(--muted)', fontSize: '0.9375rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span className="arena-pulse-dot" />
                  Waiting for host to configure game mode and launch the match...
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

        {/* 2. REAL-TIME PLAY STAGE */}
        {stage === 'play' && (
          <div className="arena-play-container" style={{ width: '100%' }}>
            {/* ── HOST POV: CAN ONLY TRACK GAMES (CANNOT PLAY) ── */}
            {isHost ? (
              <HostGameTracker
                gameMode={gameMode}
                settings={gameSettings}
                players={playerRoster}
                leaderboard={leaderboard}
                onStopGame={handleStopGame}
                currentQIndex={currentQIndex}
                totalQuestions={questions.length}
              />
            ) : (
              /* ── PLAYER POV: STRICT SCREEN SEPARATION ── */
              <div style={{ width: '100%' }}>
                {isPlayingGameTurn ? (
                  /* SCREEN B: QUIZ IS HIDDEN, GAME SCREEN IS LOADED */
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%' }}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0.85rem 1.25rem',
                        background: 'linear-gradient(90deg, var(--primary-soft, #eef2ff), var(--surface))',
                        border: '1px solid var(--primary)',
                        borderRadius: 'var(--radius-lg)',
                        flexWrap: 'wrap',
                        gap: '0.75rem',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontSize: '1.25rem' }}>🎉</span>
                        <span style={{ fontWeight: 700, color: 'var(--primary)', fontSize: '1rem' }}>
                          Correct! Quiz hidden — Take your game turn!
                        </span>
                      </div>
                      <button
                        type="button"
                        className="btn primary small"
                        style={{ fontWeight: 700 }}
                        onClick={advanceToNextQuestion}
                      >
                        Done with Move / Next Question ➔
                      </button>
                    </div>

                    <GameIframeView
                      gameMode={gameMode}
                      settings={gameSettings}
                      isHost={false}
                      myPlayerName={myPlayerName}
                      turnActive={true}
                      turnSecondsRemaining={turnSecondsRemaining}
                      onTurnComplete={advanceToNextQuestion}
                    />
                  </div>
                ) : (
                  /* SCREEN A: GAME IS HIDDEN, QUIZ SCREEN IS LOADED */
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', width: '100%' }}>
                    {/* Timer progress bar */}
                    <div className="arena-timer-bar">
                      <div
                        className={`arena-timer-fill ${questionSecondsRemaining <= 5 ? 'urgent' : ''}`}
                        style={{
                          width: `${(questionSecondsRemaining / (curQ?.time_seconds || 30)) * 100}%`,
                        }}
                      />
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontFamily: 'var(--f-mono)', fontSize: '0.9375rem', color: 'var(--muted)' }}>
                        Question {activeQuestionIndex + 1} of {questions.length || 1}
                        {questionRepeatCount > 1 && (
                          <span style={{ marginLeft: '0.5rem', color: 'var(--primary)', fontWeight: 600 }}>
                            (Cycle #{questionRepeatCount})
                          </span>
                        )}
                      </span>
                      <span style={{ fontFamily: 'var(--f-mono)', fontWeight: 700, color: questionSecondsRemaining <= 5 ? 'var(--danger)' : 'var(--text)' }}>
                        ⏱️ {questionSecondsRemaining}s remaining
                      </span>
                    </div>

                    {/* Question Card */}
                    <div className="arena-q-card">
                      <h2 style={{ fontSize: '1.4rem', fontWeight: 700, margin: 0, lineHeight: 1.3 }}>
                        {curQ?.text || 'Loading question challenge...'}
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
                            disabled={selectedChoiceId !== null || isSubmitting}
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

                    {/* Feedback Banner */}
                    {answerResult && (
                      <div className={`arena-result-banner ${answerResult.isCorrect ? 'correct' : 'wrong'}`}>
                        {answerResult.isCorrect
                          ? '🎉 Correct! Loading game environment on full screen...'
                          : '❌ Incorrect answer! Game turn locked for this round.'}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* 3. PODIUM CELEBRATION */}
        {stage === 'podium' && (
          <div className="arena-podium-container" style={{ width: '100%' }}>
            <div style={{ textAlign: 'center' }}>
              <h2 style={{ fontSize: '2.5rem', fontWeight: 800, margin: '0 0 0.5rem', letterSpacing: '-0.02em' }}>
                🏆 Match Complete!
              </h2>
              <p style={{ color: 'var(--muted)', margin: 0, fontSize: '1.05rem' }}>
                Final Championship Standings for Session PIN #{code}
              </p>
            </div>

            {/* Podium for Top 3 with 🥇🥈🥉 */}
            <div className="arena-podium-wrap">
              {/* 2nd Place */}
              <div className="arena-podium-col">
                <span style={{ fontSize: '2rem' }}>🥈</span>
                <span style={{ fontWeight: 700, fontSize: '1rem', marginTop: '0.25rem' }}>
                  {sortedRankings[1]?.display_name || 'Runner Up'}
                </span>
                <span style={{ fontSize: '0.875rem', color: 'var(--muted)', fontFamily: 'var(--f-mono)', fontWeight: 600 }}>
                  {sortedRankings[1] ? `${sortedRankings[1].points} pts` : '—'}
                </span>
                <div className="arena-podium-box podium-second">2</div>
              </div>

              {/* 1st Place */}
              <div className="arena-podium-col">
                <span style={{ fontSize: '2.5rem' }}>👑</span>
                <span style={{ fontWeight: 800, fontSize: '1.3rem', color: 'var(--primary)', marginTop: '0.25rem' }}>
                  {sortedRankings[0]?.display_name || 'Champion'}
                </span>
                <span style={{ fontSize: '1rem', fontWeight: 700, fontFamily: 'var(--f-mono)' }}>
                  {sortedRankings[0] ? `${sortedRankings[0].points} pts` : `${myScore} pts`}
                </span>
                <div className="arena-podium-box podium-first">1</div>
              </div>

              {/* 3rd Place */}
              <div className="arena-podium-col">
                <span style={{ fontSize: '2rem' }}>🥉</span>
                <span style={{ fontWeight: 700, fontSize: '1rem', marginTop: '0.25rem' }}>
                  {sortedRankings[2]?.display_name || '3rd Place'}
                </span>
                <span style={{ fontSize: '0.875rem', color: 'var(--muted)', fontFamily: 'var(--f-mono)', fontWeight: 600 }}>
                  {sortedRankings[2] ? `${sortedRankings[2].points} pts` : '—'}
                </span>
                <div className="arena-podium-box podium-third">3</div>
              </div>
            </div>

            {/* Leaderboard Table */}
            <table className="arena-score-table" style={{ width: '100%', maxWidth: '38rem', marginTop: '1.5rem' }}>
              <thead>
                <tr style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>
                  <th style={{ textAlign: 'left', padding: '0.5rem' }}>Rank</th>
                  <th style={{ textAlign: 'left', padding: '0.5rem' }}>Player</th>
                  <th style={{ textAlign: 'right', padding: '0.5rem' }}>Score</th>
                </tr>
              </thead>
              <tbody>
                {sortedRankings.map((entry, idx) => (
                  <tr key={idx} className="arena-score-row">
                    <td style={{ width: '4rem', fontWeight: 700 }}>
                      {idx === 0 ? '🥇 1st' : idx === 1 ? '🥈 2nd' : idx === 2 ? '🥉 3rd' : `#${idx + 1}`}
                    </td>
                    <td style={{ fontWeight: 600 }}>{entry.display_name}</td>
                    <td style={{ textAlign: 'right', fontWeight: 700, fontFamily: 'var(--f-mono)', color: 'var(--primary)' }}>
                      {entry.points} pts
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Actions */}
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '2rem', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn primary big"
                onClick={() => navigate('/arena?tab=join')}
              >
                Join Another Game
              </button>
              <button
                type="button"
                className="btn line big"
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
