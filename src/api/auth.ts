import { apiClient } from './client'
import type {
  AuthResponse,
  AuthStatusResponse,
  HealthCheckResponse,
  LoginPayload,
  RegisterPayload,
  Subject,
  UserProfile,
  UserProfileUpdatePayload,
  UserProfileUpdateResponse,
  UserPaletteDB,
  CreatePalettePayload,
  SetActivePaletteResponse,
  DeletePaletteResponse,
} from './types'

export const authApi = {
  /**
   * Health check to test backend connection
   */
  async checkHealth(): Promise<HealthCheckResponse> {
    return apiClient<HealthCheckResponse>('/api/health/', {
      method: 'GET',
    })
  },

  /**
   * Register a new user
   */
  async register(payload: RegisterPayload): Promise<{ message: string }> {
    return apiClient<{ message: string }>('/api/auth/register/', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },

  /**
   * Login user: Server responds with 200 OK and sets HttpOnly JWT cookies.
   * Tokens are NOT stored in JavaScript or localStorage.
   */
  async login(payload: LoginPayload): Promise<AuthResponse> {
    return apiClient<AuthResponse>('/api/auth/login/', {
      method: 'POST',
      body: JSON.stringify(payload),
      retryOn401: false,
    })
  },

  /**
   * Logout user: Server clears HttpOnly cookies.
   */
  async logout(): Promise<{ message: string }> {
    return apiClient<{ message: string }>('/api/auth/logout/', {
      method: 'POST',
    })
  },

  /**
   * Checks whether the current session has valid credentials via HttpOnly cookies.
   */
  async checkStatus(): Promise<AuthStatusResponse> {
    return apiClient<AuthStatusResponse>('/api/auth/status/', {
      method: 'GET',
      retryOn401: false,
    })
  },

  /**
   * Fetch currently authenticated user's profile (protected by JWT cookie)
   */
  async getProfile(): Promise<UserProfile> {
    return apiClient<UserProfile>('/api/auth/profile/', {
      method: 'GET',
    })
  },

  /**
   * Update authenticated user's profile (bio, grade, subscription, place_of_work, names, subjects, password)
   */
  async updateProfile(payload: UserProfileUpdatePayload): Promise<UserProfileUpdateResponse> {
    return apiClient<UserProfileUpdateResponse>('/api/auth/profile/', {
      method: 'PUT',
      body: JSON.stringify(payload),
    })
  },

  /**
   * List available subjects
   */
  async getSubjects(): Promise<Subject[]> {
    return apiClient<Subject[]>('/api/auth/subjects/', {
      method: 'GET',
    })
  },

  /**
   * Refresh JWT token using HttpOnly refresh cookie
   */
  async refreshToken(): Promise<{ message: string }> {
    return apiClient<{ message: string }>('/api/auth/token/refresh/', {
      method: 'POST',
      retryOn401: false,
    })
  },

  // ──────────────────────────────────────────────
  // CUSTOM PALETTE (DB-backed per-user themes)
  // ──────────────────────────────────────────────

  /**
   * List all custom palettes saved for the authenticated user
   */
  async getPalettes(): Promise<UserPaletteDB[]> {
    return apiClient<UserPaletteDB[]>('/api/auth/palettes/', {
      method: 'GET',
    })
  },

  /**
   * Create a new custom palette and save to DB
   */
  async createPalette(payload: CreatePalettePayload): Promise<UserPaletteDB> {
    return apiClient<UserPaletteDB>('/api/auth/palettes/', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },

  /**
   * Update an existing custom palette (rename or recolor)
   */
  async updatePalette(id: number, payload: Partial<CreatePalettePayload>): Promise<UserPaletteDB> {
    return apiClient<UserPaletteDB>(`/api/auth/palettes/${id}/`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    })
  },

  /**
   * Delete a custom palette from DB
   */
  async deletePalette(id: number): Promise<DeletePaletteResponse> {
    return apiClient<DeletePaletteResponse>(`/api/auth/palettes/${id}/`, {
      method: 'DELETE',
    })
  },

  /**
   * Tell the backend which palette is currently active (persists across devices)
   */
  async setActivePalette(paletteId: string): Promise<SetActivePaletteResponse> {
    return apiClient<SetActivePaletteResponse>('/api/auth/palettes/set-active/', {
      method: 'POST',
      body: JSON.stringify({ palette_id: paletteId }),
    })
  },
}
