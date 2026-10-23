import { useState, useEffect, useRef } from 'react'
import { authApi } from '../api'
import type { UserProfile, Subject, GradeChoice, SubscriptionChoice } from '../api/types'
import {
  getCachedCustomPalettes,
  cacheCustomPalettes,
  dbPaletteToFrontend,
  getCurrentPaletteId,
  applyPaletteToDom,
  getContrastColor,
  type Palette,
} from '../theme/themes'

export interface ProfileViewProps {
  user: UserProfile | null
  onProfileUpdated: (updatedUser: UserProfile) => void
  onBackToHome: () => void
  onLogout: () => void
  onRequireLogin?: () => void
}

function normalizeHex(hex: string, fallback: string): string {
  const clean = hex.trim()
  if (/^#[0-9A-Fa-f]{6}$/.test(clean)) return clean.toUpperCase()
  if (/^#[0-9A-Fa-f]{3}$/.test(clean)) {
    return ('#' + clean[1] + clean[1] + clean[2] + clean[2] + clean[3] + clean[3]).toUpperCase()
  }
  return fallback
}

export function ProfileView({
  user,
  onProfileUpdated,
  onBackToHome,
  onLogout,
  onRequireLogin,
}: ProfileViewProps) {
  // ── Profile form state ───────────────────────────────────────
  const [username,    setUsername]    = useState(user?.username || '')
  const [email,       setEmail]       = useState(user?.email || '')
  const [firstName,   setFirstName]   = useState(user?.first_name || '')
  const [lastName,    setLastName]    = useState(user?.last_name || '')
  const [age,         setAge]         = useState<number | string>(user?.age ?? '')
  const [bio,         setBio]         = useState(user?.bio || '')
  const [placeOfWork, setPlaceOfWork] = useState(user?.place_of_work_or_education || '')
  const [grade,       setGrade]       = useState<string>(user?.grade || 'Other')
  const [subscription,setSubscription]= useState<string>(user?.subscription || 'FREE')
  const [selectedSubjectIds, setSelectedSubjectIds] = useState<number[]>(
    user?.subjects?.map((s) => s.id) || []
  )
  const [newPassword,     setNewPassword]     = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  // ── Metadata ────────────────────────────────────────────────
  const [availableSubjects, setAvailableSubjects] = useState<Subject[]>([])
  const [isSaving,  setIsSaving]  = useState(false)
  const [message,   setMessage]   = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  // ── Custom Theme Studio state ────────────────────────────────
  const [customThemes,     setCustomThemes]     = useState<Palette[]>(getCachedCustomPalettes)
  const [activePaletteId,  setActivePaletteId]  = useState<string>(getCurrentPaletteId)
  const [themeName,        setThemeName]        = useState('My Custom Theme')
  const [themeCategory,    setThemeCategory]    = useState<'light' | 'dark'>('light')
  const [color1,  setColor1]  = useState('#6366F1')
  const [color2,  setColor2]  = useState('#F97316')
  const [color3,  setColor3]  = useState('#10B981')
  const [enableFourth, setEnableFourth] = useState(false)
  const [color4,  setColor4]  = useState('#F59E0B')
  const [themeMsg, setThemeMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)
  const [isSavingTheme, setIsSavingTheme] = useState(false)

  // Track which user is currently loaded to prevent form clobber
  const lastSyncedUserIdRef = useRef<number | null>(user?.id ?? null)

  // ── Sync form if a DIFFERENT user logs in ────────────────────
  useEffect(() => {
    if (user && user.id !== lastSyncedUserIdRef.current) {
      lastSyncedUserIdRef.current = user.id
      setUsername(user.username || '')
      setEmail(user.email || '')
      setFirstName(user.first_name || '')
      setLastName(user.last_name || '')
      setAge(user.age ?? '')
      setBio(user.bio || '')
      setPlaceOfWork(user.place_of_work_or_education || '')
      setGrade(user.grade || 'Other')
      setSubscription(user.subscription || 'FREE')
      setSelectedSubjectIds(user.subjects?.map((s) => s.id) || [])
    }
  }, [user])

  // ── Load subjects once on mount ──────────────────────────────
  useEffect(() => {
    let alive = true
    authApi.getSubjects()
      .then((subs) => { if (alive) setAvailableSubjects(subs) })
      .catch(() => {
        if (alive) setAvailableSubjects([
          { id: 1, name: 'Mathematics' },
          { id: 2, name: 'Computer Science' },
          { id: 3, name: 'Physics' },
          { id: 4, name: 'Literature' },
          { id: 5, name: 'History' },
        ])
      })
    return () => { alive = false }
  }, [])

  // ── Load custom themes from DB on mount ─────────────────────
  useEffect(() => {
    let alive = true
    authApi.getPalettes()
      .then((dbPalettes) => {
        if (!alive) return
        const converted = dbPalettes.map(dbPaletteToFrontend)
        cacheCustomPalettes(converted)
        setCustomThemes(converted)
      })
      .catch(() => {
        // Fall back to localStorage cache if API fails
        setCustomThemes(getCachedCustomPalettes())
      })
    return () => { alive = false }
  }, [])

  // ── Listen for palette changes fired by other components ─────
  useEffect(() => {
    const handler = () => {
      setCustomThemes(getCachedCustomPalettes())
      setActivePaletteId(getCurrentPaletteId())
    }
    window.addEventListener('conventus_palettes_changed', handler)
    return () => window.removeEventListener('conventus_palettes_changed', handler)
  }, [])

  // ── Subject toggle ───────────────────────────────────────────
  const toggleSubject = (subId: number) => {
    setSelectedSubjectIds((prev) =>
      prev.includes(subId) ? prev.filter((id) => id !== subId) : [...prev, subId]
    )
  }

  // ── Save profile ─────────────────────────────────────────────
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage(null)

    if (!username.trim()) {
      setMessage({ type: 'err', text: 'Username cannot be blank.' })
      return
    }
    if (newPassword && newPassword !== confirmPassword) {
      setMessage({ type: 'err', text: 'New passwords do not match.' })
      return
    }

    setIsSaving(true)
    try {
      const payload: Record<string, unknown> = {
        username: username.trim(),
        email: email.trim(),
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        age: age !== '' && !isNaN(Number(age)) ? Number(age) : null,
        bio: bio.trim(),
        place_of_work_or_education: placeOfWork.trim(),
        grade: grade as GradeChoice,
        subscription: subscription as SubscriptionChoice,
        subjects: selectedSubjectIds,
      }
      if (newPassword.trim()) payload.password = newPassword.trim()

      const res = await authApi.updateProfile(payload)
      if (res?.user) {
        lastSyncedUserIdRef.current = res.user.id
        onProfileUpdated(res.user)
        setUsername(res.user.username || '')
        setEmail(res.user.email || '')
        setFirstName(res.user.first_name || '')
        setLastName(res.user.last_name || '')
        setAge(res.user.age ?? '')
        setBio(res.user.bio || '')
        setPlaceOfWork(res.user.place_of_work_or_education || '')
        setGrade(res.user.grade || 'Other')
        setSubscription(res.user.subscription || 'FREE')
        setSelectedSubjectIds(res.user.subjects?.map((s) => s.id) || [])
      }
      setMessage({ type: 'ok', text: res?.message || 'Profile saved successfully!' })
      setNewPassword('')
      setConfirmPassword('')
    } catch (err: unknown) {
      let errorMsg = 'Failed to update profile.'
      const apiErr = err as { message?: string; data?: unknown }
      if (apiErr.data && typeof apiErr.data === 'object') {
        const fieldErrors = Object.entries(apiErr.data as Record<string, unknown>)
          .map(([field, msgs]) => `${field.replace(/_/g, ' ')}: ${Array.isArray(msgs) ? msgs.join(' ') : String(msgs)}`)
          .join(' | ')
        if (fieldErrors) errorMsg = fieldErrors
      } else if (apiErr.message) {
        errorMsg = apiErr.message
      }
      setMessage({ type: 'err', text: errorMsg })
    } finally {
      setIsSaving(false)
    }
  }

  // ── Save custom theme to DB ───────────────────────────────────
  const handleSaveCustomTheme = async (e: React.FormEvent) => {
    e.preventDefault()
    setThemeMsg(null)
    setIsSavingTheme(true)

    const p1 = normalizeHex(color1, '#6366F1')
    const p2 = normalizeHex(color2, '#F97316')
    const p3 = normalizeHex(color3, '#10B981')
    const p4 = enableFourth ? normalizeHex(color4, '#F59E0B') : undefined
    const name = themeName.trim() || 'My Custom Theme'

    try {
      const created = await authApi.createPalette({
        name,
        category: themeCategory,
        color_primary:   p1,
        color_secondary: p2,
        color_accent:    p3,
        color_fourth:    p4,
      })

      const asFrontend = dbPaletteToFrontend(created)

      // Update cache and state
      const updated = [asFrontend, ...customThemes]
      cacheCustomPalettes(updated)
      setCustomThemes(updated)

      // Apply + persist active palette to DB
      await authApi.setActivePalette(asFrontend.id)
      applyPaletteToDom(asFrontend.id)
      setActivePaletteId(asFrontend.id)

      setThemeMsg({ type: 'ok', text: `"${name}" saved to your account and activated!` })
    } catch (err: unknown) {
      const apiErr = err as { message?: string }
      setThemeMsg({ type: 'err', text: apiErr.message || 'Failed to save theme. Check color values.' })
    } finally {
      setIsSavingTheme(false)
    }
  }

  // ── Apply a saved theme ───────────────────────────────────────
  const handleApplyTheme = async (id: string) => {
    applyPaletteToDom(id)
    setActivePaletteId(id)
    try {
      await authApi.setActivePalette(id)
    } catch { /* non-critical */ }
  }

  // ── Delete a saved theme ──────────────────────────────────────
  const handleDeleteTheme = async (theme: Palette) => {
    if (!theme.dbId) return
    try {
      const res = await authApi.deletePalette(theme.dbId)
      const updated = customThemes.filter((t) => t.id !== theme.id)
      cacheCustomPalettes(updated)
      setCustomThemes(updated)

      // If the deleted one was active, backend already reset it; apply that
      if (activePaletteId === theme.id) {
        const fallback = res.reset_to || 'campus'
        applyPaletteToDom(fallback)
        setActivePaletteId(fallback)
      }
      setThemeMsg({ type: 'ok', text: `Theme "${theme.name}" deleted.` })
    } catch (err: unknown) {
      const apiErr = err as { message?: string }
      setThemeMsg({ type: 'err', text: apiErr.message || 'Failed to delete theme.' })
    }
  }

  const applyPreset = (c1: string, c2: string, c3: string, c4?: string, mode: 'light' | 'dark' = 'light') => {
    setColor1(c1); setColor2(c2); setColor3(c3); setThemeCategory(mode)
    if (c4) { setEnableFourth(true); setColor4(c4) } else { setEnableFourth(false) }
  }

  const getInitials = () => {
    if (firstName && lastName) return `${firstName[0]}${lastName[0]}`.toUpperCase()
    if (username) return username.slice(0, 2).toUpperCase()
    return 'U'
  }

  // ── Access guard ─────────────────────────────────────────────
  if (!user) {
    return (
      <div className="profile-container wrap">
        <div style={{ maxWidth: '540px', margin: '4rem auto 2rem', textAlign: 'center' }}>
          <div style={{ width: '68px', height: '68px', borderRadius: '50%', background: 'var(--surface)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', color: 'var(--primary)' }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>
          <span className="badge b-live" style={{ margin: '0 auto 0.75rem' }}>Protected Route</span>
          <h1 style={{ fontSize: '1.875rem', fontWeight: 700, margin: '0 0 0.5rem' }}>Authentication Required</h1>
          <p style={{ color: 'var(--muted)', fontSize: '0.9375rem', lineHeight: 1.6, margin: '0 0 2rem' }}>
            Profile settings, enrolled subjects, and custom themes require an active Conventus account.
          </p>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button type="button" className="btn primary big" onClick={onRequireLogin || onBackToHome}>
              Log in to Conventus →
            </button>
            <button type="button" className="btn line big" onClick={onBackToHome}>
              Return to Home
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="profile-container wrap">

      {/* ── Header ── */}
      <div className="profile-header-card">
        <div className="profile-identity">
          <div className="profile-avatar-large">{getInitials()}</div>
          <div className="profile-meta">
            <h1 className="profile-display-name">
              {firstName || lastName ? `${firstName} ${lastName}`.trim() : username}
            </h1>
            <span className="profile-handle">@{username}</span>
            <div className="profile-badges-row">
              <span className="badge b-live">Plan: {subscription}</span>
              <span className="streak" style={{ margin: 0 }}>🔥 Active Learner</span>
              <span className="pill">{grade ? `${grade} Grade` : 'Student'}</span>
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.65rem' }}>
          <button type="button" className="btn line" onClick={onBackToHome}>← Return to Home</button>
          <button type="button" className="btn ghost" style={{ color: 'var(--danger)' }} onClick={onLogout}>Log Out</button>
        </div>
      </div>

      {/* ── Profile save feedback ── */}
      {message && (
        <div className={`note ${message.type === 'ok' ? 'success' : 'error'}`} style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span>{message.type === 'ok' ? '✓' : '⚠'}</span>
          <span>{message.text}</span>
        </div>
      )}

      {/* ── Main Profile Form ── */}
      <form onSubmit={handleSaveProfile}>

        {/* Section A: Basic Info */}
        <section className="profile-card-section">
          <div>
            <h2 className="profile-section-title">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
              </svg>
              Basic Information
            </h2>
            <p className="profile-section-desc">Manage how your name and details appear across games and classrooms.</p>
          </div>
          <div className="profile-grid-2">
            <div className="field">
              <label htmlFor="pUsername">Username</label>
              <input id="pUsername" type="text" className="inp" value={username} onChange={(e) => setUsername(e.target.value)} required />
            </div>
            <div className="field">
              <label htmlFor="pEmail">Email Address</label>
              <input id="pEmail" type="email" className="inp" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
          </div>
          <div className="profile-grid-2">
            <div className="field">
              <label htmlFor="pFirst">First Name</label>
              <input id="pFirst" type="text" className="inp" value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="e.g. Alex" />
            </div>
            <div className="field">
              <label htmlFor="pLast">Last Name</label>
              <input id="pLast" type="text" className="inp" value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="e.g. Taylor" />
            </div>
          </div>
          <div className="profile-grid-2">
            <div className="field">
              <label htmlFor="pAge">Age</label>
              <input id="pAge" type="number" min={5} max={120} className="inp" value={age} onChange={(e) => setAge(e.target.value)} placeholder="e.g. 20" />
            </div>
            <div className="field">
              <label htmlFor="pSchool">Place of Work or Education</label>
              <input id="pSchool" type="text" className="inp" value={placeOfWork} onChange={(e) => setPlaceOfWork(e.target.value)} placeholder="e.g. University / High School" />
            </div>
          </div>
          <div className="field">
            <label htmlFor="pBio">Bio / Study Interests</label>
            <textarea id="pBio" className="inp" rows={3} value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Tell others what you are studying or preparing for..." maxLength={500} />
            <span style={{ fontSize: '0.8125rem', color: 'var(--muted)', textAlign: 'right' }}>{bio.length} / 500</span>
          </div>
        </section>

        {/* Section B: Academic */}
        <section className="profile-card-section">
          <div>
            <h2 className="profile-section-title">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
              </svg>
              Academic Level &amp; Subjects
            </h2>
            <p className="profile-section-desc">Customize which subjects and grade-level decks are recommended to you.</p>
          </div>
          <div className="field" style={{ maxWidth: '24rem' }}>
            <label htmlFor="pGrade">Academic Grade / Level</label>
            <select id="pGrade" className="inp" value={grade} onChange={(e) => setGrade(e.target.value)}>
              <option value="1st">1st Grade</option>
              <option value="2nd">2nd Grade</option>
              <option value="11th">11th Grade</option>
              <option value="12th">12th Grade</option>
              <option value="Other">Other / University / Graduate</option>
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontWeight: 500, fontSize: '0.9375rem', marginBottom: '0.5rem' }}>Select Enrolled Subjects</label>
            <div className="profile-subjects-list">
              {availableSubjects.map((sub) => {
                const isSelected = selectedSubjectIds.includes(sub.id)
                return (
                  <button key={sub.id} type="button" className="profile-subject-chip" aria-pressed={isSelected} onClick={() => toggleSubject(sub.id)}>
                    <span>{isSelected ? '✓' : '+'}</span>
                    <span>{sub.name}</span>
                  </button>
                )
              })}
            </div>
          </div>
        </section>

        {/* Section C: Subscription */}
        <section className="profile-card-section">
          <div>
            <h2 className="profile-section-title">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
              Subscription Tier
            </h2>
            <p className="profile-section-desc">Change or upgrade your active study membership plan.</p>
          </div>
          <div className="profile-plan-grid">
            {(['FREE', 'PREMIUM', 'MAX'] as const).map((tier) => (
              <div key={tier} className={`profile-plan-card ${subscription === tier ? 'selected' : ''}`} onClick={() => setSubscription(tier)}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <strong style={{ fontSize: '1.1rem' }}>{tier === 'FREE' ? 'Free Plan' : tier === 'PREMIUM' ? 'Premium Student' : 'Max / Educator'}</strong>
                  {subscription === tier && <span className="badge b-live">Active</span>}
                </div>
                <p style={{ margin: 0, color: 'var(--muted)', fontSize: '0.875rem' }}>
                  {tier === 'FREE' ? 'Access to open classrooms, multiplayer Arena games, and community decks.'
                   : tier === 'PREMIUM' ? 'Unlimited active recall AI note conversions and priority exam answers.'
                   : 'Host unlimited classroom cohorts, question bank rubrics & analytics.'}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Section D: Security */}
        <section className="profile-card-section">
          <div>
            <h2 className="profile-section-title">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              Security Credentials
            </h2>
            <p className="profile-section-desc">Leave blank unless you wish to change your current password.</p>
          </div>
          <div className="profile-grid-2">
            <div className="field">
              <label htmlFor="pNewPw">New Password</label>
              <input id="pNewPw" type="password" className="inp" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Enter new secure password" autoComplete="new-password" />
            </div>
            <div className="field">
              <label htmlFor="pConfPw">Confirm New Password</label>
              <input id="pConfPw" type="password" className="inp" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Re-type new password" autoComplete="new-password" />
            </div>
          </div>
        </section>

        {/* Sticky save bar */}
        <div className="profile-actions-bar">
          <button type="button" className="btn ghost" onClick={onBackToHome}>Cancel</button>
          <button type="submit" className="btn primary" style={{ paddingInline: '1.5rem' }} disabled={isSaving}>
            {isSaving ? 'Saving Changes...' : 'Save All Profile Changes'}
          </button>
        </div>
      </form>

      {/* ── Section E: Custom Theme Studio ── */}
      <section className="profile-card-section" style={{ marginTop: '2.5rem' }}>
        <div className="theme-studio-header">
          <div>
            <h2 className="profile-section-title">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="13.5" cy="6.5" r=".5" fill="currentColor" /><circle cx="17.5" cy="10.5" r=".5" fill="currentColor" />
                <circle cx="8.5" cy="7.5" r=".5" fill="currentColor" /><circle cx="6.5" cy="12.5" r=".5" fill="currentColor" />
                <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.563-2.512 5.563-5.563C22 6.5 17.5 2 12 2z" />
              </svg>
              Custom Theme Studio
            </h2>
            <p className="profile-section-desc">
              Design your own palette — 3 required colors, up to 4 maximum. Themes are saved to your account and work on any device.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8125rem', color: 'var(--muted)', fontWeight: 500 }}>Base Tone:</span>
            <button type="button" className={`btn ${themeCategory === 'light' ? 'primary' : 'line'}`} style={{ padding: '0.35rem 0.75rem', fontSize: '0.8125rem' }} onClick={() => setThemeCategory('light')}>☀️ Light</button>
            <button type="button" className={`btn ${themeCategory === 'dark' ? 'primary' : 'line'}`} style={{ padding: '0.35rem 0.75rem', fontSize: '0.8125rem' }} onClick={() => setThemeCategory('dark')}>🌙 Dark</button>
          </div>
        </div>

        {themeMsg && (
          <div className={`note ${themeMsg.type === 'ok' ? 'success' : 'error'}`} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span>{themeMsg.type === 'ok' ? '✓' : '⚠'}</span><span>{themeMsg.text}</span>
          </div>
        )}

        {/* Quick Harmony Starters */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.8125rem', color: 'var(--muted)', fontWeight: 500 }}>Quick Harmonies:</span>
          <button type="button" className="btn line" style={{ padding: '0.3rem 0.65rem', fontSize: '0.75rem', borderRadius: 'var(--radius-full)' }} onClick={() => applyPreset('#6366F1', '#EC4899', '#10B981', undefined, 'light')}>🌸 Aurora Tri-Tone</button>
          <button type="button" className="btn line" style={{ padding: '0.3rem 0.65rem', fontSize: '0.75rem', borderRadius: 'var(--radius-full)' }} onClick={() => applyPreset('#8B5CF6', '#06B6D4', '#F43F5E', '#10B981', 'dark')}>⚡ Cyber Synth</button>
          <button type="button" className="btn line" style={{ padding: '0.3rem 0.65rem', fontSize: '0.75rem', borderRadius: 'var(--radius-full)' }} onClick={() => applyPreset('#059669', '#F59E0B', '#10B981', undefined, 'light')}>🌿 Emerald Amber</button>
          <button type="button" className="btn line" style={{ padding: '0.3rem 0.65rem', fontSize: '0.75rem', borderRadius: 'var(--radius-full)' }} onClick={() => applyPreset('#EA580C', '#2563EB', '#FBBF24', '#7C3AED', 'dark')}>🔥 Solar Eclipse</button>
        </div>

        {/* Theme Name */}
        <div className="field" style={{ maxWidth: '24rem' }}>
          <label htmlFor="pThemeName">Theme Name</label>
          <input id="pThemeName" type="text" className="inp" value={themeName} onChange={(e) => setThemeName(e.target.value)} placeholder="e.g. Sapphire Horizon" maxLength={35} />
        </div>

        {/* Color Pickers */}
        <div className="theme-studio-colors-grid">
          {/* Color 1 */}
          <div className="theme-color-card">
            <div className="theme-color-header">
              <span className="theme-color-tag">Color 1 (Required)</span>
              <span className="badge b-live" style={{ fontSize: '0.6875rem' }}>Primary</span>
            </div>
            <div className="theme-color-picker-wrap">
              <input type="color" aria-label="Primary color picker" className="theme-native-color-picker" value={normalizeHex(color1, '#6366F1')} onChange={(e) => setColor1(e.target.value)} />
              <input type="text" aria-label="Primary hex input" className="inp theme-hex-input" maxLength={7} value={color1} onChange={(e) => setColor1(e.target.value)} />
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>Buttons, highlights, brand actions</span>
          </div>

          {/* Color 2 */}
          <div className="theme-color-card">
            <div className="theme-color-header">
              <span className="theme-color-tag">Color 2 (Required)</span>
              <span className="badge" style={{ fontSize: '0.6875rem' }}>Secondary</span>
            </div>
            <div className="theme-color-picker-wrap">
              <input type="color" aria-label="Secondary color picker" className="theme-native-color-picker" value={normalizeHex(color2, '#F97316')} onChange={(e) => setColor2(e.target.value)} />
              <input type="text" aria-label="Secondary hex input" className="inp theme-hex-input" maxLength={7} value={color2} onChange={(e) => setColor2(e.target.value)} />
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>Badges, secondary buttons, warm accents</span>
          </div>

          {/* Color 3 */}
          <div className="theme-color-card">
            <div className="theme-color-header">
              <span className="theme-color-tag">Color 3 (Required)</span>
              <span className="pill" style={{ fontSize: '0.6875rem', margin: 0 }}>Third / Accent</span>
            </div>
            <div className="theme-color-picker-wrap">
              <input type="color" aria-label="Accent color picker" className="theme-native-color-picker" value={normalizeHex(color3, '#10B981')} onChange={(e) => setColor3(e.target.value)} />
              <input type="text" aria-label="Accent hex input" className="inp theme-hex-input" maxLength={7} value={color3} onChange={(e) => setColor3(e.target.value)} />
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>Tags, pills, focus borders &amp; callouts</span>
          </div>

          {/* Color 4 (Optional) */}
          <div className="theme-color-card" style={{ opacity: enableFourth ? 1 : 0.75 }}>
            <div className="theme-color-header">
              <span className="theme-color-tag">Color 4 (Max 4 Colors)</span>
              {enableFourth ? (
                <button type="button" className="btn ghost" style={{ padding: '0.1rem 0.4rem', fontSize: '0.75rem', color: 'var(--danger)' }} onClick={() => setEnableFourth(false)}>✕ Remove</button>
              ) : (
                <button type="button" className="btn line" style={{ padding: '0.1rem 0.45rem', fontSize: '0.75rem' }} onClick={() => setEnableFourth(true)}>+ Add 4th Color</button>
              )}
            </div>
            {enableFourth ? (
              <>
                <div className="theme-color-picker-wrap">
                  <input type="color" aria-label="Fourth color picker" className="theme-native-color-picker" value={normalizeHex(color4, '#F59E0B')} onChange={(e) => setColor4(e.target.value)} />
                  <input type="text" aria-label="Fourth hex input" className="inp theme-hex-input" maxLength={7} value={color4} onChange={(e) => setColor4(e.target.value)} />
                </div>
                <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>Surface tone &amp; outline glow</span>
              </>
            ) : (
              <div style={{ textAlign: 'center', paddingBlock: '0.5rem', color: 'var(--muted)', fontSize: '0.8125rem' }}>
                Click &ldquo;+ Add 4th Color&rdquo; to add a fourth color (at max 4).
              </div>
            )}
          </div>
        </div>

        {/* Live Preview */}
        <div>
          <label style={{ display: 'block', fontWeight: 600, fontSize: '0.9375rem', marginBottom: '0.5rem' }}>
            Live Preview ({enableFourth ? '4 Colors' : '3 Colors'} • {themeCategory.toUpperCase()})
          </label>
          <div className="theme-preview-card" style={{
            backgroundColor: themeCategory === 'dark' ? '#0F172A' : '#FFFFFF',
            borderColor: enableFourth ? normalizeHex(color4, '#F59E0B') : (themeCategory === 'dark' ? '#334155' : '#E5E7EB'),
            color: themeCategory === 'dark' ? '#F8FAFC' : '#111827',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700 }}>{themeName.trim() || 'My Custom Theme'}</h3>
                <span style={{ fontSize: '0.8125rem', color: themeCategory === 'dark' ? '#A5B1C5' : '#5B6472' }}>
                  {enableFourth ? '4-color' : '3-color'} harmony preview
                </span>
              </div>
              <div style={{ display: 'flex', gap: '0.4rem' }}>
                <span style={{ backgroundColor: color3, color: getContrastColor(color3), padding: '0.2rem 0.65rem', borderRadius: 'var(--radius-full)', fontSize: '0.75rem', fontWeight: 600 }}>Color 3 Tag</span>
                {enableFourth && (
                  <span style={{ backgroundColor: color4, color: getContrastColor(color4), padding: '0.2rem 0.65rem', borderRadius: 'var(--radius-full)', fontSize: '0.75rem', fontWeight: 600 }}>Color 4 Highlight</span>
                )}
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              <button type="button" style={{ backgroundColor: color1, color: getContrastColor(color1), border: 'none', padding: '0.55rem 1.1rem', borderRadius: 'var(--radius-md)', fontWeight: 600, fontSize: '0.875rem', cursor: 'default' }}>
                Color 1 Primary →
              </button>
              <button type="button" style={{ backgroundColor: color2, color: getContrastColor(color2), border: 'none', padding: '0.55rem 1.1rem', borderRadius: 'var(--radius-md)', fontWeight: 600, fontSize: '0.875rem', cursor: 'default' }}>
                Color 2 Secondary
              </button>
            </div>
          </div>
        </div>

        {/* Save action */}
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button type="button" className="btn primary" style={{ paddingInline: '1.5rem' }} onClick={handleSaveCustomTheme} disabled={isSavingTheme}>
            {isSavingTheme ? 'Saving to Account...' : 'Save & Apply Custom Theme'}
          </button>
        </div>

        {/* Saved custom themes gallery */}
        {customThemes.length > 0 && (
          <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border)' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 600, margin: '0 0 1rem' }}>
              Your Saved Themes ({customThemes.length}) — stored in your account
            </h3>
            <div className="theme-saved-grid">
              {customThemes.map((ct) => {
                const isActive = ct.id === activePaletteId
                return (
                  <div key={ct.id} className={`theme-saved-card ${isActive ? 'active-theme' : ''}`}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <strong style={{ fontSize: '0.9375rem' }}>{ct.name}</strong>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>{ct.category === 'dark' ? '🌙 Dark' : '☀️ Light'}</span>
                        {isActive && <span className="badge b-live" style={{ fontSize: '0.6875rem' }}>Active</span>}
                      </div>
                    </div>
                    <div className="theme-swatch-row">
                      <span className="theme-swatch-circle" style={{ backgroundColor: ct.primary }} title={`Primary: ${ct.primary}`} />
                      <span className="theme-swatch-circle" style={{ backgroundColor: ct.secondary }} title={`Secondary: ${ct.secondary}`} />
                      <span className="theme-swatch-circle" style={{ backgroundColor: ct.accent }} title={`Third: ${ct.accent}`} />
                      {ct.fourth && <span className="theme-swatch-circle" style={{ backgroundColor: ct.fourth }} title={`Fourth: ${ct.fourth}`} />}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.25rem' }}>
                      <button type="button" className="btn ghost" style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem', color: 'var(--danger)' }} onClick={() => handleDeleteTheme(ct)}>
                        Delete
                      </button>
                      <button type="button" className={`btn ${isActive ? 'line' : 'primary'}`} style={{ padding: '0.3rem 0.75rem', fontSize: '0.75rem' }} disabled={isActive} onClick={() => handleApplyTheme(ct.id)}>
                        {isActive ? 'Applied' : 'Apply Theme'}
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </section>
    </div>
  )
}
