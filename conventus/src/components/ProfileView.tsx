import { useState, useEffect } from 'react'
import { authApi } from '../api'
import type { UserProfile, Subject } from '../api/types'

export interface ProfileViewProps {
  user: UserProfile | null
  onProfileUpdated: (updatedUser: UserProfile) => void
  onBackToHome: () => void
  onLogout: () => void
}

export function ProfileView({
  user,
  onProfileUpdated,
  onBackToHome,
  onLogout,
}: ProfileViewProps) {
  // Form fields
  const [username, setUsername] = useState(user?.username || '')
  const [email, setEmail] = useState(user?.email || '')
  const [firstName, setFirstName] = useState(user?.first_name || '')
  const [lastName, setLastName] = useState(user?.last_name || '')
  const [age, setAge] = useState<number | string>(user?.age ?? '')
  const [bio, setBio] = useState(user?.bio || '')
  const [placeOfWork, setPlaceOfWork] = useState(user?.place_of_work_or_education || '')
  const [grade, setGrade] = useState(user?.grade || 'Other')
  const [subscription, setSubscription] = useState(user?.subscription || 'FREE')
  const [selectedSubjectIds, setSelectedSubjectIds] = useState<number[]>(
    user?.subjects?.map((s) => s.id) || []
  )

  // Security password change fields
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  // Metadata
  const [availableSubjects, setAvailableSubjects] = useState<Subject[]>([])
  const [isSaving, setIsSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  // Sync state if user changes externally
  useEffect(() => {
    if (user) {
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

  // Load latest profile & subjects from backend
  useEffect(() => {
    authApi.getSubjects()
      .then((subs) => setAvailableSubjects(subs))
      .catch(() => {
        // Fallback default subjects if table is empty
        setAvailableSubjects([
          { id: 1, name: 'Biology & Life Sciences' },
          { id: 2, name: 'Calculus & Linear Algebra' },
          { id: 3, name: 'Computer Science & Algorithms' },
          { id: 4, name: 'World History' },
          { id: 5, name: 'English Literature' },
          { id: 6, name: 'Physics & Mechanics' },
        ])
      })

    authApi.getProfile()
      .then((latest) => {
        if (latest) {
          onProfileUpdated(latest)
        }
      })
      .catch(() => {
        // user might need to log in
      })
  }, [onProfileUpdated])

  const toggleSubject = (subId: number) => {
    setSelectedSubjectIds((prev) =>
      prev.includes(subId) ? prev.filter((id) => id !== subId) : [...prev, subId]
    )
  }

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
        age: age ? Number(age) : null,
        bio: bio.trim(),
        place_of_work_or_education: placeOfWork.trim(),
        grade,
        subscription,
        subjects: selectedSubjectIds,
      }

      if (newPassword.trim()) {
        payload.password = newPassword.trim()
      }

      const res = await authApi.updateProfile(payload)
      onProfileUpdated(res.user)
      setMessage({ type: 'ok', text: 'Profile & settings successfully saved!' })
      setNewPassword('')
      setConfirmPassword('')
    } catch (err: unknown) {
      const msg = (err as Error)?.message || 'Failed to update profile.'
      setMessage({ type: 'err', text: msg })
    } finally {
      setIsSaving(false)
    }
  }

  const getInitials = () => {
    if (firstName && lastName) return `${firstName[0]}${lastName[0]}`.toUpperCase()
    if (username) return username.slice(0, 2).toUpperCase()
    return 'U'
  }

  return (
    <div className="profile-container wrap">
      {/* 1. Header Card with Avatar & Badges */}
      <div className="profile-header-card">
        <div className="profile-identity">
          <div className="profile-avatar-large">
            {getInitials()}
          </div>
          <div className="profile-meta">
            <h1 className="profile-display-name">
              {firstName || lastName ? `${firstName} ${lastName}`.trim() : username}
            </h1>
            <span className="profile-handle">@{username}</span>
            <div className="profile-badges-row">
              <span className="badge b-live">
                Plan: {subscription}
              </span>
              <span className="streak" style={{ margin: 0 }}>
                🔥 12-day streak
              </span>
              <span className="pill">
                {grade ? `${grade} Grade` : 'Student'}
              </span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.65rem' }}>
          <button
            type="button"
            className="btn line"
            onClick={onBackToHome}
          >
            ← Return to Home
          </button>
          <button
            type="button"
            className="btn ghost"
            style={{ color: 'var(--danger)' }}
            onClick={onLogout}
          >
            Log Out
          </button>
        </div>
      </div>

      {/* 2. Notification Feedback */}
      {message && (
        <div
          className={`note ${message.type === 'ok' ? 'success' : 'error'}`}
          style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
        >
          <span>{message.type === 'ok' ? '✓' : '⚠'}</span>
          <span>{message.text}</span>
        </div>
      )}

      {/* 3. Main Form */}
      <form onSubmit={handleSaveProfile}>
        {/* Section A: Identity & Personal Information */}
        <section className="profile-card-section">
          <div>
            <h2 className="profile-section-title">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
              Basic Information
            </h2>
            <p className="profile-section-desc">Manage how you appear across classrooms and games.</p>
          </div>

          <div className="profile-grid-2">
            <div className="field">
              <label htmlFor="pUsername">Username</label>
              <input
                id="pUsername"
                type="text"
                className="inp"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>

            <div className="field">
              <label htmlFor="pEmail">Email Address</label>
              <input
                id="pEmail"
                type="email"
                className="inp"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div className="profile-grid-2">
            <div className="field">
              <label htmlFor="pFirst">First Name</label>
              <input
                id="pFirst"
                type="text"
                className="inp"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="e.g. Asrorbek"
              />
            </div>

            <div className="field">
              <label htmlFor="pLast">Last Name</label>
              <input
                id="pLast"
                type="text"
                className="inp"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="e.g. Abdujalilov"
              />
            </div>
          </div>

          <div className="profile-grid-2">
            <div className="field">
              <label htmlFor="pAge">Age</label>
              <input
                id="pAge"
                type="number"
                min={5}
                max={120}
                className="inp"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                placeholder="e.g. 19"
              />
            </div>

            <div className="field">
              <label htmlFor="pSchool">Place of Work or Education</label>
              <input
                id="pSchool"
                type="text"
                className="inp"
                value={placeOfWork}
                onChange={(e) => setPlaceOfWork(e.target.value)}
                placeholder="e.g. Westminster International University"
              />
            </div>
          </div>

          <div className="field">
            <label htmlFor="pBio">Bio / Study Interests</label>
            <textarea
              id="pBio"
              className="inp"
              rows={3}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell others what you are studying or preparing for..."
              maxLength={500}
            />
            <span style={{ fontSize: '0.8125rem', color: 'var(--muted)', textAlign: 'right' }}>
              {bio.length} / 500 characters
            </span>
          </div>
        </section>

        {/* Section B: Academic Grade & Enrolled Subjects */}
        <section className="profile-card-section">
          <div>
            <h2 className="profile-section-title">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
              </svg>
              Academic Level &amp; Subjects
            </h2>
            <p className="profile-section-desc">Customize which subjects and grade-level decks are recommended to you.</p>
          </div>

          <div className="field" style={{ maxWidth: '24rem' }}>
            <label htmlFor="pGrade">Academic Grade / Level</label>
            <select
              id="pGrade"
              className="inp"
              value={grade}
              onChange={(e) => setGrade(e.target.value)}
            >
              <option value="1st">1st Grade</option>
              <option value="2nd">2nd Grade</option>
              <option value="11th">11th Grade</option>
              <option value="12th">12th Grade</option>
              <option value="Other">Other / University / Graduate</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontWeight: 500, fontSize: '0.9375rem', marginBottom: '0.5rem' }}>
              Select Enrolled Subjects
            </label>
            <div className="profile-subjects-list">
              {availableSubjects.map((sub) => {
                const isSelected = selectedSubjectIds.includes(sub.id)
                return (
                  <button
                    key={sub.id}
                    type="button"
                    className="profile-subject-chip"
                    aria-pressed={isSelected}
                    onClick={() => toggleSubject(sub.id)}
                  >
                    <span>{isSelected ? '✓' : '+'}</span>
                    <span>{sub.name}</span>
                  </button>
                )
              })}
            </div>
          </div>
        </section>

        {/* Section C: Subscription Plan */}
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
            <div
              className={`profile-plan-card ${subscription === 'FREE' ? 'selected' : ''}`}
              onClick={() => setSubscription('FREE')}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <strong style={{ fontSize: '1.1rem' }}>Free Plan</strong>
                {subscription === 'FREE' && <span className="badge b-live">Active</span>}
              </div>
              <p style={{ margin: 0, color: 'var(--muted)', fontSize: '0.875rem' }}>
                Access to open classrooms, multiplayer Arena games, and community decks.
              </p>
            </div>

            <div
              className={`profile-plan-card ${subscription === 'PREMIUM' ? 'selected' : ''}`}
              onClick={() => setSubscription('PREMIUM')}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <strong style={{ fontSize: '1.1rem' }}>Premium Student</strong>
                {subscription === 'PREMIUM' && <span className="badge b-live">Active</span>}
              </div>
              <p style={{ margin: 0, color: 'var(--muted)', fontSize: '0.875rem' }}>
                Unlimited active recall AI note conversions and priority exam check answers.
              </p>
            </div>

            <div
              className={`profile-plan-card ${subscription === 'MAX' ? 'selected' : ''}`}
              onClick={() => setSubscription('MAX')}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <strong style={{ fontSize: '1.1rem' }}>Max / Educator</strong>
                {subscription === 'MAX' && <span className="badge b-live">Active</span>}
              </div>
              <p style={{ margin: 0, color: 'var(--muted)', fontSize: '0.875rem' }}>
                Host unlimited classroom cohorts, customized question bank rubrics &amp; analytics.
              </p>
            </div>
          </div>
        </section>

        {/* Section D: Security & Password Update */}
        <section className="profile-card-section">
          <div>
            <h2 className="profile-section-title">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              Security Credentials
            </h2>
            <p className="profile-section-desc">Leave blank unless you wish to change your current password.</p>
          </div>

          <div className="profile-grid-2">
            <div className="field">
              <label htmlFor="pNewPw">New Password</label>
              <input
                id="pNewPw"
                type="password"
                className="inp"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new secure password"
                autoComplete="new-password"
              />
            </div>

            <div className="field">
              <label htmlFor="pConfPw">Confirm New Password</label>
              <input
                id="pConfPw"
                type="password"
                className="inp"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-type new password"
                autoComplete="new-password"
              />
            </div>
          </div>
        </section>

        {/* Sticky Actions Bar */}
        <div className="profile-actions-bar">
          <button
            type="button"
            className="btn ghost"
            onClick={onBackToHome}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn primary"
            style={{ paddingInline: '1.5rem' }}
            disabled={isSaving}
          >
            {isSaving ? 'Saving Changes...' : 'Save All Profile Changes'}
          </button>
        </div>
      </form>
    </div>
  )
}
