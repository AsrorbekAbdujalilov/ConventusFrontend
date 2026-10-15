import { Flashcard } from './Flashcard'

export interface HeroSectionProps {
  onStartClick: () => void
}

export function HeroSection({ onStartClick }: HeroSectionProps) {
  return (
    <section
      className="hero"
      id="top"
      style={{
        paddingBlock: '3.5rem 3rem',
        display: 'grid',
        gap: '2.5rem',
        alignItems: 'center',
        textAlign: 'left',
      }}
    >
      <div>
        {/* Etymology & Meaning Banner */}
        <div style={{ marginBottom: '1.25rem', display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center' }}>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              backgroundColor: 'var(--accent)',
              color: 'var(--accent-ink)',
              borderRadius: '999px',
              padding: '0.3rem 0.85rem',
              fontSize: '0.8125rem',
              fontWeight: 600,
              fontFamily: 'var(--f-mono)',
            }}
          >
            🏛️ Latin: conventus — assembly, meeting
          </span>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              backgroundColor: 'var(--primary-soft)',
              color: 'var(--primary)',
              borderRadius: '999px',
              padding: '0.3rem 0.85rem',
              fontSize: '0.8125rem',
              fontWeight: 500,
            }}
          >
            The Meeting Point of All Study Tools
          </span>
        </div>

        {/* Main Headline */}
        <h1
          style={{
            fontSize: 'clamp(2.25rem, 5.5vw, 3.5rem)',
            fontWeight: 700,
            lineHeight: 1.1,
            color: 'var(--text)',
            marginBottom: '1.25rem',
            fontFamily: 'var(--f-display)',
          }}
        >
          Study together. <em style={{ fontStyle: 'normal', color: 'var(--primary)' }}>Remember</em> longer.
        </h1>

        {/* Core Purpose Paragraph with Conventus meaning */}
        <p
          style={{
            color: 'var(--muted)',
            fontSize: '1.125rem',
            lineHeight: 1.6,
            maxWidth: '36rem',
            marginBottom: '1.75rem',
          }}
        >
          <strong>Conventus</strong> convenes your entire study toolkit into a single, distraction-free space.
          Run collaborative classrooms, compete in live quiz games, take active-recall notes,
          create &amp; auto-check assessments, and enter deep focus without switching between disjointed apps.
        </p>

        {/* CTA Buttons */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center' }}>
          <a
            className="btn primary"
            href="#features"
            onClick={onStartClick}
            style={{ padding: '0.75rem 1.4rem', fontSize: '1rem' }}
          >
            Explore Study Tools ↓
          </a>
          <a
            className="btn line"
            href="#feature-classroom"
            style={{ padding: '0.75rem 1.4rem', fontSize: '1rem' }}
          >
            Join a Classroom
          </a>
          <a
            className="btn orange"
            href="#games-lobby"
            style={{ padding: '0.75rem 1.4rem', fontSize: '1rem' }}
          >
            Join a Game Lobby
          </a>
        </div>
      </div>

      {/* Interactive Flashcard Preview */}
      <div>
        <Flashcard />
      </div>

      <style>{`
        @media (min-width: 60rem) {
          .hero {
            grid-template-columns: 1.1fr 0.9fr !important;
            padding-block: 4.5rem 3.5rem !important;
          }
        }
      `}</style>
    </section>
  )
}
