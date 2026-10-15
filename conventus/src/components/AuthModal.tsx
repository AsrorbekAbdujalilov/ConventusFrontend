import { useState, useEffect, type FormEvent } from 'react'
import { authApi } from '../api'
import type { UserProfile } from '../api/types'

export interface AuthModalProps {
  isOpen: boolean
  initialMode: 'login' | 'register'
  onClose: () => void
  onSuccess: (user: UserProfile) => void
}

export function AuthModal({
  isOpen,
  initialMode,
  onClose,
  onSuccess,
}: AuthModalProps) {
  const [mode, setMode] = useState<'login' | 'register'>(initialMode)

  // Login form state
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')

  // Register additional fields
  const [email, setEmail] = useState('')
  const [grade, setGrade] = useState('12th')
  const [bio, setBio] = useState('')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  useEffect(() => {
    setMode(initialMode)
    setError(null)
    setSuccessMsg(null)
  }, [initialMode, isOpen])

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccessMsg(null)

    try {
      if (mode === 'login') {
        const res = await authApi.login({ username, password })
        if (res.user) {
          onSuccess(res.user)
        } else {
          const profile = await authApi.getProfile()
          onSuccess(profile)
        }
        onClose()
      } else {
        await authApi.register({
          username,
          password,
          email,
          grade,
          bio,
        })
        setSuccessMsg('Account created successfully! Logging you in...')
        // Automatically log in after registration
        const loginRes = await authApi.login({ username, password })
        if (loginRes.user) {
          onSuccess(loginRes.user)
        } else {
          const profile = await authApi.getProfile()
          onSuccess(profile)
        }
        setTimeout(() => {
          onClose()
        }, 600)
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Authentication failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        backgroundColor: 'rgba(15, 23, 42, 0.45)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        style={{
          width: '100%',
          maxWidth: '28rem',
          backgroundColor: 'var(--card)',
          borderRadius: '1.5rem',
          border: '1px solid var(--border)',
          boxShadow: 'var(--shadow)',
          padding: '2rem',
          position: 'relative',
        }}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close dialog"
          style={{
            position: 'absolute',
            top: '1.25rem',
            right: '1.25rem',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--muted)',
            fontSize: '1.25rem',
            lineHeight: 1,
            padding: '0.25rem',
          }}
        >
          ✕
        </button>

        <h2 style={{ fontFamily: 'var(--f-display)', fontSize: '1.5rem', fontWeight: 600, color: 'var(--text)', marginBottom: '0.4rem' }}>
          {mode === 'login' ? 'Welcome back to Conventus' : 'Create your Conventus account'}
        </h2>
        <p style={{ color: 'var(--muted)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
          {mode === 'login'
            ? 'Sign in to access your study decks, notes, and classrooms.'
            : 'Join the meeting point of all study tools. Free and student-crafted.'}
        </p>

        {error && (
          <div style={{ backgroundColor: '#fef2f2', border: '1px solid #f87171', color: '#b91c1c', padding: '0.6rem 0.8rem', borderRadius: '0.75rem', fontSize: '0.875rem', marginBottom: '1rem' }}>
            {error}
          </div>
        )}
        {successMsg && (
          <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #4ade80', color: '#15803d', padding: '0.6rem 0.8rem', borderRadius: '0.75rem', fontSize: '0.875rem', marginBottom: '1rem' }}>
            {successMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: 'var(--text)', marginBottom: '0.25rem' }}>
              Username
            </label>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. lysander_v"
              style={{
                width: '100%',
                padding: '0.6rem 0.8rem',
                borderRadius: '0.75rem',
                border: '1px solid var(--border)',
                backgroundColor: 'var(--bg)',
                color: 'var(--text)',
                fontSize: '0.9375rem',
              }}
            />
          </div>

          {mode === 'register' && (
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: 'var(--text)', marginBottom: '0.25rem' }}>
                Email (optional)
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="lysander@meridian.edu"
                style={{
                  width: '100%',
                  padding: '0.6rem 0.8rem',
                  borderRadius: '0.75rem',
                  border: '1px solid var(--border)',
                  backgroundColor: 'var(--bg)',
                  color: 'var(--text)',
                  fontSize: '0.9375rem',
                }}
              />
            </div>
          )}

          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: 'var(--text)', marginBottom: '0.25rem' }}>
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              style={{
                width: '100%',
                padding: '0.6rem 0.8rem',
                borderRadius: '0.75rem',
                border: '1px solid var(--border)',
                backgroundColor: 'var(--bg)',
                color: 'var(--text)',
                fontSize: '0.9375rem',
              }}
            />
          </div>

          {mode === 'register' && (
            <>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: 'var(--text)', marginBottom: '0.25rem' }}>
                  Grade / Year
                </label>
                <select
                  value={grade}
                  onChange={(e) => setGrade(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.6rem 0.8rem',
                    borderRadius: '0.75rem',
                    border: '1px solid var(--border)',
                    backgroundColor: 'var(--bg)',
                    color: 'var(--text)',
                    fontSize: '0.9375rem',
                  }}
                >
                  <option value="1st">1st Grade</option>
                  <option value="2nd">2nd Grade</option>
                  <option value="11th">11th Grade</option>
                  <option value="12th">12th Grade</option>
                  <option value="Other">Other / University</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: 'var(--text)', marginBottom: '0.25rem' }}>
                  Bio (optional)
                </label>
                <textarea
                  rows={2}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="What subjects are you focusing on?"
                  style={{
                    width: '100%',
                    padding: '0.6rem 0.8rem',
                    borderRadius: '0.75rem',
                    border: '1px solid var(--border)',
                    backgroundColor: 'var(--bg)',
                    color: 'var(--text)',
                    fontSize: '0.9375rem',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            </>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn primary"
            style={{ marginTop: '0.5rem', padding: '0.75rem' }}
          >
            {loading ? 'Please wait...' : mode === 'login' ? 'Sign in' : 'Create account'}
          </button>
        </form>

        <div style={{ marginTop: '1.25rem', textAlign: 'center', fontSize: '0.875rem', color: 'var(--muted)' }}>
          {mode === 'login' ? (
            <>
              Don't have an account?{' '}
              <button
                type="button"
                onClick={() => {
                  setMode('register')
                  setError(null)
                }}
                style={{ background: 'none', border: 'none', color: 'var(--primary)', fontWeight: 600, cursor: 'pointer', padding: 0 }}
              >
                Register now
              </button>
            </>
          ) : (
            <>
              Already registered?{' '}
              <button
                type="button"
                onClick={() => {
                  setMode('login')
                  setError(null)
                }}
                style={{ background: 'none', border: 'none', color: 'var(--primary)', fontWeight: 600, cursor: 'pointer', padding: 0 }}
              >
                Log in
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
