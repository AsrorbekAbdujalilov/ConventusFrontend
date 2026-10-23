import type { UserProfile } from '../api/types'

export interface ProfileModalProps {
  isOpen: boolean
  user: UserProfile | null
  onClose: () => void
  onLogout: () => void
}

export function ProfileModal({
  isOpen,
  user,
  onClose,
  onLogout,
}: ProfileModalProps) {
  if (!isOpen || !user) return null

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
          maxWidth: '30rem',
          backgroundColor: 'var(--card)',
          borderRadius: '1.5rem',
          border: '1px solid var(--border)',
          boxShadow: 'var(--shadow)',
          padding: '2rem',
          position: 'relative',
          textAlign: 'left',
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

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
          <div
            style={{
              width: '3.5rem',
              height: '3.5rem',
              borderRadius: '50%',
              backgroundColor: 'var(--secondary)',
              color: 'var(--on-secondary)',
              display: 'grid',
              placeItems: 'center',
              fontFamily: 'var(--f-display)',
              fontWeight: 700,
              fontSize: '1.5rem',
            }}
          >
            {user.username.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <h2 style={{ fontFamily: 'var(--f-display)', fontSize: '1.35rem', fontWeight: 600, color: 'var(--text)' }}>
              {user.username}
            </h2>
            <p style={{ margin: 0, color: 'var(--muted)', fontSize: '0.875rem' }}>
              {user.email || 'No email attached'}
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.9375rem', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
            <span style={{ color: 'var(--muted)' }}>Grade / Level:</span>
            <strong style={{ color: 'var(--text)' }}>{user.grade || 'Not set'}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
            <span style={{ color: 'var(--muted)' }}>Subscription:</span>
            <span style={{ backgroundColor: 'var(--primary-soft)', color: 'var(--primary)', padding: '0.1rem 0.5rem', borderRadius: '999px', fontSize: '0.8125rem', fontWeight: 600 }}>
              {user.subscription || 'FREE'}
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
            <span style={{ color: 'var(--muted)' }}>School / Organization:</span>
            <strong style={{ color: 'var(--text)' }}>{user.place_of_work_or_education || 'Independent Learner'}</strong>
          </div>
          {user.bio && (
            <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
              <span style={{ display: 'block', color: 'var(--muted)', marginBottom: '0.2rem' }}>Bio:</span>
              <p style={{ margin: 0, color: 'var(--text)', fontStyle: 'italic' }}>"{user.bio}"</p>
            </div>
          )}
          <div>
            <span style={{ display: 'block', color: 'var(--muted)', marginBottom: '0.35rem' }}>Registered Subjects:</span>
            {user.subjects && user.subjects.length > 0 ? (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                {user.subjects.map((sub) => (
                  <span
                    key={sub.id}
                    style={{
                      fontSize: '0.8125rem',
                      backgroundColor: 'var(--surface)',
                      border: '1px solid var(--border)',
                      padding: '0.2rem 0.6rem',
                      borderRadius: '0.5rem',
                      color: 'var(--text)',
                    }}
                  >
                    {sub.name}
                  </span>
                ))}
              </div>
            ) : (
              <span style={{ color: 'var(--muted)', fontSize: '0.875rem' }}>No subjects selected yet.</span>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
          <button
            type="button"
            onClick={onClose}
            className="btn line"
          >
            Close
          </button>
          <button
            type="button"
            onClick={() => {
              onClose()
              onLogout()
            }}
            className="btn ghost"
            style={{ color: '#ef4444' }}
          >
            Sign out
          </button>
        </div>
      </div>
    </div>
  )
}
