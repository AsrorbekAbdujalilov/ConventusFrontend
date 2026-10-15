import { apiClient, getApiBaseUrl } from './client'
import type {
  Quiz,
  Question,
  Player,
  JoinGameResponse,
  HostGameResponse,
  GameStatusResponse,
  SubmitAnswerPayload,
  AnswerResponse,
  LeaderboardResponse,
  CreateQuizPayload,
  BulkQuestionInput,
} from './types'

export const arenaApi = {
  // --- Quiz Management ---
  getMyQuizzes: async (): Promise<Quiz[]> => {
    return apiClient<Quiz[]>('/api/arena/quiz/my/')
  },

  getDiscoverQuizzes: async (): Promise<Quiz[]> => {
    return apiClient<Quiz[]>('/api/arena/quiz/discover/')
  },

  getQuizDetail: async (quizId: string): Promise<Quiz> => {
    return apiClient<Quiz>(`/api/arena/quiz/${quizId}/`)
  },

  createQuiz: async (payload: CreateQuizPayload): Promise<Quiz> => {
    return apiClient<Quiz>('/api/arena/quiz/', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },

  updateQuiz: async (quizId: string, payload: Partial<CreateQuizPayload>): Promise<Quiz> => {
    return apiClient<Quiz>(`/api/arena/quiz/${quizId}/`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    })
  },

  deleteQuiz: async (quizId: string): Promise<void> => {
    return apiClient<void>(`/api/arena/quiz/${quizId}/`, {
      method: 'DELETE',
    })
  },

  saveQuestions: async (quizId: string, questions: BulkQuestionInput[]): Promise<Quiz> => {
    return apiClient<Quiz>(`/api/arena/quiz/${quizId}/questions/`, {
      method: 'POST',
      body: JSON.stringify(questions),
    })
  },

  // --- Game Session Hosting & Joining ---
  hostGame: async (
    quizId: string,
    options: { game_type?: 'solo' | 'team'; duration?: number } = {}
  ): Promise<HostGameResponse> => {
    return apiClient<HostGameResponse>(`/api/arena/quiz/${quizId}/host/`, {
      method: 'POST',
      body: JSON.stringify({
        game_type: options.game_type || 'solo',
        duration: options.duration || 0,
      }),
    })
  },

  joinGame: async (payload: { code: string; display_name: string }): Promise<JoinGameResponse> => {
    return apiClient<JoinGameResponse>('/api/arena/join/', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },

  startGame: async (code: string): Promise<{ detail: string; code: string }> => {
    return apiClient<{ detail: string; code: string }>(`/api/arena/game/${code}/start/`, {
      method: 'POST',
    })
  },

  stopGame: async (code: string): Promise<{ detail: string; code: string }> => {
    return apiClient<{ detail: string; code: string }>(`/api/arena/game/${code}/stop/`, {
      method: 'POST',
    })
  },

  // --- In-Game Operations ---
  getGameStatus: async (code: string): Promise<GameStatusResponse> => {
    return apiClient<GameStatusResponse>(`/api/arena/game/${code}/status/`)
  },

  getGamePlayers: async (code: string): Promise<Player[]> => {
    return apiClient<Player[]>(`/api/arena/game/${code}/players/`)
  },

  getGameQuestions: async (code: string, token: string): Promise<Question[]> => {
    return apiClient<Question[]>(`/api/arena/game/${code}/questions/?token=${encodeURIComponent(token)}`)
  },

  submitAnswer: async (code: string, payload: SubmitAnswerPayload): Promise<AnswerResponse> => {
    return apiClient<AnswerResponse>(`/api/arena/game/${code}/answer/`, {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },

  getLeaderboard: async (code: string): Promise<LeaderboardResponse> => {
    return apiClient<LeaderboardResponse>(`/api/arena/game/${code}/leaderboard/`)
  },
}

// --- WebSocket Real-Time Connection Helper ---
export interface ArenaWsCallbacks {
  onPlayerJoined?: (player: { display_name: string; player_count: number }) => void
  onPlayerLeft?: (player: { display_name: string }) => void
  onGameStarted?: (code: string) => void
  onGameStopped?: (code: string) => void
  onLeaderboardUpdate?: (leaderboard: { display_name: string; points: number }[]) => void
  onError?: (err: Event) => void
  onOpen?: () => void
  onClose?: () => void
}

export function connectArenaWebSocket(
  code: string,
  callbacks: ArenaWsCallbacks
): () => void {
  const baseUrl = getApiBaseUrl()
  let wsUrl = ''

  if (baseUrl.startsWith('http://')) {
    wsUrl = baseUrl.replace('http://', 'ws://') + `/ws/arena/${code}/`
  } else if (baseUrl.startsWith('https://')) {
    wsUrl = baseUrl.replace('https://', 'wss://') + `/ws/arena/${code}/`
  } else {
    // Relative, derive from browser window location
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    wsUrl = `${protocol}//${window.location.host}/ws/arena/${code}/`
  }

  let ws: WebSocket | null = null
  let isClosedManually = false

  try {
    ws = new WebSocket(wsUrl)

    ws.onopen = () => {
      if (callbacks.onOpen) callbacks.onOpen()
    }

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        switch (data.type) {
          case 'player_joined':
            if (callbacks.onPlayerJoined) callbacks.onPlayerJoined(data.player)
            break
          case 'player_left':
            if (callbacks.onPlayerLeft) callbacks.onPlayerLeft(data.player)
            break
          case 'game_started':
            if (callbacks.onGameStarted) callbacks.onGameStarted(data.code)
            break
          case 'game_stopped':
            if (callbacks.onGameStopped) callbacks.onGameStopped(data.code)
            break
          case 'leaderboard_update':
            if (callbacks.onLeaderboardUpdate) callbacks.onLeaderboardUpdate(data.leaderboard)
            break
          default:
            break
        }
      } catch {
        // ignore malformed JSON
      }
    }

    ws.onerror = (e) => {
      if (!isClosedManually && callbacks.onError) callbacks.onError(e)
    }

    ws.onclose = () => {
      if (!isClosedManually && callbacks.onClose) callbacks.onClose()
    }
  } catch {
    // Fallback if WS construction throws
  }

  // Return cleanup function to disconnect
  return () => {
    isClosedManually = true
    if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
      ws.close()
    }
  }
}
