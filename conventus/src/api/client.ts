export const getApiBaseUrl = (): string => {
  const envUrl = import.meta.env.VITE_API_BASE_URL
  if (envUrl && typeof envUrl === 'string') {
    return envUrl.replace(/\/$/, '')
  }
  return ''
}

export class ApiError extends Error {
  status: number
  data: unknown

  constructor(status: number, message: string, data?: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.data = data
  }
}

let isRefreshing = false
let refreshPromise: Promise<boolean> | null = null

const attemptCookieTokenRefresh = async (): Promise<boolean> => {
  if (isRefreshing && refreshPromise) {
    return refreshPromise
  }

  isRefreshing = true
  refreshPromise = (async () => {
    try {
      const baseUrl = getApiBaseUrl()
      // Send refresh request with credentials: 'include' so browser attaches HttpOnly refresh_token cookie
      const res = await fetch(`${baseUrl}/api/auth/token/refresh/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      })
      return res.ok
    } catch {
      return false
    } finally {
      isRefreshing = false
      refreshPromise = null
    }
  })()

  return refreshPromise
}

export interface RequestOptions extends RequestInit {
  retryOn401?: boolean
}

export async function apiClient<T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const baseUrl = getApiBaseUrl()
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`
  const url = `${baseUrl}${cleanEndpoint}`

  const headers = new Headers(options.headers || {})
  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json')
  }

  // credentials: 'include' ensures HttpOnly cookies are attached automatically
  const fetchOptions: RequestInit = {
    ...options,
    headers,
    credentials: 'include',
  }

  const response = await fetch(url, fetchOptions)

  // Handle 401 Unauthorized by attempting cookie-based refresh once
  const allowRetry = options.retryOn401 !== false && !endpoint.includes('/token/refresh') && !endpoint.includes('/login')
  if (response.status === 401 && allowRetry) {
    const refreshed = await attemptCookieTokenRefresh()
    if (refreshed) {
      // Retry original request with newly set HttpOnly cookie
      const retryResponse = await fetch(url, fetchOptions)
      if (retryResponse.ok) {
        if (retryResponse.status === 204) {
          return undefined as T
        }
        return retryResponse.json() as Promise<T>
      }
    }
  }

  let responseData: unknown = null
  const contentType = response.headers.get('content-type')
  if (contentType && contentType.includes('application/json')) {
    try {
      responseData = await response.json()
    } catch {
      responseData = null
    }
  } else {
    try {
      responseData = await response.text()
    } catch {
      responseData = null
    }
  }

  if (!response.ok) {
    let message = `API request failed with status ${response.status}`
    if (responseData && typeof responseData === 'object') {
      const dataObj = responseData as Record<string, unknown>
      if (typeof dataObj.message === 'string') {
        message = dataObj.message
      } else if (typeof dataObj.detail === 'string') {
        message = dataObj.detail
      } else {
        message = JSON.stringify(responseData)
      }
    } else if (typeof responseData === 'string' && responseData.trim()) {
      message = responseData
    }
    throw new ApiError(response.status, message, responseData)
  }

  return responseData as T
}
