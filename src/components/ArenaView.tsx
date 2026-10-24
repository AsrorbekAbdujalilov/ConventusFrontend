import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
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
  initialEditQuizId?: string
  onRequireLogin?: () => void
  onBackToHome?: () => void
}

export function ArenaView({
  user,
  initialTab = 'join',
  initialEditQuizId,
  onRequireLogin,
  onBackToHome,
}: ArenaViewProps) {
  const navigate = useNavigate()

  // Navigation / View State
  const [activeTab, setActiveTab] = useState<'join' | 'host' | 'decks' | 'create' | 'lobby' | 'play' | 'podium'>(initialTab)

  // Editing existing deck state
  const [editingQuizId, setEditingQuizId] = useState<string | null>(null)
  const [isDeletingQuiz, setIsDeletingQuiz] = useState(false)

  // Host Match Quick Update State
  const [quickUpdateQuiz, setQuickUpdateQuiz] = useState<Quiz | null>(null)
  const [quickUpdateTitle, setQuickUpdateTitle] = useState('')
  const [quickUpdateDesc, setQuickUpdateDesc] = useState('')
  const [quickUpdateVisibility, setQuickUpdateVisibility] = useState<'public' | 'private'>('public')
  const [isQuickUpdating, setIsQuickUpdating] = useState(false)
  const [quickUpdateMsg, setQuickUpdateMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

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

  // Search & Filtering State (Host Game & Deck Library)
  const [hostSourceTab, setHostSourceTab] = useState<'mine' | 'community'>('mine')
  const [hostSearchQuery, setHostSearchQuery] = useState('')
  const [librarySearchQuery, setLibrarySearchQuery] = useState('')

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

  // Load Decks (Discover & My Quizzes) — only query backend if authenticated
  const fetchDecks = useCallback(async () => {
    if (!user) {
      setDiscoverQuizzes([])
      setMyQuizzes([])
      return
    }

    setIsLoadingDecks(true)
    try {
      const publicList = await arenaApi.getDiscoverQuizzes()
      setDiscoverQuizzes(publicList)
    } catch {
      // ignore
    }

    try {
      const myList = await arenaApi.getMyQuizzes()
      setMyQuizzes(myList)
    } catch {
      // ignore
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

    // Fallback polling for roster & status (passes playerToken if guest player)
    const pollInterval = window.setInterval(async () => {
      try {
        const status = await arenaApi.getGameStatus(currentGameCode, playerToken || undefined)
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

        const lb = await arenaApi.getLeaderboard(currentGameCode, playerToken || undefined)
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

    // Host guard: Host cannot join their own game as a player
    if (user && isHost && currentGameCode === cleanCode) {
      setJoinError('The host cannot join their own game as a player.')
      return
    }

    setIsJoining(true)
    try {
      const res = await arenaApi.joinGame({ code: cleanCode, display_name: cleanName })
      setCurrentGameCode(cleanCode)
      setPlayerToken(res.token)
      setMyPlayerName(res.display_name)
      setIsHost(false)
      // Redirect player to full-focus live game page
      navigate(`/arena/live/${cleanCode}`, {
        state: { isHost: false, gameCode: cleanCode, token: res.token, displayName: res.display_name },
      })
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

      // Redirect host to full-focus live game room
      navigate(`/arena/live/${res.code}`, {
        state: { isHost: true, gameCode: res.code },
      })
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

  const handleStartNewDeck = () => {
    setEditingQuizId(null)
    setCreateTitle('')
    setCreateDesc('')
    setCreateVisibility('public')
    setCreateQuestions([])
    setCreatorMessage(null)
  }

  const handleLoadQuizForEdit = async (quizId: string) => {
    try {
      const quiz = await arenaApi.getQuizDetail(quizId)
      setEditingQuizId(quiz.id)
      setCreateTitle(quiz.title)
      setCreateDesc(quiz.description || '')
      setCreateVisibility(quiz.visibility)
      setCreateQuestions(
        (quiz.questions || []).map((q) => ({
          text: q.text,
          time_seconds: q.time_seconds,
          order: q.order,
          choices: (q.choices || []).map((ch) => ({
            text: ch.text,
            is_correct: Boolean(ch.is_correct),
          })),
        }))
      )
      setCreatorMessage({ type: 'ok', text: `Loaded "${quiz.title}" for editing.` })
      handleSelectTab('create')
    } catch (err: unknown) {
      setCreatorMessage({ type: 'err', text: (err as Error)?.message || 'Could not load quiz.' })
    }
  }

  const handleSaveOrUpdateQuiz = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
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
      if (editingQuizId) {
        // UPDATE existing deck
        await arenaApi.updateQuiz(editingQuizId, {
          title: createTitle.trim(),
          description: createDesc.trim(),
          visibility: createVisibility,
        })
        if (createQuestions.length > 0) {
          await arenaApi.saveQuestions(editingQuizId, createQuestions)
        }
        setCreatorMessage({
          type: 'ok',
          text: `Deck "${createTitle.trim()}" updated successfully with ${createQuestions.length} questions!`,
        })
        fetchDecks()
      } else {
        // CREATE new deck
        const newQuiz = await arenaApi.createQuiz({
          title: createTitle.trim(),
          description: createDesc.trim(),
          visibility: createVisibility,
        })

        if (createQuestions.length > 0) {
          await arenaApi.saveQuestions(newQuiz.id, createQuestions)
        }

        setEditingQuizId(newQuiz.id)
        setCreatorMessage({
          type: 'ok',
          text: `Deck "${newQuiz.title}" created successfully with ${createQuestions.length} questions!`,
        })
        fetchDecks()
      }
    } catch (err: unknown) {
      setCreatorMessage({ type: 'err', text: (err as Error)?.message || 'Failed to save quiz.' })
    } finally {
      setIsCreatingQuiz(false)
    }
  }

  const handleDeleteQuiz = async (quizId?: string) => {
    const targetId = quizId || editingQuizId
    if (!targetId) return

    if (!window.confirm('Are you sure you want to delete this deck? This action cannot be undone.')) {
      return
    }

    setIsDeletingQuiz(true)
    try {
      await arenaApi.deleteQuiz(targetId)
      if (targetId === editingQuizId) {
        handleStartNewDeck()
      }
      setCreatorMessage({ type: 'ok', text: 'Deck deleted successfully.' })
      fetchDecks()
    } catch (err: unknown) {
      setCreatorMessage({ type: 'err', text: (err as Error)?.message || 'Failed to delete deck.' })
    } finally {
      setIsDeletingQuiz(false)
    }
  }

  // Quick Update from Host Match
  const handleApplyQuickUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!quickUpdateQuiz || !quickUpdateTitle.trim()) return
    setIsQuickUpdating(true)
    setQuickUpdateMsg(null)
    try {
      await arenaApi.updateQuiz(quickUpdateQuiz.id, {
        title: quickUpdateTitle.trim(),
        description: quickUpdateDesc.trim(),
        visibility: quickUpdateVisibility,
      })
      await fetchDecks()
      setQuickUpdateQuiz(null)
    } catch (err: unknown) {
      setQuickUpdateMsg({ type: 'err', text: (err as Error)?.message || 'Failed to update deck.' })
    } finally {
      setIsQuickUpdating(false)
    }
  }

  // Handle initial edit quiz id from URL or props
  useEffect(() => {
    if (initialEditQuizId) {
      handleLoadQuizForEdit(initialEditQuizId)
    }
  }, [initialEditQuizId])

  const handleHostFromCreator = async () => {
    if (!user) {
      if (onRequireLogin) onRequireLogin()
      return
    }

    if (editingQuizId) {
      handleHostLaunch(editingQuizId)
      return
    }

    if (!createTitle.trim()) {
      setCreatorMessage({ type: 'err', text: 'Please enter a deck title before hosting.' })
      return
    }

    setIsCreatingQuiz(true)
    try {
      const newQuiz = await arenaApi.createQuiz({
        title: createTitle.trim(),
        description: createDesc.trim(),
        visibility: createVisibility,
      })
      if (createQuestions.length > 0) {
        await arenaApi.saveQuestions(newQuiz.id, createQuestions)
      }
      fetchDecks()
      handleHostLaunch(newQuiz.id)
    } catch (err: unknown) {
      setCreatorMessage({ type: 'err', text: (err as Error)?.message || 'Failed to prepare deck for hosting.' })
    } finally {
      setIsCreatingQuiz(false)
    }
  }

  const handleSelectTab = (tab: 'join' | 'host' | 'decks' | 'create') => {
    setActiveTab(tab)
    try {
      const url = new URL(window.location.href)
      url.searchParams.set('tab', tab)
      window.history.replaceState(null, '', url.pathname + url.search)
    } catch {
      // ignore
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
    <div className="arena-studio-layout">
      {/* 1. Left Sidebar Navigation */}
      <aside className="arena-sidebar">
        <div className="arena-sidebar-brand">
          <span className="arena-sidebar-badge">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
            Conventus Arena
          </span>
          <h2 className="arena-sidebar-heading">Live Quiz Studio</h2>
        </div>

        <nav className="arena-sidebar-nav" aria-label="Arena modes">

          <button
            type="button"
            className="arena-sidebar-item"
            aria-selected={activeTab === 'join'}
            onClick={() => handleSelectTab('join')}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            <div className="arena-sidebar-item-text">
              <span className="arena-sidebar-item-title">Enter PIN</span>
              <span className="arena-sidebar-item-desc">Join match with 6-digit code</span>
            </div>
          </button>

          <button
            type="button"
            className="arena-sidebar-item"
            aria-selected={activeTab === 'host'}
            onClick={() => handleSelectTab('host')}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
            <div className="arena-sidebar-item-text">
              <span className="arena-sidebar-item-title">Host Match</span>
              <span className="arena-sidebar-item-desc">Launch multiplayer session</span>
            </div>
          </button>

          <button
            type="button"
            className="arena-sidebar-item"
            aria-selected={activeTab === 'create'}
            onClick={() => handleSelectTab('create')}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            <div className="arena-sidebar-item-text">
              <span className="arena-sidebar-item-title">Deck Creator</span>
              <span className="arena-sidebar-item-desc">Build timed question cards</span>
            </div>
          </button>

          <button
            type="button"
            className="arena-sidebar-item"
            aria-selected={activeTab === 'decks'}
            onClick={() => handleSelectTab('decks')}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
            </svg>
            <div className="arena-sidebar-item-text">
              <span className="arena-sidebar-item-title">Deck Library</span>
              <span className="arena-sidebar-item-desc">Browse study decks</span>
            </div>
          </button>

          {currentGameCode && (
            <button
              type="button"
              className="arena-sidebar-item arena-sidebar-active-match"
              onClick={() => navigate(`/arena/live/${currentGameCode}`)}
            >
              <span className="arena-pulse-dot" />
              <div className="arena-sidebar-item-text">
                <span className="arena-sidebar-item-title">PIN #{currentGameCode}</span>
                <span className="arena-sidebar-item-desc">
                  {gameStarted ? 'Live Match Running' : 'Lobby Waiting Room'}
                </span>
              </div>
            </button>
          )}
        </nav>

        <div className="arena-sidebar-footer">
          <div className="arena-sidebar-status">
            <span className="arena-sidebar-status-dot" />
            <span>{user ? `Logged in: ${user.username}` : 'Guest Player'}</span>
          </div>
        </div>
      </aside>

      {/* 2. Main Studio Workspace */}
      <main className="arena-workspace">
        <header className="arena-workspace-header">
          <div>
            <h1 className="arena-workspace-title">
              {activeTab === 'create' && 'Deck Creator'}
              {activeTab === 'host' && 'Host Live Match'}
              {activeTab === 'decks' && 'Deck Library'}
              {activeTab === 'join' && 'Join Live Match'}
              {activeTab === 'lobby' && 'Session Lobby'}
              {activeTab === 'play' && 'Live Quiz Match'}
              {activeTab === 'podium' && 'Leaderboard & Podium'}
            </h1>
            <p className="arena-workspace-desc">
              {activeTab === 'create' && 'Draft quiz banks with timed questions and instant multi-choice options.'}
              {activeTab === 'host' && 'Select any question bank or deck to generate a real-time multiplayer session.'}
              {activeTab === 'decks' && 'Explore your saved decks and discover decks shared by fellow learners.'}
              {activeTab === 'join' && 'Enter the 6-digit session PIN to enter the live game waiting room.'}
              {activeTab === 'lobby' && `Waiting room for PIN #${currentGameCode}.`}
              {activeTab === 'play' && `Live match active under PIN #${currentGameCode}.`}
              {activeTab === 'podium' && 'Final match standings and scores.'}
            </p>
          </div>



          {activeTab === 'decks' && (
            <div className="arena-workspace-actions">
              <button
                type="button"
                className="btn primary"
                onClick={() => handleSelectTab('create')}
              >
                + Create New Deck
              </button>
            </div>
          )}
        </header>

        <div className="arena-workspace-body">

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
              onClick={() => handleSelectTab('host')}
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
          {!user ? (
            <div style={{ textAlign: 'center', padding: '3.5rem 1.5rem', background: 'var(--surface)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 600, margin: '0 0 0.5rem' }}>Authentication Required to Host Matches</h3>
              <p style={{ color: 'var(--muted)', margin: '0 0 1.5rem', maxWidth: '28rem', marginInline: 'auto' }}>
                Hosting live quiz games requires an authenticated account to control session lobby, manage timers, and sync questions.
              </p>
              <button type="button" className="btn primary big" onClick={onRequireLogin}>
                Log in to Conventus →
              </button>
            </div>
          ) : (
            <>
              {/* Header Toolbar: Source Selector + Search Bar + Refresh */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
                {/* Source Segmented Control: My Decks vs Community Decks */}
                <div className="seg" style={{ width: 'fit-content' }}>
                  <button
                    type="button"
                    aria-selected={hostSourceTab === 'mine'}
                    onClick={() => setHostSourceTab('mine')}
                  >
                    My Decks ({myQuizzes.length})
                  </button>
                  <button
                    type="button"
                    aria-selected={hostSourceTab === 'community'}
                    onClick={() => setHostSourceTab('community')}
                  >
                    Community Decks ({discoverQuizzes.length})
                  </button>
                </div>

                {/* Search Bar in Host Match */}
                <div style={{ position: 'relative', flex: 1, minWidth: '15rem', maxWidth: '26rem' }}>
                  <span style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', opacity: 0.5, pointerEvents: 'none', fontSize: '0.875rem' }}>
                    🔍
                  </span>
                  <input
                    type="text"
                    className="inp"
                    style={{ paddingLeft: '2.3rem', paddingRight: hostSearchQuery ? '2rem' : '0.85rem', width: '100%', borderRadius: 'var(--radius-full, 9999px)', fontSize: '0.875rem' }}
                    placeholder={hostSourceTab === 'mine' ? 'Search your decks...' : 'Search community decks to host...'}
                    value={hostSearchQuery}
                    onChange={(e) => setHostSearchQuery(e.target.value)}
                  />
                  {hostSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setHostSearchQuery('')}
                      style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', cursor: 'pointer', opacity: 0.6, fontSize: '0.8rem' }}
                    >
                      ✕
                    </button>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <button
                    type="button"
                    className="btn line"
                    onClick={fetchDecks}
                    disabled={isLoadingDecks}
                    title="Refresh decks list"
                  >
                    ↻ Refresh
                  </button>
                  <button
                    type="button"
                    className="btn primary"
                    onClick={() => handleSelectTab('create')}
                  >
                    + Create Deck
                  </button>
                </div>
              </div>

              {/* Host Decks Grid */}
              <div className="arena-deck-grid">
                {(hostSourceTab === 'mine' ? myQuizzes : discoverQuizzes)
                  .filter((quiz) => {
                    if (!hostSearchQuery.trim()) return true
                    const q = hostSearchQuery.toLowerCase().trim()
                    return (
                      (quiz.title || '').toLowerCase().includes(q) ||
                      (quiz.description || '').toLowerCase().includes(q) ||
                      (quiz.owner || '').toLowerCase().includes(q)
                    )
                  })
                  .map((quiz) => (
                    <div key={quiz.id} className="arena-deck-card">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <span className={`badge ${quiz.visibility === 'public' ? 'b-prog' : 'b-live'}`}>
                          {quiz.visibility}
                        </span>
                        <span style={{ fontFamily: 'var(--f-mono)', fontSize: '0.8125rem', color: 'var(--muted)' }}>
                          {quiz.owner === user.username ? 'My Deck' : `by ${quiz.owner}`}
                        </span>
                      </div>
                      <h3 style={{ fontSize: '1.25rem', fontWeight: 600 }}>{quiz.title}</h3>
                      <p style={{ margin: 0, color: 'var(--muted)', fontSize: '0.875rem' }}>
                        {quiz.description || 'Comprehensive review questions for study groups.'}
                      </p>
                      <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.75rem', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '0.8125rem', color: 'var(--muted)', fontFamily: 'var(--f-mono)' }}>
                          {quiz.question_count || 0} Questions
                        </span>
                        <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', flexWrap: 'wrap' }}>
                          {user && quiz.owner === user.username && (
                            <>
                              <button
                                type="button"
                                className="btn ghost"
                                style={{ fontSize: '0.8125rem', padding: '0.35rem 0.65rem' }}
                                onClick={() => handleLoadQuizForEdit(quiz.id)}
                                title="Edit full deck and questions in creator"
                              >
                                ✏️ Edit
                              </button>
                              <button
                                type="button"
                                className="btn line"
                                style={{ fontSize: '0.8125rem', padding: '0.35rem 0.65rem' }}
                                onClick={() => {
                                  setQuickUpdateQuiz(quiz)
                                  setQuickUpdateTitle(quiz.title)
                                  setQuickUpdateDesc(quiz.description || '')
                                  setQuickUpdateVisibility(quiz.visibility)
                                  setQuickUpdateMsg(null)
                                }}
                                title="Update deck settings"
                              >
                                🔄 Update
                              </button>
                              <button
                                type="button"
                                className="btn ghost danger"
                                style={{ fontSize: '0.8125rem', padding: '0.35rem 0.65rem' }}
                                onClick={() => handleDeleteQuiz(quiz.id)}
                                title="Delete this deck"
                              >
                                🗑️ Delete
                              </button>
                            </>
                          )}
                          <button
                            type="button"
                            className="btn primary"
                            style={{ fontSize: '0.8125rem', padding: '0.35rem 0.85rem' }}
                            onClick={() => handleHostLaunch(quiz.id)}
                          >
                            ⚡ Host
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}

                {(hostSourceTab === 'mine' ? myQuizzes : discoverQuizzes).filter((quiz) => {
                  if (!hostSearchQuery.trim()) return true
                  const q = hostSearchQuery.toLowerCase().trim()
                  return (
                    (quiz.title || '').toLowerCase().includes(q) ||
                    (quiz.description || '').toLowerCase().includes(q) ||
                    (quiz.owner || '').toLowerCase().includes(q)
                  )
                }).length === 0 && (
                  <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '3rem', background: 'var(--surface)', borderRadius: 'var(--radius-lg)' }}>
                    {hostSearchQuery ? (
                      <div>
                        <p style={{ color: 'var(--muted)', margin: '0 0 1rem' }}>
                          No decks found matching "<strong>{hostSearchQuery}</strong>" in {hostSourceTab === 'mine' ? 'your decks' : 'community decks'}.
                        </p>
                        <button
                          type="button"
                          className="btn line"
                          onClick={() => setHostSearchQuery('')}
                        >
                          Clear Search
                        </button>
                      </div>
                    ) : hostSourceTab === 'mine' ? (
                      <div>
                        <p style={{ color: 'var(--muted)', margin: '0 0 1rem' }}>
                          You have not created any quiz decks yet. Build your first deck or browse community decks to host!
                        </p>
                        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
                          <button
                            type="button"
                            className="btn primary"
                            onClick={() => handleSelectTab('create')}
                          >
                            + Create New Deck
                          </button>
                          <button
                            type="button"
                            className="btn line"
                            onClick={() => setHostSourceTab('community')}
                          >
                            Browse Community Decks
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p style={{ color: 'var(--muted)', margin: 0 }}>
                        No community decks available right now.
                      </p>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* =====================================================================
       * TAB 3: DECK LIBRARY (Discover & My Decks)
       * ===================================================================== */}
      {activeTab === 'decks' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
            <div className="seg" style={{ width: 'fit-content' }}>
              <button
                type="button"
                aria-selected={decksSubTab === 'discover'}
                onClick={() => setDecksSubTab('discover')}
              >
                Community Decks ({discoverQuizzes.length})
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

            {/* Search Bar in Library */}
            <div style={{ position: 'relative', flex: 1, minWidth: '15rem', maxWidth: '26rem' }}>
              <span style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', opacity: 0.5, pointerEvents: 'none', fontSize: '0.875rem' }}>
                🔍
              </span>
              <input
                type="text"
                className="inp"
                style={{ paddingLeft: '2.3rem', paddingRight: librarySearchQuery ? '2rem' : '0.85rem', width: '100%', borderRadius: 'var(--radius-full, 9999px)', fontSize: '0.875rem' }}
                placeholder={decksSubTab === 'discover' ? 'Search community decks by title, topic, author...' : 'Search your decks...'}
                value={librarySearchQuery}
                onChange={(e) => setLibrarySearchQuery(e.target.value)}
              />
              {librarySearchQuery && (
                <button
                  type="button"
                  onClick={() => setLibrarySearchQuery('')}
                  style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', cursor: 'pointer', opacity: 0.6, fontSize: '0.8rem' }}
                >
                  ✕
                </button>
              )}
            </div>

            <button
              type="button"
              className="btn line"
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
              {(decksSubTab === 'discover' ? discoverQuizzes : myQuizzes)
                .filter((quiz) => {
                  if (!librarySearchQuery.trim()) return true
                  const q = librarySearchQuery.toLowerCase().trim()
                  return (
                    (quiz.title || '').toLowerCase().includes(q) ||
                    (quiz.description || '').toLowerCase().includes(q) ||
                    (quiz.owner || '').toLowerCase().includes(q)
                  )
                })
                .map((quiz) => (
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
                    <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.75rem', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '0.8125rem', color: 'var(--muted)' }}>
                        {quiz.question_count || 0} Questions
                      </span>
                      <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                        {user && quiz.owner === user.username && (
                          <>
                            <button
                              type="button"
                              className="btn ghost"
                              style={{ fontSize: '0.8125rem', padding: '0.3rem 0.55rem' }}
                              onClick={() => handleLoadQuizForEdit(quiz.id)}
                              title="Edit this deck"
                            >
                              ✏️ Edit
                            </button>
                            <button
                              type="button"
                              className="btn ghost danger"
                              style={{ fontSize: '0.8125rem', padding: '0.3rem 0.55rem' }}
                              onClick={() => handleDeleteQuiz(quiz.id)}
                              title="Delete this deck"
                            >
                              🗑️
                            </button>
                          </>
                        )}
                        <button
                          type="button"
                          className="btn primary"
                          style={{ fontSize: '0.8125rem', padding: '0.35rem 0.75rem' }}
                          onClick={() => handleHostLaunch(quiz.id)}
                        >
                          ⚡ Host Match
                        </button>
                      </div>
                    </div>
                  </div>
                ))}

              {(decksSubTab === 'discover' ? discoverQuizzes : myQuizzes).filter((quiz) => {
                if (!librarySearchQuery.trim()) return true
                const q = librarySearchQuery.toLowerCase().trim()
                return (
                  (quiz.title || '').toLowerCase().includes(q) ||
                  (quiz.description || '').toLowerCase().includes(q) ||
                  (quiz.owner || '').toLowerCase().includes(q)
                )
              }).length === 0 && (
                <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '3rem', background: 'var(--surface)', borderRadius: 'var(--radius-lg)' }}>
                  {librarySearchQuery ? (
                    <div>
                      <p style={{ color: 'var(--muted)', margin: '0 0 1rem' }}>
                        No decks found matching "<strong>{librarySearchQuery}</strong>".
                      </p>
                      <button
                        type="button"
                        className="btn line"
                        onClick={() => setLibrarySearchQuery('')}
                      >
                        Clear Search
                      </button>
                    </div>
                  ) : (
                    <div>
                      <p style={{ color: 'var(--muted)', margin: '0 0 1rem' }}>
                        {decksSubTab === 'mine'
                          ? 'You have not created any decks yet. Build your first deck now!'
                          : 'No public community decks found yet.'}
                      </p>
                      <button
                        type="button"
                        className="btn primary"
                        onClick={() => handleSelectTab('create')}
                      >
                        + Create New Deck
                      </button>
                    </div>
                  )}
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
        <div className="arena-creator-container">
          {/* Deck Creator Toolbar (CRUD + Host controls) */}
          <div className="arena-creator-toolbar">
            <div className="arena-creator-toolbar-left">
              {editingQuizId ? (
                <>
                  <span className="arena-edit-badge">
                    ✏️ Editing: {createTitle || 'Deck'}
                  </span>
                  <button
                    type="button"
                    className="btn line"
                    style={{ fontSize: '0.8125rem', padding: '0.35rem 0.75rem' }}
                    onClick={handleStartNewDeck}
                  >
                    + New Blank Deck
                  </button>
                </>
              ) : (
                <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--muted)' }}>
                  Drafting New Deck
                </span>
              )}

              {myQuizzes.length > 0 && (
                <select
                  value={editingQuizId || ''}
                  onChange={(e) => {
                    if (e.target.value) {
                      handleLoadQuizForEdit(e.target.value)
                    } else {
                      handleStartNewDeck()
                    }
                  }}
                  className="inp"
                  style={{ width: 'auto', padding: '0.35rem 0.65rem', fontSize: '0.8125rem' }}
                >
                  <option value="">Edit an existing deck...</option>
                  {myQuizzes.map((q) => (
                    <option key={q.id} value={q.id}>
                      {q.title} ({q.question_count || 0} Qs)
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="arena-creator-toolbar-right">
              <button
                type="button"
                className="btn ok"
                style={{ fontSize: '0.8125rem', padding: '0.35rem 0.85rem' }}
                onClick={handleHostFromCreator}
              >
                ⚡ Host This Deck Now
              </button>
            </div>
          </div>

          <form onSubmit={handleSaveOrUpdateQuiz} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
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
                  <p style={{ margin: 0, color: 'var(--muted)', fontSize: '0.9375rem' }}>
                    No questions added yet. Use the &ldquo;+ Add Question Card&rdquo; button above to create question cards.
                  </p>
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

            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <button
                type="submit"
                className="btn primary big"
                disabled={isCreatingQuiz}
              >
                {isCreatingQuiz ? 'Saving...' : 'Save Deck'}
              </button>

              {editingQuizId && (
                <button
                  type="button"
                  className="btn line danger big"
                  onClick={() => handleDeleteQuiz(editingQuizId)}
                  disabled={isDeletingQuiz}
                >
                  Delete Deck
                </button>
              )}
            </div>
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
                {leaderboard[1]?.display_name || '—'}
              </span>
              <span style={{ fontSize: '0.8125rem', color: 'var(--muted)', fontFamily: 'var(--f-mono)' }}>
                {leaderboard[1] ? `${leaderboard[1].points} pts` : '—'}
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

          {/* Full Leaderboard Table */}
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
          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn primary"
              onClick={() => {
                setCurrentGameCode(null)
                handleSelectTab('join')
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
                handleSelectTab('host')
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
      </main>

      {/* Quick Update Deck Modal for Host Match */}
      {quickUpdateQuiz && (
        <div className="arena-modal-overlay" onClick={() => setQuickUpdateQuiz(null)}>
          <div className="arena-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="arena-modal-header">
              <h3 className="arena-modal-title">Update Deck</h3>
              <button
                type="button"
                className="btn ghost"
                style={{ padding: '0.2rem 0.5rem', fontSize: '1rem' }}
                onClick={() => setQuickUpdateQuiz(null)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleApplyQuickUpdate} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="field">
                <label htmlFor="quTitle">Deck Title</label>
                <input
                  id="quTitle"
                  type="text"
                  value={quickUpdateTitle}
                  onChange={(e) => setQuickUpdateTitle(e.target.value)}
                  className="inp"
                  required
                />
              </div>

              <div className="field">
                <label htmlFor="quDesc">Description</label>
                <textarea
                  id="quDesc"
                  value={quickUpdateDesc}
                  onChange={(e) => setQuickUpdateDesc(e.target.value)}
                  className="inp"
                  rows={2}
                />
              </div>

              <div className="field">
                <label>Visibility</label>
                <div className="seg" style={{ width: 'fit-content' }}>
                  <button
                    type="button"
                    aria-selected={quickUpdateVisibility === 'public'}
                    onClick={() => setQuickUpdateVisibility('public')}
                  >
                    Public
                  </button>
                  <button
                    type="button"
                    aria-selected={quickUpdateVisibility === 'private'}
                    onClick={() => setQuickUpdateVisibility('private')}
                  >
                    Private
                  </button>
                </div>
              </div>

              {quickUpdateMsg && (
                <div className={`note ${quickUpdateMsg.type === 'ok' ? 'success' : 'error'}`}>
                  {quickUpdateMsg.text}
                </div>
              )}

              <div className="arena-modal-footer">
                <button
                  type="button"
                  className="btn line"
                  onClick={() => setQuickUpdateQuiz(null)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn primary"
                  disabled={isQuickUpdating}
                >
                  {isQuickUpdating ? 'Updating...' : 'Save Deck Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
