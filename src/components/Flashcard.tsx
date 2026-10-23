import { useState } from 'react'

export function Flashcard() {
  const [isFlipped, setIsFlipped] = useState(false)
  const [rateNote, setRateNote] = useState<string>('')

  const handleRate = (message: string) => {
    setRateNote(message)
    setIsFlipped(false)
  }

  return (
    <div style={{ maxWidth: '28rem', width: '100%', marginInline: 'auto' }}>
      <div className="fc-scene">
        <button
          type="button"
          className={`fc ${isFlipped ? 'flip' : ''}`}
          onClick={() => setIsFlipped((prev) => !prev)}
          aria-label="Study flashcard. Click to flip."
        >
          {/* Front Face */}
          <span className="face">
            <span style={{ fontFamily: 'var(--f-mono)', fontSize: '0.75rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--muted)', fontWeight: 500 }}>
              Biology · Card 12 of 40
            </span>
            <span style={{ fontFamily: 'var(--f-display)', fontWeight: 600, fontSize: '1.5rem', lineHeight: 1.25, color: 'var(--text)' }}>
              Which organelle produces most of a cell's ATP?
            </span>
            <span style={{ fontSize: '0.875rem', color: 'var(--muted)' }}>
              Tap to flip card ↷
            </span>
          </span>

          {/* Back Face */}
          <span className="face back">
            <span style={{ fontFamily: 'var(--f-mono)', fontSize: '0.75rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--primary-ink)', opacity: 0.85, fontWeight: 500 }}>
              Answer
            </span>
            <span style={{ fontFamily: 'var(--f-display)', fontWeight: 600, fontSize: '1.4rem', lineHeight: 1.25, color: 'var(--primary-ink)' }}>
              The mitochondrion, through oxidative phosphorylation.
            </span>
            <span style={{ fontSize: '0.875rem', color: 'var(--primary-ink)', opacity: 0.9 }}>
              Rate your recall below ↓
            </span>
          </span>
        </button>
      </div>

      {/* Spaced repetition rating buttons */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '0.5rem',
          marginTop: '1rem',
        }}
      >
        <button
          type="button"
          onClick={() => handleRate('Again: Card will reappear in 1 minute for review.')}
          style={{
            border: '1px solid var(--border)',
            background: 'var(--card)',
            borderRadius: '0.75rem',
            padding: '0.7rem 0.25rem',
            fontWeight: 600,
            fontSize: '0.9375rem',
            display: 'flex',
            gap: '0.4rem',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--text)',
            cursor: 'pointer',
          }}
        >
          <span style={{ width: '0.65rem', height: '0.65rem', borderRadius: '50%', backgroundColor: '#EF4444' }} />
          Again
        </button>

        <button
          type="button"
          onClick={() => handleRate('Good: Spaced interval increased. Next review tomorrow.')}
          style={{
            border: '1px solid var(--border)',
            background: 'var(--card)',
            borderRadius: '0.75rem',
            padding: '0.7rem 0.25rem',
            fontWeight: 600,
            fontSize: '0.9375rem',
            display: 'flex',
            gap: '0.4rem',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--text)',
            cursor: 'pointer',
          }}
        >
          <span style={{ width: '0.65rem', height: '0.65rem', borderRadius: '50%', backgroundColor: '#EAB308' }} />
          Good
        </button>

        <button
          type="button"
          onClick={() => handleRate('Easy: Mastered concept! Next review scheduled in 6 days.')}
          style={{
            border: '1px solid var(--border)',
            background: 'var(--card)',
            borderRadius: '0.75rem',
            padding: '0.7rem 0.25rem',
            fontWeight: 600,
            fontSize: '0.9375rem',
            display: 'flex',
            gap: '0.4rem',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--text)',
            cursor: 'pointer',
          }}
        >
          <span style={{ width: '0.65rem', height: '0.65rem', borderRadius: '50%', backgroundColor: '#22C55E' }} />
          Easy
        </button>
      </div>

      <p
        style={{
          margin: '0.6rem 0 0',
          fontSize: '0.875rem',
          color: 'var(--muted)',
          minHeight: '1.4em',
          textAlign: 'center',
        }}
        aria-live="polite"
      >
        {rateNote}
      </p>
    </div>
  )
}
