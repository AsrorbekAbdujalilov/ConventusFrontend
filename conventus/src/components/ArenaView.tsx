import { useState, useEffect, useRef, useCallback } from 'react'
import { arenaApi, connectArenaWebSocket } from '../api'
import type {
  Quiz,
  Question,
  Player,
  UserProfile,
  LeaderboardEntry,
  BulkQuestionInput,
} from '../api/types'

export interface ArenaViewProps {
  user: UserProfile | null
  initialTab?: 'join' | 'host' | 'decks' | 'create'
  onRequireLogin?: () => void
  onBackToHome?: () => void
}

export function ArenaView({
  user,
  initialTab = 'join',
  onRequireLogin,
  onBackToHome,
}: ArenaViewProps) {
  // Navigation / View State
  const [activeTab, setActiveTab] = useState<'join' | 'host' | 'decks' | 'create' | 'lobby' | 'play' | 'podium'>(initialTab)

  // Join State
  const [joinPin, setJoinPin] = useState('')
  const [joinName, setJoinName] = useState(user?.username || '')
  const [joinError, setJoinError] = useState<string | null>(null)
  const [isJoining, setIsJoining] = useState(false)

  // Current Active Game Session State
  const [currentGameCode, setCurrentGameCode] = useState<string | null>(null)
  const [isHost, setIsHost] = useState(false)
  const [playerToken, setPlayerToken] = useState<string | null>(null)
  const [myPlayerName, setMyPlayerName] = useState<string>('')
  const [playerRoster, setPlayerRoster] = useState<Player[]>([])
  const [gameStarted, setGameStarted] = useState(false)
  const [gameStopped, setGameStopped] = useState(false)

  // In-Game Play State
  const [questions, setQuestions] = useState<Question[]>([])
  const [currentQIndex, setCurrentQIndex] = useState(0)
  const [selectedChoiceId, setSelectedChoiceId] = useState<number | null>(null)
  const [isSubmittingAnswer, setIsSubmittingAnswer] = useState(false)
  const [answerResult, setAnswerResult] = useState<{ isCorrect: boolean; choiceId: number } | null>(null)
  const [myScore, setMyScore] = useState(0)
  const [secondsRemaining, setSecondsRemaining] = useState<number>(30)
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])

  // Quiz Management State
  const [discoverQuizzes, setDiscoverQuizzes] = useState<Quiz[]>([])
  const [myQuizzes, setMyQuizzes] = useState<Quiz[]>([])
  const [decksSubTab, setDecksSubTab] = useState<'discover' | 'mine'>('discover')
  const [isLoadingDecks, setIsLoadingDecks] = useState(false)

  // Quiz Creator State
  const [createTitle, setCreateTitle] = useState('')
  const [createDesc, setCreateDesc] = useState('')
  const [createVisibility, setCreateVisibility] = useState<'public' | 'private'>('public')
  const [createQuestions, setCreateQuestions] = useState<BulkQuestionInput[]>([])
  const [isCreatingQuiz, setIsCreatingQuiz] = useState(false)
  const [creatorMessage, setCreatorMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  // WebSocket cleanup reference
  const wsCleanupRef = useRef<(() => void) | null>(null)
  const timerRef = useRef<number | null>(null)

  // Sync initial tab when changed externally
  useEffect(() => {
    if (['join', 'host', 'decks', 'create'].includes(initialTab)) {
      setActiveTab(initialTab)
    }
  }, [initialTab])

  // Load Decks (Discover & My Quizzes)
  const fetchDecks = useCallback(async () => {
    setIsLoadingDecks(true)
    try {
      const publicList = await arenaApi.getDiscoverQuizzes()
      setDiscoverQuizzes(publicList)
    } catch {
      // ignore
    }

    if (user) {
      try {
        const myList = await arenaApi.getMyQuizzes()
        setMyQuizzes(myList)
      } catch {
        // ignore
      }
    }
    setIsLoadingDecks(false)
  }, [user])

  useEffect(() => {
    if (activeTab === 'decks' || activeTab === 'host') {
      fetchDecks()
    }
  }, [activeTab, fetchDecks])

  // ---------------------------------------------------------------------------
  // WebSocket & Polling Connection for Active Game
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!currentGameCode) return

    // Setup WebSocket
    const cleanup = connectArenaWebSocket(currentGameCode, {
      onPlayerJoined: (p) => {
        setPlayerRoster((prev) => {
          if (prev.some((x) => x.display_name === p.display_name)) return prev
          return [...prev, { id: Date.now(), display_name: p.display_name, points: 0, joined_at: new Date().toISOString() }]
        })
      },
      onGameStarted: () => {
        setGameStarted(true)
        setActiveTab('play')
      },
      onGameStopped: () => {
        setGameStopped(true)
        setActiveTab('podium')
      },
      onLeaderboardUpdate: (board) => {
        setLeaderboard(board)
        // Update own score if present
        const me = board.find((x) => x.display_name === myPlayerName)
        if (me) setMyScore(me.points)
      },
    })
    wsCleanupRef.current = cleanup

    // Fallback polling for roster & status
    const pollInterval = window.setInterval(async () => {
      try {
        const status = await arenaApi.getGameStatus(currentGameCode)
        if (status.is_started && !gameStarted) {
          setGameStarted(true)
          setActiveTab('play')
        }
        if (!status.is_active && !gameStopped) {
          setGameStopped(true)
          setActiveTab('podium')
        }

        if (isHost) {
          const players = await arenaApi.getGamePlayers(currentGameCode)
          setPlayerRoster(players)
        }

        const lb = await arenaApi.getLeaderboard(currentGameCode)
        if (lb && lb.leaderboard) {
          setLeaderboard(lb.leaderboard)
        }
      } catch {
        // ignore polling failures
      }
    }, 2500)

    return () => {
      if (wsCleanupRef.current) wsCleanupRef.current()
      clearInterval(pollInterval)
    }
  }, [currentGameCode, isHost, gameStarted, gameStopped, myPlayerName])

  // ---------------------------------------------------------------------------
  // Load questions when game starts
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (activeTab === 'play' && currentGameCode && playerToken && questions.length === 0) {
      arenaApi.getGameQuestions(currentGameCode, playerToken)
        .then((qs) => {
          if (qs && qs.length > 0) {
            setQuestions(qs)
            setCurrentQIndex(0)
            setSecondsRemaining(qs[0].time_seconds || 30)
          }
        })
        .catch(() => {
          // If token-based questions fail (e.g. host view), fetch via status or demo
        })
    }
  }, [activeTab, currentGameCode, playerToken, questions.length])

  // ---------------------------------------------------------------------------
  // Countdown Timer per Question
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (activeTab !== 'play' || questions.length === 0) return

    if (timerRef.current) clearInterval(timerRef.current)

    timerRef.current = window.setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          // Move to next question or end game
          handleQuestionTimeout()
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [activeTab, currentQIndex, questions])

  const handleQuestionTimeout = () => {
    if (currentQIndex + 1 < questions.length) {
      setCurrentQIndex((prev) => prev + 1)
      setSelectedChoiceId(null)
      setAnswerResult(null)
      setSecondsRemaining(questions[currentQIndex + 1]?.time_seconds || 30)
    } else {
      // Final question complete -> view podium
      setActiveTab('podium')
    }
  }

  // ---------------------------------------------------------------------------
  // Action Handlers
  // ---------------------------------------------------------------------------
  const handleJoinGame = async (e: React.FormEvent) => {
    e.preventDefault()
    setJoinError(null)

    const cleanCode = joinPin.trim().replace(/\s+/g, '')
    const cleanName = joinName.trim()

    if (!cleanCode) {
      setJoinError('Please enter a valid 6-digit game PIN.')
      return
    }
    if (!cleanName) {
      setJoinError('Please enter your display name.')
      return
    }

    setIsJoining(true)
    try {
      const res = await arenaApi.joinGame({ code: cleanCode, display_name: cleanName })
      setCurrentGameCode(cleanCode)
      setPlayerToken(res.token)
      setMyPlayerName(res.display_name)
      setIsHost(false)
      setActiveTab('lobby')
    } catch (err: unknown) {
      const msg = (err as Error)?.message || 'Failed to join game. Check PIN code.'
      setJoinError(msg)
    } finally {
      setIsJoining(false)
    }
  }

  const handleHostLaunch = async (quizId: string) => {
    if (!user) {
      if (onRequireLogin) onRequireLogin()
      return
    }

    try {
      const res = await arenaApi.hostGame(quizId, { game_type: 'solo', duration: 0 })
      setCurrentGameCode(res.code)
      setIsHost(true)
      setMyPlayerName(user.username)

      // Also join as host player so host can participate if desired
      try {
        const joinRes = await arenaApi.joinGame({ code: res.code, display_name: `${user.username} (Host)` })
        setPlayerToken(joinRes.token)
      } catch {
        // Host might already be joined or play separately
      }

      setActiveTab('lobby')
    } catch (err: unknown) {
      alert((err as Error)?.message || 'Could not launch game session.')
    }
  }

  const handleStartGame = async () => {
    if (!currentGameCode) return
    try {
      await arenaApi.startGame(currentGameCode)
      setGameStarted(true)
      setActiveTab('play')
    } catch (err: unknown) {
      alert((err as Error)?.message || 'Could not start game.')
    }
  }

  const handleStopGame = async () => {
    if (!currentGameCode) return
    try {
      await arenaApi.stopGame(currentGameCode)
      setGameStopped(true)
      setActiveTab('podium')
    } catch {
      setActiveTab('podium')
    }
  }

  const handleSubmitChoice = async (choiceId: number) => {
    if (!currentGameCode || !playerToken || selectedChoiceId !== null || isSubmittingAnswer) return

    setSelectedChoiceId(choiceId)
    setIsSubmittingAnswer(true)

    const currentQ = questions[currentQIndex]
    if (!currentQ) return

    try {
      const res = await arenaApi.submitAnswer(currentGameCode, {
        token: playerToken,
        question_id: currentQ.id,
        choice_id: choiceId,
      })

      setAnswerResult({ isCorrect: res.is_correct, choiceId })
      if (res.is_correct) {
        setMyScore((prev) => prev + 100)
      }
    } catch {
      // Local fallback evaluation if network hiccup
      const targetChoice = currentQ.choices.find((c) => c.id === choiceId)
      const isOk = !!targetChoice?.is_correct
      setAnswerResult({ isCorrect: isOk, choiceId })
      if (isOk) setMyScore((prev) => prev + 100)
    } finally {
      setIsSubmittingAnswer(false)
    }
  }

  const handleNextQuestion = () => {
    handleQuestionTimeout()
  }

  const handleSaveNewQuiz = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) {
      if (onRequireLogin) onRequireLogin()
      return
    }

    if (!createTitle.trim()) {
      setCreatorMessage({ type: 'err', text: 'Please enter a quiz title.' })
      return
    }

    setIsCreatingQuiz(true)
    setCreatorMessage(null)

    try {
      const newQuiz = await arenaApi.createQuiz({
        title: createTitle.trim(),
        description: createDesc.trim(),
        visibility: createVisibility,
      })

      if (createQuestions.length > 0) {
        await arenaApi.saveQuestions(newQuiz.id, createQuestions)
      }

      setCreatorMessage({ type: 'ok', text: `Deck "${newQuiz.title}" created successfully with ${createQuestions.length} questions!` })
      setCreateTitle('')
      setCreateDesc('')
      fetchDecks()
    } catch (err: unknown) {
      setCreatorMessage({ type: 'err', text: (err as Error)?.message || 'Failed to save quiz.' })
    } finally {
      setIsCreatingQuiz(false)
    }
  }

  const addQuestionTemplate = () => {
    setCreateQuestions((prev) => [
      ...prev,
      {
        text: '',
        time_seconds: 30,
        order: prev.length,
        choices: [
          { text: '', is_correct: true },
          { text: '', is_correct: false },
          { text: '', is_correct: false },
          { text: '', is_correct: false },
        ],
      },
    ])
  }

  return (
    <div className="arena-wrapper wrap">
      {/* 1. Header & Context */}
      <div className="arena-hero">
        <span className="arena-eyebrow">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
          Conventus Arena · Live Multiplayer
        </span>
        <h1 className="arena-title">Multiplayer Review &amp; Live Quiz Arena</h1>
        <p className="arena-desc">
          Gamify your flashcard review decks. Compete live with classmates, test your recall under timed pressure, and follow live leaderboards.
        </p>
      </div>

      {/* 2. Sub-Navigation Tabs */}
      <nav className="arena-tabs" aria-label="Arena modes">
        <button
          type="button"
          className="arena-tab-btn"
          aria-selected={activeTab === 'join'}
          onClick={() => setActiveTab('join')}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
          Enter PIN
        </button>

        <button
          type="button"
          className="arena-tab-btn"
          aria-selected={activeTab === 'host'}
          onClick={() => setActiveTab('host')}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14" />
            <path d="M12 5l7 7-7 7" />
          </svg>
          Host Match
        </button>

        <button
          type="button"
          className="arena-tab-btn"
          aria-selected={activeTab === 'decks'}
          onClick={() => setActiveTab('decks')}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
          </svg>
          Deck Library
        </button>

        <button
          type="button"
          className="arena-tab-btn"
          aria-selected={activeTab === 'create'}
          onClick={() => setActiveTab('create')}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Deck Creator
        </button>

        {currentGameCode && (
          <button
            type="button"
            className="arena-tab-btn"
            aria-selected={activeTab === 'lobby' || activeTab === 'play' || activeTab === 'podium'}
            onClick={() => {
              if (activeTab !== 'lobby' && activeTab !== 'play' && activeTab !== 'podium') {
                setActiveTab(gameStarted ? 'play' : 'lobby')
              }
            }}
            style={{ marginLeft: 'auto', color: 'var(--primary)', fontWeight: 700 }}
          >
            <span className="arena-pulse-dot" />
            Active PIN: {currentGameCode}
          </button>
        )}
      </nav>

      {/* =====================================================================
       * TAB 1: JOIN GAME WITH 6-DIGIT PIN
       * ===================================================================== */}
      {activeTab === 'join' && (
        <div className="arena-join-card">
          <div>
            <h2 style={{ fontSize: '1.75rem', fontWeight: 700, margin: '0 0 0.5rem' }}>
              Join Live Match
            </h2>
            <p style={{ margin: 0, color: 'var(--muted)', fontSize: '0.9375rem' }}>
              Enter the 6-digit game PIN provided by your teacher or session host.
            </p>
          </div>

          <form onSubmit={handleJoinGame} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div className="field">
              <label htmlFor="arenaPinInput">Game PIN</label>
              <input
                id="arenaPinInput"
                type="text"
                maxLength={6}
                placeholder="123456"
                value={joinPin}
                onChange={(e) => setJoinPin(e.target.value)}
                className="arena-pin-display"
                autoComplete="off"
                required
              />
            </div>

            <div className="field">
              <label htmlFor="arenaNameInput">Your Nickname</label>
              <input
                id="arenaNameInput"
                type="text"
                placeholder="e.g. Zephyr"
                value={joinName}
                onChange={(e) => setJoinName(e.target.value)}
                className="inp"
                maxLength={50}
                required
              />
            </div>

            {joinError && (
              <div className="note error" role="alert">
                {joinError}
              </div>
            )}

            <button
              type="submit"
              className="btn primary big"
              disabled={isJoining}
            >
              {isJoining ? 'Joining Match...' : 'Enter Game Lobby →'}
            </button>
          </form>

          <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem', color: 'var(--muted)', fontSize: '0.875rem' }}>
            Looking to host instead?{' '}
            <button
              type="button"
              className="link"
              style={{ border: 0, background: 'none', cursor: 'pointer', padding: 0 }}
              onClick={() => setActiveTab('host')}
            >
              Launch a quiz from your library
            </button>
          </div>
        </div>
      )}

      {/* =====================================================================
       * TAB 2: HOST A GAME
       * ===================================================================== */}
      {activeTab === 'host' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 600 }}>Choose a Deck to Host</h2>
              <p style={{ margin: '0.2rem 0 0', color: 'var(--muted)', fontSize: '0.9375rem' }}>
                Select any public deck or your own curated question banks to generate a live multiplayer session.
              </p>
            </div>
            {!user && (
              <button
                type="button"
                className="btn line"
                onClick={onRequireLogin}
              >
                Log In to Host Your Custom Decks
              </button>
            )}
          </div>

          <div className="arena-deck-grid">
            {/* Built-in Instant Demo Deck */}
            <div className="arena-deck-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <span className="badge b-live">Ready to Host</span>
                <span style={{ fontFamily: 'var(--f-mono)', fontSize: '0.8125rem', color: 'var(--muted)' }}>
                  Biology &amp; Systems
                </span>
              </div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Cellular Respiration &amp; Bioenergetics</h3>
              <p style={{ margin: 0, color: 'var(--muted)', fontSize: '0.875rem' }}>
                Covers mitochondria, glycolysis, ATP synthase, and the citric acid cycle.
              </p>
              <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.75rem' }}>
                <span style={{ fontSize: '0.8125rem', color: 'var(--muted)' }}>5 Questions · 30s</span>
                <button
                  type="button"
                  className="btn orange"
                  onClick={() => {
                    // If backend is populated, host via API; otherwise provide instant PIN
                    if (discoverQuizzes.length > 0) {
                      handleHostLaunch(discoverQuizzes[0].id)
                    } else {
                      const dummyCode = String(Math.floor(100000 + Math.random() * 900000))
                      setCurrentGameCode(dummyCode)
                      setIsHost(true)
                      setMyPlayerName(user?.username || 'Host')
                      setPlayerRoster([
                        { id: 1, display_name: 'Soraya (Scholar)', points: 0, joined_at: new Date().toISOString() },
                        { id: 2, display_name: 'Lysander (Bio Club)', points: 0, joined_at: new Date().toISOString() },
                      ])
                      setActiveTab('lobby')
                    }
                  }}
                >
                  Launch Live Game →
                </button>
              </div>
            </div>

            {/* Dynamic Discover Decks */}
            {discoverQuizzes.map((quiz) => (
              <div key={quiz.id} className="arena-deck-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <span className="badge b-review">{quiz.visibility}</span>
                  <span style={{ fontFamily: 'var(--f-mono)', fontSize: '0.8125rem', color: 'var(--muted)' }}>
                    by {quiz.owner || 'Community'}
                  </span>
                </div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 600 }}>{quiz.title}</h3>
                <p style={{ margin: 0, color: 'var(--muted)', fontSize: '0.875rem' }}>
                  {quiz.description || 'Comprehensive review questions for study groups.'}
                </p>
                <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.75rem' }}>
                  <span style={{ fontSize: '0.8125rem', color: 'var(--muted)' }}>
                    {quiz.question_count || 0} Questions
                  </span>
                  <button
                    type="button"
                    className="btn primary"
                    onClick={() => handleHostLaunch(quiz.id)}
                  >
                    Host Deck →
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* =====================================================================
       * TAB 3: DECK LIBRARY (Discover & My Decks)
       * ===================================================================== */}
      {activeTab === 'decks' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div className="seg" style={{ width: 'fit-content' }}>
              <button
                type="button"
                aria-selected={decksSubTab === 'discover'}
                onClick={() => setDecksSubTab('discover')}
              >
                Community Decks
              </button>
              <button
                type="button"
                aria-selected={decksSubTab === 'mine'}
                onClick={() => {
                  if (!user && onRequireLogin) {
                    onRequireLogin()
                  } else {
                    setDecksSubTab('mine')
                  }
                }}
              >
                My Decks ({myQuizzes.length})
              </button>
            </div>
            <button
              type="button"
              className="btn line"
              style={{ marginLeft: 'auto' }}
              onClick={fetchDecks}
              disabled={isLoadingDecks}
            >
              ↻ Refresh
            </button>
          </div>

          {isLoadingDecks ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--muted)' }}>
              Loading question banks...
            </div>
          ) : (
            <div className="arena-deck-grid">
              {(decksSubTab === 'discover' ? discoverQuizzes : myQuizzes).map((quiz) => (
                <div key={quiz.id} className="arena-deck-card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <span className="badge b-prog">{quiz.visibility}</span>
                    <span style={{ fontFamily: 'var(--f-mono)', fontSize: '0.8125rem', color: 'var(--muted)' }}>
                      {quiz.owner || 'Community'}
                    </span>
                  </div>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 600 }}>{quiz.title}</h3>
                  <p style={{ margin: 0, color: 'var(--muted)', fontSize: '0.875rem' }}>
                    {quiz.description || 'Active recall study questions.'}
                  </p>
                  <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.75rem' }}>
                    <span style={{ fontSize: '0.8125rem', color: 'var(--muted)' }}>
                      {quiz.question_count || 0} Questions
                    </span>
                    <button
                      type="button"
                      className="btn primary"
                      onClick={() => handleHostLaunch(quiz.id)}
                    >
                      Host Live Match
                    </button>
                  </div>
                </div>
              ))}

              {(decksSubTab === 'mine' ? myQuizzes : discoverQuizzes).length === 0 && (
                <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '3rem', background: 'var(--surface)', borderRadius: 'var(--radius-lg)' }}>
                  <p style={{ color: 'var(--muted)', margin: '0 0 1rem' }}>
                    {decksSubTab === 'mine'
                      ? 'You have not created any decks yet. Build your first deck now!'
                      : 'No public community decks found yet.'}
                  </p>
                  <button
                    type="button"
                    className="btn primary"
                    onClick={() => setActiveTab('create')}
                  >
                    + Create New Deck
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* =====================================================================
       * TAB 4: DECK CREATOR
       * ===================================================================== */}
      {activeTab === 'create' && (
        <div style={{ maxWidth: '44rem', marginInline: 'auto', width: '100%' }}>
          <div style={{ marginBottom: '1.5rem' }}>
            <h2 style={{ fontSize: '1.75rem', fontWeight: 700, margin: '0 0 0.5rem' }}>
              Create a Quiz Deck
            </h2>
            <p style={{ margin: 0, color: 'var(--muted)', fontSize: '0.9375rem' }}>
              Draft a quiz bank with timed question cards and multiple choice options.
            </p>
          </div>

          <form onSubmit={handleSaveNewQuiz} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div className="field">
              <label htmlFor="createTitleInput">Deck Title</label>
              <input
                id="createTitleInput"
                type="text"
                placeholder="e.g. World History: Renaissance &amp; Reformation"
                value={createTitle}
                onChange={(e) => setCreateTitle(e.target.value)}
                className="inp"
                required
              />
            </div>

            <div className="field">
              <label htmlFor="createDescInput">Description / Subject</label>
              <textarea
                id="createDescInput"
                placeholder="Brief summary of what this quiz tests..."
                value={createDesc}
                onChange={(e) => setCreateDesc(e.target.value)}
                className="inp"
                rows={2}
              />
            </div>

            <div className="field">
              <label>Deck Visibility</label>
              <div className="seg" style={{ width: 'fit-content' }}>
                <button
                  type="button"
                  aria-selected={createVisibility === 'public'}
                  onClick={() => setCreateVisibility('public')}
                >
                  Public (Community Discover)
                </button>
                <button
                  type="button"
                  aria-selected={createVisibility === 'private'}
                  onClick={() => setCreateVisibility('private')}
                >
                  Private (Only Me)
                </button>
              </div>
            </div>

            {/* Questions List */}
            <div style={{ marginTop: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Questions ({createQuestions.length})</h3>
                <button
                  type="button"
                  className="btn line"
                  onClick={addQuestionTemplate}
                  style={{ fontSize: '0.875rem' }}
                >
                  + Add Question Card
                </button>
              </div>

              {createQuestions.length === 0 ? (
                <div
                  style={{
                    textAlign: 'center',
                    padding: '2.5rem 1.5rem',
                    background: 'var(--surface)',
                    borderRadius: 'var(--radius-lg)',
                    border: '1px dashed var(--border)',
                  }}
                >
                  <p style={{ margin: '0 0 1rem', color: 'var(--muted)', fontSize: '0.9375rem' }}>
                    No questions added yet. Click &ldquo;+ Add Question Card&rdquo; to start building your questions.
                  </p>
                  <button
                    type="button"
                    className="btn primary"
                    onClick={addQuestionTemplate}
                  >
                    + Add Question Card
                  </button>
                </div>
              ) : (
                createQuestions.map((q, qIndex) => (
                  <div key={qIndex} className="arena-q-edit-box">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <strong style={{ fontSize: '0.9375rem', color: 'var(--primary)' }}>
                        Question #{qIndex + 1}
                      </strong>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <label style={{ fontSize: '0.8125rem', color: 'var(--muted)' }}>Timer:</label>
                        <select
                          value={q.time_seconds}
                          onChange={(e) => {
                            const val = Number(e.target.value)
                            setCreateQuestions((prev) => {
                              const updated = [...prev]
                              updated[qIndex].time_seconds = val
                              return updated
                            })
                          }}
                          className="inp"
                          style={{ padding: '0.3rem 0.5rem', width: 'auto', fontSize: '0.8125rem' }}
                        >
                          <option value={15}>15 sec</option>
                          <option value={20}>20 sec</option>
                          <option value={30}>30 sec</option>
                          <option value={45}>45 sec</option>
                          <option value={60}>60 sec</option>
                        </select>

                        <button
                          type="button"
                          className="btn ghost"
                          style={{ color: 'var(--danger)', padding: '0.2rem 0.5rem', fontSize: '0.8125rem' }}
                          onClick={() => {
                            setCreateQuestions((prev) => prev.filter((_, idx) => idx !== qIndex))
                          }}
                        >
                          ✕ Remove
                        </button>
                      </div>
                    </div>

                  <input
                    type="text"
                    value={q.text}
                    onChange={(e) => {
                      const text = e.target.value
                      setCreateQuestions((prev) => {
                        const updated = [...prev]
                        updated[qIndex].text = text
                        return updated
                      })
                    }}
                    placeholder="Enter question prompt..."
                    className="inp"
                    required
                  />

                  {/* 4 Choices */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginTop: '0.25rem' }}>
                    {q.choices.map((c, cIndex) => (
                      <div
                        key={cIndex}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.4rem',
                          background: 'var(--card)',
                          padding: '0.35rem 0.5rem',
                          borderRadius: 'var(--radius-sm)',
                          border: `1px solid ${c.is_correct ? 'var(--ok)' : 'var(--border)'}`,
                        }}
                      >
                        <input
                          type="radio"
                          name={`correct-q-${qIndex}`}
                          checked={c.is_correct}
                          onChange={() => {
                            setCreateQuestions((prev) => {
                              const updated = [...prev]
                              updated[qIndex].choices = updated[qIndex].choices.map((ch, idx) => ({
                                ...ch,
                                is_correct: idx === cIndex,
                              }))
                              return updated
                            })
                          }}
                          title="Mark as correct answer"
                        />
                        <input
                          type="text"
                          value={c.text}
                          onChange={(e) => {
                            const val = e.target.value
                            setCreateQuestions((prev) => {
                              const updated = [...prev]
                              updated[qIndex].choices[cIndex].text = val
                              return updated
                            })
                          }}
                          className="inp"
                          style={{ padding: '0.25rem 0.4rem', border: 'none', background: 'transparent' }}
                          required
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )))}
            </div>

            {creatorMessage && (
              <div className={`note ${creatorMessage.type === 'ok' ? 'success' : 'error'}`}>
                {creatorMessage.text}
              </div>
            )}

            <button
              type="submit"
              className="btn primary big"
              disabled={isCreatingQuiz}
            >
              {isCreatingQuiz ? 'Saving Deck...' : 'Save Quiz Deck to Library →'}
            </button>
          </form>
        </div>
      )}

      {/* =====================================================================
       * TAB 5: ACTIVE LOBBY (HOST & PLAYER WAITING ROOM)
       * ===================================================================== */}
      {activeTab === 'lobby' && (
        <div className="arena-lobby-card">
          <div className="arena-lobby-banner">
            <div>
              <span style={{ fontSize: '0.8125rem', fontFamily: 'var(--f-mono)', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                {isHost ? 'Host Session Active' : 'Connected to Match'}
              </span>
              <h2 style={{ fontSize: '1.75rem', fontWeight: 700, margin: '0.2rem 0 0' }}>
                Live Match Waiting Room
              </h2>
            </div>

            <div className="arena-code-pill">
              <span className="arena-pulse-dot" />
              <span>PIN: {currentGameCode}</span>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 600 }}>
              Players in Lobby ({playerRoster.length})
            </h3>
            {isHost ? (
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  type="button"
                  className="btn line danger"
                  onClick={handleStopGame}
                >
                  End Session
                </button>
                <button
                  type="button"
                  className="btn ok"
                  onClick={handleStartGame}
                >
                  Start Game Now ▶
                </button>
              </div>
            ) : (
              <span style={{ color: 'var(--muted)', fontSize: '0.9375rem' }}>
                Waiting for the host to launch the match...
              </span>
            )}
          </div>

          {/* Roster of joined players */}
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
              <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '2rem', color: 'var(--muted)' }}>
                Waiting for players to enter PIN #{currentGameCode}...
              </div>
            )}
          </div>
        </div>
      )}

      {/* =====================================================================
       * TAB 6: IN-GAME PLAY (QUESTION CARDS & TIMERS)
       * ===================================================================== */}
      {activeTab === 'play' && (
        <div className="arena-play-container">
          {/* Header Bar: Status & Score */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span className="arena-pulse-dot" />
              <strong style={{ fontFamily: 'var(--f-mono)', fontSize: '0.9375rem' }}>
                PIN #{currentGameCode}
              </strong>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <span style={{ fontFamily: 'var(--f-mono)', fontWeight: 600, color: 'var(--primary)' }}>
                ⭐ {myScore} pts
              </span>
              {isHost && (
                <button
                  type="button"
                  className="btn ghost"
                  style={{ fontSize: '0.8125rem', padding: '0.3rem 0.6rem', color: 'var(--danger)' }}
                  onClick={handleStopGame}
                >
                  Stop Match
                </button>
              )}
            </div>
          </div>

          {/* Countdown Timer Bar */}
          <div>
            <div className="arena-timer-bar">
              <div
                className={`arena-timer-fill ${secondsRemaining <= 5 ? 'urgent' : ''}`}
                style={{
                  width: `${Math.min(100, (secondsRemaining / (questions[currentQIndex]?.time_seconds || 30)) * 100)}%`,
                }}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem', color: 'var(--muted)', marginTop: '0.35rem' }}>
              <span>Time Remaining</span>
              <strong style={{ fontFamily: 'var(--f-mono)', color: secondsRemaining <= 5 ? 'var(--danger)' : 'var(--text)' }}>
                {secondsRemaining}s
              </strong>
            </div>
          </div>

          {/* Active Question Card */}
          {questions[currentQIndex] ? (
            <>
              <div className="arena-question-card">
                <span className="arena-q-index">
                  Question {currentQIndex + 1} of {questions.length}
                </span>
                <h2 className="arena-q-text">
                  {questions[currentQIndex].text}
                </h2>
              </div>

              {/* 4 Responsive Choice Buttons */}
              <div className="arena-choices-grid">
                {questions[currentQIndex].choices.map((choice, idx) => {
                  const letter = ['A', 'B', 'C', 'D'][idx] || String(idx + 1)
                  const isSelected = selectedChoiceId === choice.id
                  const letterClass = ['letter-a', 'letter-b', 'letter-c', 'letter-d'][idx] || 'letter-a'

                  let buttonClass = 'arena-choice-btn'
                  if (isSelected) buttonClass += ' selected'
                  if (answerResult && isSelected) {
                    buttonClass += answerResult.isCorrect ? ' correct' : ' wrong'
                  }

                  return (
                    <button
                      key={choice.id}
                      type="button"
                      className={buttonClass}
                      onClick={() => handleSubmitChoice(choice.id)}
                      disabled={selectedChoiceId !== null || isSubmittingAnswer}
                    >
                      <span className={`arena-choice-letter ${letterClass}`}>
                        {letter}
                      </span>
                      <span>{choice.text}</span>
                    </button>
                  )
                })}
              </div>

              {/* Instant Answer Feedback Banner */}
              {answerResult && (
                <div
                  className={`note ${answerResult.isCorrect ? 'success' : 'error'}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '1rem 1.25rem',
                  }}
                >
                  <div>
                    <strong>
                      {answerResult.isCorrect ? '✓ Excellent! +100 Points' : '✗ Incorrect Choice'}
                    </strong>
                    <span style={{ display: 'block', fontSize: '0.875rem', marginTop: '0.15rem' }}>
                      {answerResult.isCorrect
                        ? 'Your active recall streak continues!'
                        : 'Review this concept in your flashcards after the game.'}
                    </span>
                  </div>
                  <button
                    type="button"
                    className="btn primary"
                    onClick={handleNextQuestion}
                    style={{ fontSize: '0.875rem' }}
                  >
                    {currentQIndex + 1 < questions.length ? 'Next Question →' : 'View Results 🏆'}
                  </button>
                </div>
              )}
            </>
          ) : (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--muted)' }}>
              Preparing game questions...
            </div>
          )}
        </div>
      )}

      {/* =====================================================================
       * TAB 7: PODIUM & FINAL LEADERBOARD
       * ===================================================================== */}
      {activeTab === 'podium' && (
        <div className="arena-podium-container">
          <div>
            <span className="arena-eyebrow">Match Concluded</span>
            <h2 style={{ fontSize: '2.25rem', fontWeight: 700, margin: '0.35rem 0' }}>
              Final Arena Standings
            </h2>
            <p style={{ margin: 0, color: 'var(--muted)', fontSize: '1.0625rem' }}>
              Great review session! Here are the top performers from match #{currentGameCode}.
            </p>
          </div>

          {/* Top 3 Podium Stage */}
          <div className="arena-podium-stage">
            {/* 2nd Place */}
            <div className="arena-podium-col">
              <span style={{ fontWeight: 600, fontSize: '0.9375rem' }}>
                {leaderboard[1]?.display_name || 'Player 2'}
              </span>
              <span style={{ fontSize: '0.8125rem', color: 'var(--muted)', fontFamily: 'var(--f-mono)' }}>
                {leaderboard[1]?.points || 300} pts
              </span>
              <div className="arena-podium-box podium-second">2</div>
            </div>

            {/* 1st Place */}
            <div className="arena-podium-col">
              <span style={{ fontSize: '1.25rem' }}>👑</span>
              <span style={{ fontWeight: 700, fontSize: '1.0625rem', color: 'var(--primary)' }}>
                {leaderboard[0]?.display_name || myPlayerName || 'Champion'}
              </span>
              <span style={{ fontSize: '0.875rem', fontWeight: 600, fontFamily: 'var(--f-mono)' }}>
                {leaderboard[0]?.points || Math.max(myScore, 500)} pts
              </span>
              <div className="arena-podium-box podium-first">1</div>
            </div>

            {/* 3rd Place */}
            <div className="arena-podium-col">
              <span style={{ fontWeight: 600, fontSize: '0.9375rem' }}>
                {leaderboard[2]?.display_name || 'Player 3'}
              </span>
              <span style={{ fontSize: '0.8125rem', color: 'var(--muted)', fontFamily: 'var(--f-mono)' }}>
                {leaderboard[2]?.points || 200} pts
              </span>
              <div className="arena-podium-box podium-third">3</div>
            </div>
          </div>

          {/* Full Leaderboard Table */}
          <table className="arena-score-table">
            <tbody>
              {(leaderboard.length > 0
                ? leaderboard
                : [
                    { display_name: myPlayerName || 'You', points: myScore || 500 },
                    { display_name: 'Soraya (Scholar)', points: 400 },
                    { display_name: 'Lysander (Bio Club)', points: 300 },
                  ]
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
          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn primary"
              onClick={() => {
                setCurrentGameCode(null)
                setActiveTab('join')
                setSelectedChoiceId(null)
                setAnswerResult(null)
                setMyScore(0)
              }}
            >
              Join Another Game
            </button>
            <button
              type="button"
              className="btn line"
              onClick={() => {
                setCurrentGameCode(null)
                setActiveTab('host')
              }}
            >
              Host New Match
            </button>
            {onBackToHome && (
              <button
                type="button"
                className="btn ghost"
                onClick={onBackToHome}
              >
                Back to Home
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
