import { useState, useEffect, type FormEvent } from 'react'
import { authApi } from '../api'
import type { UserProfile } from '../api/types'

export interface AuthViewProps {
  initialMode?: 'login' | 'register'
  onSuccess: (user: UserProfile) => void
  onSwitchToHome?: () => void
}

export function AuthView({
  initialMode = 'login',
  onSuccess,
  onSwitchToHome,
}: AuthViewProps) {
  const [mode, setMode] = useState<'login' | 'register'>(initialMode)

  // Login form state
  const [loginId, setLoginId] = useState('')
  const [loginPw, setLoginPw] = useState('')
  const [showLoginPw, setShowLoginPw] = useState(false)
  const [loginErrors, setLoginErrors] = useState<{ id?: string; pw?: string }>({})
  const [loginNote, setLoginNote] = useState<{ text: string; type: 'info' | 'error' | 'success' } | null>(null)
  const [loginLoading, setLoginLoading] = useState(false)

  // Register form state
  const [regName, setRegName] = useState('')
  const [regUsername, setRegUsername] = useState('')
  const [regEmail, setRegEmail] = useState('')
  const [regPw, setRegPw] = useState('')
  const [showRegPw, setShowRegPw] = useState(false)
  const [regRole, setRegRole] = useState<'student' | 'teacher'>('student')
  const [regTerms, setRegTerms] = useState(true)
  const [regErrors, setRegErrors] = useState<{
    name?: string
    username?: string
    email?: string
    pw?: string
    terms?: string
  }>({})
  const [regNote, setRegNote] = useState<{ text: string; type: 'info' | 'error' | 'success' } | null>(null)
  const [regLoading, setRegLoading] = useState(false)

  // Sync mode with hash changes
  useEffect(() => {
    function handleHash() {
      const hash = window.location.hash
      if (hash === '#register') {
        setMode('register')
      } else if (hash === '#login') {
        setMode('login')
      }
    }
    handleHash()
    window.addEventListener('hashchange', handleHash)
    return () => window.removeEventListener('hashchange', handleHash)
  }, [])

  useEffect(() => {
    document.title = mode === 'register' ? 'Conventus Register' : 'Conventus Log In'
  }, [mode])

  // Password strength calculation
  const calcStrength = (p: string) => {
    let s = 0
    if (p.length >= 8) s++
    if (/[a-z]/.test(p) && /[A-Z]/.test(p)) s++
    if (/\d/.test(p)) s++
    if (/[^A-Za-z0-9]/.test(p) || p.length >= 12) s++
    return p ? Math.max(1, s) : 0
  }

  const pwStrength = calcStrength(regPw)
  const pwHints = [
    'Use 8 or more characters with letters and numbers.',
    'Weak. Add more characters.',
    'Fair. Mix upper and lower case.',
    'Good. A symbol or more length makes it strong.',
    'Strong password.',
  ]

  const switchMode = (newMode: 'login' | 'register') => {
    setMode(newMode)
    window.location.hash = newMode === 'register' ? 'register' : 'login'
    setLoginNote(null)
    setRegNote(null)
    setLoginErrors({})
    setRegErrors({})
  }

  const handleLoginSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const id = loginId.trim()
    const pw = loginPw

    const errors: { id?: string; pw?: string } = {}
    if (!id) errors.id = 'Enter your email or username.'
    if (!pw) errors.pw = 'Enter your password.'

    setLoginErrors(errors)
    if (Object.keys(errors).length > 0) return

    setLoginLoading(true)
    setLoginNote(null)

    try {
      const res = await authApi.login({ username: id, password: pw })
      setLoginNote({ text: 'Welcome back! Logging you in...', type: 'success' })
      if (res.user) {
        onSuccess(res.user)
      } else {
        const profile = await authApi.getProfile()
        onSuccess(profile)
      }
      setTimeout(() => {
        if (onSwitchToHome) onSwitchToHome()
      }, 500)
    } catch (err: unknown) {
      setLoginNote({
        text: err instanceof Error ? err.message : 'Invalid credentials. Please verify and try again.',
        type: 'error',
      })
    } finally {
      setLoginLoading(false)
    }
  }

  const handleRegisterSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const name = regName.trim()
    const u = regUsername.trim().replace(/^@/, '')
    const em = regEmail.trim()
    const pw = regPw

    const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(em)
    const errors: typeof regErrors = {}

    if (name.length < 2) errors.name = 'Enter your full name.'
    if (!/^[A-Za-z0-9_]{3,20}$/.test(u)) errors.username = 'Use 3 to 20 letters, numbers or underscores.'
    if (!emailValid) errors.email = 'Enter a valid email address.'
    if (pw.length < 8 || !/\d/.test(pw) || !/[A-Za-z]/.test(pw)) {
      errors.pw = 'Use at least 8 characters with letters and numbers.'
    }
    if (!regTerms) errors.terms = 'Agree to the Terms to continue.'

    setRegErrors(errors)
    if (Object.keys(errors).length > 0) return

    setRegLoading(true)
    setRegNote(null)

    try {
      await authApi.register({
        username: u,
        email: em,
        password: pw,
        name: name,
        role: regRole,
        place_of_work_or_education: regRole === 'teacher' ? 'Teacher' : 'Student',
      })

      setRegNote({
        text: `Account created for @${u}! Signing you in...`,
        type: 'success',
      })

      // Automatically log in after registration
      const loginRes = await authApi.login({ username: u, password: pw })
      if (loginRes.user) {
        onSuccess(loginRes.user)
      } else {
        const profile = await authApi.getProfile()
        onSuccess(profile)
      }

      setTimeout(() => {
        if (onSwitchToHome) onSwitchToHome()
      }, 600)
    } catch (err: unknown) {
      setRegNote({
        text: err instanceof Error ? err.message : 'Registration failed. Username or email may already be in use.',
        type: 'error',
      })
    } finally {
      setRegLoading(false)
    }
  }

  return (
    <div className="wrap">
      <div className="auth-grid">
        {/* Left Side: Editorial & Benefits */}
        <aside className="auth-side" aria-label="Why join Conventus">
          <span className="eyebrow-w">Welcome to Conventus</span>
          <h1 id="sideTitle">
            {mode === 'register' ? 'Join your study community.' : 'Welcome back.'}
          </h1>
          <p id="sideText">
            {mode === 'register'
              ? 'Make an account to join classrooms, keep notes and track your review streak.'
              : 'Pick up where you left off: your notes, your classrooms and your review streak are waiting.'}
          </p>
          <ul className="points">
            <li>
              <b>Classrooms</b>
              <span>Join with a code or open your own.</span>
            </li>
            <li>
              <b>Notes and flashcards</b>
              <span>Write once, review on a schedule.</span>
            </li>
            <li>
              <b>Games and assessments</b>
              <span>Quiz your group, then check the results.</span>
            </li>
          </ul>
          <p className="credit">
            Many features here started as <span className="pill-w">@Malika_S</span> and other students' ideas.
          </p>
        </aside>

        {/* Right Side: Tabbed Auth Card */}
        <section className="auth-card" aria-labelledby="formTitle">
          <div className="seg" role="tablist" aria-label="Account">
            <button
              type="button"
              role="tab"
              id="tabLogin"
              aria-selected={mode === 'login'}
              aria-controls="formLogin"
              onClick={() => switchMode('login')}
            >
              Log in
            </button>
            <button
              type="button"
              role="tab"
              id="tabRegister"
              aria-selected={mode === 'register'}
              aria-controls="formRegister"
              onClick={() => switchMode('register')}
            >
              Register
            </button>
          </div>

          {/* Login Form */}
          {mode === 'login' ? (
            <form id="formLogin" className="form" noValidate onSubmit={handleLoginSubmit} role="tabpanel" aria-labelledby="tabLogin">
              <div>
                <h2 id="formTitle">Log in to Conventus</h2>
                <p className="sub">Use your email or your @username.</p>
              </div>

              <div className="field">
                <label htmlFor="l-id">Email or username</label>
                <input
                  className="inp"
                  id="l-id"
                  name="id"
                  autoComplete="username"
                  placeholder="aziza@school.edu"
                  value={loginId}
                  onChange={(e) => {
                    setLoginId(e.target.value)
                    if (loginErrors.id) setLoginErrors((prev) => ({ ...prev, id: undefined }))
                  }}
                  aria-invalid={!!loginErrors.id}
                />
                {loginErrors.id && (
                  <span className="err" id="l-id-e" aria-live="polite">
                    {loginErrors.id}
                  </span>
                )}
              </div>

              <div className="field">
                <div className="row">
                  <label htmlFor="l-pw">Password</label>
                  <a className="link" href="#forgot" onClick={(e) => e.preventDefault()}>
                    Forgot password?
                  </a>
                </div>
                <div className="pw">
                  <input
                    className="inp"
                    id="l-pw"
                    name="password"
                    type={showLoginPw ? 'text' : 'password'}
                    autoComplete="current-password"
                    placeholder="Your password"
                    value={loginPw}
                    onChange={(e) => {
                      setLoginPw(e.target.value)
                      if (loginErrors.pw) setLoginErrors((prev) => ({ ...prev, pw: undefined }))
                    }}
                    aria-invalid={!!loginErrors.pw}
                  />
                  <button
                    type="button"
                    className="show"
                    onClick={() => setShowLoginPw((prev) => !prev)}
                    aria-label={showLoginPw ? 'Hide password' : 'Show password'}
                  >
                    {showLoginPw ? 'Hide' : 'Show'}
                  </button>
                </div>
                {loginErrors.pw && (
                  <span className="err" id="l-pw-e" aria-live="polite">
                    {loginErrors.pw}
                  </span>
                )}
              </div>

              <label className="check">
                <input type="checkbox" id="l-rem" defaultChecked />
                <span>Keep me signed in on this device</span>
              </label>

              <button className="btn primary big" type="submit" disabled={loginLoading}>
                {loginLoading ? 'Logging in...' : 'Log in'}
              </button>

              <div className="or">
                <span>or</span>
              </div>

              <button
                className="btn line big"
                type="button"
                onClick={() => setLoginNote({ text: 'Google SSO is coming soon.', type: 'info' })}
              >
                Continue with Google
              </button>

              <p className="switch">
                New to Conventus?{' '}
                <a
                  className="link"
                  href="#register"
                  onClick={(e) => {
                    e.preventDefault()
                    switchMode('register')
                  }}
                >
                  Create an account
                </a>
              </p>

              {loginNote && (
                <p className={`note ${loginNote.type}`} role="status" aria-live="polite">
                  {loginNote.text}
                </p>
              )}
            </form>
          ) : (
            /* Register Form */
            <form id="formRegister" className="form" noValidate onSubmit={handleRegisterSubmit} role="tabpanel" aria-labelledby="tabRegister">
              <div>
                <h2>Create your account</h2>
                <p className="sub">Free for students. Takes under a minute.</p>
              </div>

              <div className="two-f">
                <div className="field">
                  <label htmlFor="r-name">Full name</label>
                  <input
                    className="inp"
                    id="r-name"
                    name="name"
                    autoComplete="name"
                    placeholder="Aziza Karimova"
                    value={regName}
                    onChange={(e) => {
                      setRegName(e.target.value)
                      if (regErrors.name) setRegErrors((prev) => ({ ...prev, name: undefined }))
                    }}
                    aria-invalid={!!regErrors.name}
                  />
                  {regErrors.name && (
                    <span className="err" id="r-name-e" aria-live="polite">
                      {regErrors.name}
                    </span>
                  )}
                </div>

                <div className="field">
                  <label htmlFor="r-user">Username</label>
                  <div className="at">
                    <span>@</span>
                    <input
                      className="inp"
                      id="r-user"
                      name="username"
                      autoComplete="username"
                      placeholder="aziza_k"
                      value={regUsername}
                      onChange={(e) => {
                        setRegUsername(e.target.value)
                        if (regErrors.username) setRegErrors((prev) => ({ ...prev, username: undefined }))
                      }}
                      aria-invalid={!!regErrors.username}
                    />
                  </div>
                  {regErrors.username && (
                    <span className="err" id="r-user-e" aria-live="polite">
                      {regErrors.username}
                    </span>
                  )}
                </div>
              </div>

              <div className="field">
                <label htmlFor="r-email">Email</label>
                <input
                  className="inp"
                  id="r-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder="aziza@school.edu"
                  value={regEmail}
                  onChange={(e) => {
                    setRegEmail(e.target.value)
                    if (regErrors.email) setRegErrors((prev) => ({ ...prev, email: undefined }))
                  }}
                  aria-invalid={!!regErrors.email}
                />
                {regErrors.email && (
                  <span className="err" id="r-email-e" aria-live="polite">
                    {regErrors.email}
                  </span>
                )}
              </div>

              <div className="field">
                <label htmlFor="r-pw">Password</label>
                <div className="pw">
                  <input
                    className="inp"
                    id="r-pw"
                    name="password"
                    type={showRegPw ? 'text' : 'password'}
                    autoComplete="new-password"
                    placeholder="At least 8 characters"
                    value={regPw}
                    onChange={(e) => {
                      setRegPw(e.target.value)
                      if (regErrors.pw) setRegErrors((prev) => ({ ...prev, pw: undefined }))
                    }}
                    aria-invalid={!!regErrors.pw}
                  />
                  <button
                    type="button"
                    className="show"
                    onClick={() => setShowRegPw((prev) => !prev)}
                    aria-label={showRegPw ? 'Hide password' : 'Show password'}
                  >
                    {showRegPw ? 'Hide' : 'Show'}
                  </button>
                </div>
                <div className="meter" data-s={pwStrength} aria-hidden="true">
                  <i />
                  <i />
                  <i />
                  <i />
                </div>
                <span className="hintl" id="r-pw-h" aria-live="polite">
                  {pwHints[pwStrength]}
                </span>
                {regErrors.pw && (
                  <span className="err" id="r-pw-e" aria-live="polite">
                    {regErrors.pw}
                  </span>
                )}
              </div>

              <fieldset className="role">
                <legend>I am a</legend>
                <label>
                  <input
                    type="radio"
                    name="role"
                    value="student"
                    checked={regRole === 'student'}
                    onChange={() => setRegRole('student')}
                  />
                  <span>Student</span>
                </label>
                <label>
                  <input
                    type="radio"
                    name="role"
                    value="teacher"
                    checked={regRole === 'teacher'}
                    onChange={() => setRegRole('teacher')}
                  />
                  <span>Teacher</span>
                </label>
              </fieldset>

              <label className="check">
                <input
                  type="checkbox"
                  id="r-terms"
                  checked={regTerms}
                  onChange={(e) => {
                    setRegTerms(e.target.checked)
                    if (regErrors.terms) setRegErrors((prev) => ({ ...prev, terms: undefined }))
                  }}
                />
                <span>
                  I agree to the <a className="link" href="#terms" onClick={(e) => e.preventDefault()}>Terms</a> and{' '}
                  <a className="link" href="#privacy" onClick={(e) => e.preventDefault()}>Privacy Policy</a>
                </span>
              </label>
              {regErrors.terms && (
                <span className="err" id="r-terms-e" aria-live="polite">
                  {regErrors.terms}
                </span>
              )}

              <button className="btn primary big" type="submit" disabled={regLoading}>
                {regLoading ? 'Creating account...' : 'Create account'}
              </button>

              <div className="or">
                <span>or</span>
              </div>

              <button
                className="btn line big"
                type="button"
                onClick={() => setRegNote({ text: 'Google sign-up is coming soon.', type: 'info' })}
              >
                Sign up with Google
              </button>

              <p className="switch">
                Already have an account?{' '}
                <a
                  className="link"
                  href="#login"
                  onClick={(e) => {
                    e.preventDefault()
                    switchMode('login')
                  }}
                >
                  Log in
                </a>
              </p>

              {regNote && (
                <p className={`note ${regNote.type}`} role="status" aria-live="polite">
                  {regNote.text}
                </p>
              )}
            </form>
          )}
        </section>
      </div>
    </div>
  )
}
