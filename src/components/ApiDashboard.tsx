import { useState, useEffect, useCallback, type FormEvent } from 'react'
import { authApi } from '../api'
import type {
  UserProfile,
  Subject,
  HealthCheckResponse,
} from '../api'

export function ApiDashboard() {
  const [healthStatus, setHealthStatus] = useState<HealthCheckResponse | null>(null)
  const [healthLoading, setHealthLoading] = useState(false)
  const [healthError, setHealthError] = useState<string | null>(null)

  const [activeTab, setActiveTab] = useState<'status' | 'login' | 'register' | 'profile' | 'subjects'>('status')

  // Auth state managed securely via backend HttpOnly cookies
  const [isAuth, setIsAuth] = useState(false)
  const [checkingAuth, setCheckingAuth] = useState(true)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [profileLoading, setProfileLoading] = useState(false)
  const [profileError, setProfileError] = useState<string | null>(null)

  // Login form state
  const [loginUsername, setLoginUsername] = useState('demo_user')
  const [loginPassword, setLoginPassword] = useState('Secret123!')
  const [loginLoading, setLoginLoading] = useState(false)
  const [loginMessage, setLoginMessage] = useState<string | null>(null)
  const [loginError, setLoginError] = useState<string | null>(null)

  // Register form state
  const [regUsername, setRegUsername] = useState('')
  const [regEmail, setRegEmail] = useState('')
  const [regPassword, setRegPassword] = useState('')
  const [regGrade, setRegGrade] = useState('12th')
  const [regBio, setRegBio] = useState('')
  const [regWork, setRegWork] = useState('')
  const [regLoading, setRegLoading] = useState(false)
  const [regMessage, setRegMessage] = useState<string | null>(null)
  const [regError, setRegError] = useState<string | null>(null)

  // Subjects state
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [subjectsLoading, setSubjectsLoading] = useState(false)
  const [subjectsError, setSubjectsError] = useState<string | null>(null)

  // Health check handler
  const checkBackendHealth = useCallback(async () => {
    setHealthLoading(true)
    setHealthError(null)
    try {
      const res = await authApi.checkHealth()
      setHealthStatus(res)
    } catch (err: unknown) {
      setHealthStatus(null)
      setHealthError(err instanceof Error ? err.message : 'Failed to reach backend')
    } finally {
      setHealthLoading(false)
    }
  }, [])

  // Check initial cookie auth status
  const checkSessionStatus = useCallback(async () => {
    setCheckingAuth(true)
    try {
      const statusRes = await authApi.checkStatus()
      if (statusRes.authenticated && statusRes.user) {
        setIsAuth(true)
        setProfile(statusRes.user)
      } else {
        setIsAuth(false)
        setProfile(null)
      }
    } catch {
      setIsAuth(false)
      setProfile(null)
    } finally {
      setCheckingAuth(false)
    }
  }, [])

  // Profile fetcher
  const fetchProfile = useCallback(async () => {
    setProfileLoading(true)
    setProfileError(null)
    try {
      const user = await authApi.getProfile()
      setProfile(user)
      setIsAuth(true)
    } catch (err: unknown) {
      setProfileError(err instanceof Error ? err.message : 'Failed to load profile')
      if (err instanceof Error && err.message.includes('401')) {
        setIsAuth(false)
        setProfile(null)
      }
    } finally {
      setProfileLoading(false)
    }
  }, [])

  // Subjects fetcher
  const fetchSubjects = useCallback(async () => {
    setSubjectsLoading(true)
    setSubjectsError(null)
    try {
      const data = await authApi.getSubjects()
      setSubjects(data)
    } catch (err: unknown) {
      setSubjectsError(err instanceof Error ? err.message : 'Failed to load subjects')
    } finally {
      setSubjectsLoading(false)
    }
  }, [])

  useEffect(() => {
    checkBackendHealth()
    checkSessionStatus()
  }, [checkBackendHealth, checkSessionStatus])

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault()
    setLoginLoading(true)
    setLoginError(null)
    setLoginMessage(null)
    try {
      const res = await authApi.login({
        username: loginUsername,
        password: loginPassword,
      })
      setLoginMessage(res.message || 'Login successful!')
      setIsAuth(true)
      if (res.user) {
        setProfile(res.user)
      } else {
        await fetchProfile()
      }
      setActiveTab('profile')
    } catch (err: unknown) {
      setLoginError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setLoginLoading(false)
    }
  }

  const handleRegister = async (e: FormEvent) => {
    e.preventDefault()
    setRegLoading(true)
    setRegError(null)
    setRegMessage(null)
    try {
      const res = await authApi.register({
        username: regUsername,
        email: regEmail,
        password: regPassword,
        grade: regGrade,
        bio: regBio,
        place_of_work_or_education: regWork,
      })
      setRegMessage(res.message || 'Registration successful!')
      setLoginUsername(regUsername)
      setLoginPassword(regPassword)
      setActiveTab('login')
    } catch (err: unknown) {
      setRegError(err instanceof Error ? err.message : 'Registration failed')
    } finally {
      setRegLoading(false)
    }
  }

  const handleLogout = async () => {
    try {
      await authApi.logout()
    } catch {
      // Ignored
    } finally {
      setIsAuth(false)
      setProfile(null)
      setActiveTab('status')
    }
  }

  const handleRefreshTokens = async () => {
    try {
      const res = await authApi.refreshToken()
      alert(res.message || 'Token refreshed via HttpOnly cookie!')
      await fetchProfile()
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to refresh token')
    }
  }

  return (
    <div style={{ maxWidth: '860px', margin: '0 auto', padding: '24px 16px', textAlign: 'left' }}>
      {/* Header Banner */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px',
        background: 'var(--code-bg)',
        border: '1px solid var(--border)',
        borderRadius: '12px',
        padding: '16px 20px',
        marginBottom: '20px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{
            display: 'inline-block',
            width: '12px',
            height: '12px',
            borderRadius: '50%',
            backgroundColor: healthStatus?.status === 'ok' ? '#22c55e' : (healthLoading ? '#eab308' : '#ef4444'),
          }} />
          <div>
            <div style={{ fontWeight: 600, fontSize: '15px', color: 'var(--text-h)' }}>
              Backend API Status:{' '}
              {healthLoading
                ? 'Connecting...'
                : healthStatus?.status === 'ok'
                ? 'Online'
                : 'Offline / Unreachable'}
            </div>
            <div style={{ fontSize: '13px', color: 'var(--text)', marginTop: '2px' }}>
              {healthStatus?.message || healthError || 'Click Ping Backend to test'}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            type="button"
            onClick={checkBackendHealth}
            disabled={healthLoading}
            style={{
              padding: '6px 14px',
              fontSize: '13px',
              borderRadius: '6px',
              border: '1px solid var(--border)',
              backgroundColor: 'var(--bg)',
              color: 'var(--text-h)',
              cursor: 'pointer',
            }}
          >
            {healthLoading ? 'Testing...' : 'Ping Backend'}
          </button>
          {isAuth && (
            <button
              type="button"
              onClick={handleLogout}
              style={{
                padding: '6px 14px',
                fontSize: '13px',
                borderRadius: '6px',
                border: '1px solid #ef4444',
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                color: '#ef4444',
                cursor: 'pointer',
              }}
            >
              Log Out
            </button>
          )}
        </div>
      </div>

      {/* Security Architecture Badge */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '10px',
        fontSize: '13px',
        padding: '10px 16px',
        background: 'var(--accent-bg)',
        border: '1px solid var(--accent-border)',
        borderRadius: '8px',
        marginBottom: '20px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '16px' }}>🛡️</span>
          <div>
            <strong>Security:</strong> HttpOnly Cookie Authentication Active
            <span style={{ marginLeft: '8px', opacity: 0.85, fontSize: '12px' }}>
              (Tokens never touch localStorage / immune to XSS theft)
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span>
            <strong>State:</strong>{' '}
            {checkingAuth ? 'Checking...' : isAuth ? 'Authenticated' : 'Logged Out'}
          </span>
          {isAuth && (
            <button
              type="button"
              onClick={handleRefreshTokens}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--accent)',
                textDecoration: 'underline',
                cursor: 'pointer',
                fontSize: '12px',
              }}
            >
              Rotate Token
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex',
        gap: '8px',
        borderBottom: '1px solid var(--border)',
        marginBottom: '20px',
      }}>
        {[
          { id: 'status', label: '1. Architecture & Status' },
          { id: 'register', label: '2. Register' },
          { id: 'login', label: '3. Login' },
          { id: 'profile', label: '4. Profile (Protected)' },
          { id: 'subjects', label: '5. Subjects' },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => {
              setActiveTab(tab.id as typeof activeTab)
              if (tab.id === 'subjects' && subjects.length === 0) {
                fetchSubjects()
              }
              if (tab.id === 'profile' && isAuth) {
                fetchProfile()
              }
            }}
            style={{
              padding: '10px 16px',
              fontSize: '14px',
              fontWeight: 500,
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              borderBottom: activeTab === tab.id ? '2px solid var(--accent)' : '2px solid transparent',
              color: activeTab === tab.id ? 'var(--text-h)' : 'var(--text)',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab 1: Status & Architecture */}
      {activeTab === 'status' && (
        <div style={{ background: 'var(--code-bg)', padding: '20px', borderRadius: '10px' }}>
          <h3 style={{ marginTop: 0, color: 'var(--text-h)' }}>Best Practice: HttpOnly Cookie Architecture</h3>
          <p style={{ fontSize: '14px', color: 'var(--text)', marginBottom: '14px' }}>
            Instead of exposing JWT tokens to JavaScript via <code>localStorage</code>, the Conventus backend sets secure <code>HttpOnly</code> cookies.
            The browser attaches them automatically to requests with <code>credentials: 'include'</code>.
          </p>

          <table style={{ width: '100%', fontSize: '13px', borderCollapse: 'collapse', marginBottom: '16px' }}>
            <thead>
              <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--border)' }}>
                <th style={{ padding: '8px' }}>Endpoint</th>
                <th style={{ padding: '8px' }}>Method</th>
                <th style={{ padding: '8px' }}>Security Mechanism</th>
                <th style={{ padding: '8px' }}>Description</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={{ padding: '8px', fontFamily: 'var(--mono)' }}>/api/health/</td>
                <td style={{ padding: '8px' }}>GET</td>
                <td style={{ padding: '8px' }}>Public</td>
                <td style={{ padding: '8px' }}>Health check heartbeat</td>
              </tr>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={{ padding: '8px', fontFamily: 'var(--mono)' }}>/api/auth/register/</td>
                <td style={{ padding: '8px' }}>POST</td>
                <td style={{ padding: '8px' }}>Public</td>
                <td style={{ padding: '8px' }}>Creates new CustomUser</td>
              </tr>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={{ padding: '8px', fontFamily: 'var(--mono)' }}>/api/auth/login/</td>
                <td style={{ padding: '8px' }}>POST</td>
                <td style={{ padding: '8px' }}>Sets HttpOnly Cookies</td>
                <td style={{ padding: '8px' }}>Issues access_token and refresh_token cookies</td>
              </tr>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={{ padding: '8px', fontFamily: 'var(--mono)' }}>/api/auth/profile/</td>
                <td style={{ padding: '8px' }}>GET</td>
                <td style={{ padding: '8px' }}>CookieJWTAuthentication</td>
                <td style={{ padding: '8px' }}>Protected view authenticated via cookie</td>
              </tr>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={{ padding: '8px', fontFamily: 'var(--mono)' }}>/api/auth/status/</td>
                <td style={{ padding: '8px' }}>GET</td>
                <td style={{ padding: '8px' }}>Checks Cookie Session</td>
                <td style={{ padding: '8px' }}>Returns authenticated status on page load</td>
              </tr>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={{ padding: '8px', fontFamily: 'var(--mono)' }}>/api/auth/token/refresh/</td>
                <td style={{ padding: '8px' }}>POST</td>
                <td style={{ padding: '8px' }}>HttpOnly Refresh Cookie</td>
                <td style={{ padding: '8px' }}>Auto-refreshes access token cookie</td>
              </tr>
              <tr>
                <td style={{ padding: '8px', fontFamily: 'var(--mono)' }}>/api/auth/logout/</td>
                <td style={{ padding: '8px' }}>POST</td>
                <td style={{ padding: '8px' }}>Deletes Cookies</td>
                <td style={{ padding: '8px' }}>Safely terminates authentication session</td>
              </tr>
            </tbody>
          </table>

          <div style={{ marginTop: '16px' }}>
            <button
              type="button"
              onClick={checkBackendHealth}
              style={{
                padding: '8px 16px',
                borderRadius: '6px',
                background: 'var(--accent)',
                color: '#fff',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              Test Live Connection
            </button>
          </div>
        </div>
      )}

      {/* Tab 2: Register */}
      {activeTab === 'register' && (
        <form onSubmit={handleRegister} style={{ background: 'var(--code-bg)', padding: '20px', borderRadius: '10px' }}>
          <h3 style={{ marginTop: 0, color: 'var(--text-h)' }}>Register New User</h3>

          {regError && (
            <div style={{ background: '#fef2f2', border: '1px solid #f87171', color: '#b91c1c', padding: '10px', borderRadius: '6px', marginBottom: '14px', fontSize: '13px' }}>
              {regError}
            </div>
          )}
          {regMessage && (
            <div style={{ background: '#f0fdf4', border: '1px solid #4ade80', color: '#15803d', padding: '10px', borderRadius: '6px', marginBottom: '14px', fontSize: '13px' }}>
              {regMessage}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '4px' }}>Username *</label>
              <input
                type="text"
                required
                value={regUsername}
                onChange={(e) => setRegUsername(e.target.value)}
                placeholder="e.g. valerius_m"
                style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text-h)', boxSizing: 'border-box' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '4px' }}>Email</label>
              <input
                type="email"
                value={regEmail}
                onChange={(e) => setRegEmail(e.target.value)}
                placeholder="valerius@meridian.edu"
                style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text-h)', boxSizing: 'border-box' }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '4px' }}>Password *</label>
              <input
                type="password"
                required
                value={regPassword}
                onChange={(e) => setRegPassword(e.target.value)}
                placeholder="••••••••"
                style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text-h)', boxSizing: 'border-box' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '4px' }}>Grade</label>
              <select
                value={regGrade}
                onChange={(e) => setRegGrade(e.target.value)}
                style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text-h)', boxSizing: 'border-box' }}
              >
                <option value="1st">1st Grade</option>
                <option value="2nd">2nd Grade</option>
                <option value="11th">11th Grade</option>
                <option value="12th">12th Grade</option>
                <option value="Other">Other / Graduate</option>
              </select>
            </div>
          </div>

          <div style={{ marginBottom: '14px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '4px' }}>Bio</label>
            <textarea
              rows={2}
              value={regBio}
              onChange={(e) => setRegBio(e.target.value)}
              placeholder="Tell us a bit about yourself..."
              style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text-h)', boxSizing: 'border-box' }}
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '4px' }}>School / Work</label>
            <input
              type="text"
              value={regWork}
              onChange={(e) => setRegWork(e.target.value)}
              placeholder="e.g. Stanford University"
              style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text-h)', boxSizing: 'border-box' }}
            />
          </div>

          <button
            type="submit"
            disabled={regLoading}
            style={{
              padding: '10px 20px',
              borderRadius: '6px',
              background: 'var(--accent)',
              color: '#fff',
              border: 'none',
              cursor: 'pointer',
              fontWeight: 500,
            }}
          >
            {regLoading ? 'Registering...' : 'Submit Registration'}
          </button>
        </form>
      )}

      {/* Tab 3: Login */}
      {activeTab === 'login' && (
        <form onSubmit={handleLogin} style={{ background: 'var(--code-bg)', padding: '20px', borderRadius: '10px' }}>
          <h3 style={{ marginTop: 0, color: 'var(--text-h)' }}>Login (Sets HttpOnly Cookies)</h3>

          {loginError && (
            <div style={{ background: '#fef2f2', border: '1px solid #f87171', color: '#b91c1c', padding: '10px', borderRadius: '6px', marginBottom: '14px', fontSize: '13px' }}>
              {loginError}
            </div>
          )}
          {loginMessage && (
            <div style={{ background: '#f0fdf4', border: '1px solid #4ade80', color: '#15803d', padding: '10px', borderRadius: '6px', marginBottom: '14px', fontSize: '13px' }}>
              {loginMessage}
            </div>
          )}

          <div style={{ marginBottom: '14px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '4px' }}>Username</label>
            <input
              type="text"
              required
              value={loginUsername}
              onChange={(e) => setLoginUsername(e.target.value)}
              style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text-h)', boxSizing: 'border-box' }}
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '4px' }}>Password</label>
            <input
              type="password"
              required
              value={loginPassword}
              onChange={(e) => setLoginPassword(e.target.value)}
              style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text-h)', boxSizing: 'border-box' }}
            />
          </div>

          <button
            type="submit"
            disabled={loginLoading}
            style={{
              padding: '10px 20px',
              borderRadius: '6px',
              background: 'var(--accent)',
              color: '#fff',
              border: 'none',
              cursor: 'pointer',
              fontWeight: 500,
            }}
          >
            {loginLoading ? 'Authenticating...' : 'Sign In Securely'}
          </button>
        </form>
      )}

      {/* Tab 4: Protected Profile */}
      {activeTab === 'profile' && (
        <div style={{ background: 'var(--code-bg)', padding: '20px', borderRadius: '10px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <h3 style={{ margin: 0, color: 'var(--text-h)' }}>Authenticated User Profile</h3>
            {isAuth && (
              <button
                type="button"
                onClick={fetchProfile}
                disabled={profileLoading}
                style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  border: '1px solid var(--border)',
                  background: 'var(--bg)',
                  cursor: 'pointer',
                  fontSize: '13px',
                }}
              >
                {profileLoading ? 'Loading...' : 'Reload Profile'}
              </button>
            )}
          </div>

          {!isAuth ? (
            <div style={{ color: 'var(--text)', fontSize: '14px' }}>
              You are not logged in. Please sign in via the <strong>Login</strong> tab first to fetch protected data.
            </div>
          ) : profileLoading ? (
            <div style={{ color: 'var(--text)', fontSize: '14px' }}>Fetching profile from /api/auth/profile/...</div>
          ) : profileError ? (
            <div style={{ color: '#ef4444', fontSize: '14px' }}>Error: {profileError}</div>
          ) : profile ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '14px' }}>
              <div><strong>ID:</strong> {profile.id}</div>
              <div><strong>Username:</strong> {profile.username}</div>
              <div><strong>Email:</strong> {profile.email || '(none)'}</div>
              <div><strong>Grade:</strong> {profile.grade || '(unspecified)'}</div>
              <div><strong>Subscription:</strong> {profile.subscription}</div>
              <div><strong>Bio:</strong> {profile.bio || '(none)'}</div>
              <div><strong>Work/Education:</strong> {profile.place_of_work_or_education || '(none)'}</div>
              <div>
                <strong>Subjects ({profile.subjects.length}):</strong>{' '}
                {profile.subjects.length === 0
                  ? 'None'
                  : profile.subjects.map((s) => s.name).join(', ')}
              </div>

              <div style={{ marginTop: '14px' }}>
                <span style={{ fontSize: '12px', color: 'var(--text)' }}>Raw JSON Response:</span>
                <pre style={{
                  padding: '10px',
                  borderRadius: '6px',
                  background: 'var(--bg)',
                  fontSize: '12px',
                  overflowX: 'auto',
                  border: '1px solid var(--border)',
                }}>
                  {JSON.stringify(profile, null, 2)}
                </pre>
              </div>
            </div>
          ) : (
            <div style={{ color: 'var(--text)', fontSize: '14px' }}>No profile loaded.</div>
          )}
        </div>
      )}

      {/* Tab 5: Subjects */}
      {activeTab === 'subjects' && (
        <div style={{ background: 'var(--code-bg)', padding: '20px', borderRadius: '10px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <h3 style={{ margin: 0, color: 'var(--text-h)' }}>Academic Subjects</h3>
            <button
              type="button"
              onClick={fetchSubjects}
              disabled={subjectsLoading}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                border: '1px solid var(--border)',
                background: 'var(--bg)',
                cursor: 'pointer',
                fontSize: '13px',
              }}
            >
              {subjectsLoading ? 'Loading...' : 'Refresh Subjects'}
            </button>
          </div>

          {subjectsLoading ? (
            <div style={{ color: 'var(--text)', fontSize: '14px' }}>Fetching subjects from /api/auth/subjects/...</div>
          ) : subjectsError ? (
            <div style={{ color: '#ef4444', fontSize: '14px' }}>Error: {subjectsError}</div>
          ) : subjects.length === 0 ? (
            <div style={{ color: 'var(--text)', fontSize: '14px' }}>
              No subjects registered in the database yet.
            </div>
          ) : (
            <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '14px' }}>
              {subjects.map((sub) => (
                <li key={sub.id} style={{ marginBottom: '4px' }}>
                  <strong>{sub.name}</strong> <span style={{ color: 'var(--text)', fontSize: '12px' }}>(ID: {sub.id})</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
