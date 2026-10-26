export function Footer() {
  return (
    <footer
      style={{
        borderTop: '1px solid var(--border)',
        marginTop: '3.5rem',
        paddingBlock: '2.5rem 2rem',
        color: 'var(--muted)',
        fontSize: '0.875rem',
        backgroundColor: 'var(--bg)',
      }}
    >
      <div className="wrap">
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(14rem, 1fr))',
            gap: '2rem',
            marginBottom: '2.5rem',
            textAlign: 'left',
          }}
        >
          {/* Column 1: Brand & Meaning */}
          <div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.6rem',
                fontFamily: 'var(--f-display)',
                fontWeight: 700,
                fontSize: '1.25rem',
                color: 'var(--text)',
                marginBottom: '0.75rem',
              }}
            >
              <span
                style={{
                  display: 'grid',
                  placeItems: 'center',
                  width: '1.8rem',
                  height: '1.8rem',
                  borderRadius: '0.6rem',
                  backgroundColor: 'var(--primary)',
                  color: 'var(--primary-ink)',
                }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 8l9-4 9 4-9 4-9-4z" />
                  <path d="M7 10.5V15c0 1.5 2.2 3 5 3s5-1.500 5-3v-4.500" />
                </svg>
              </span>
              Conventus
            </div>
            <p style={{ margin: 0, lineHeight: 1.5, color: 'var(--muted)', fontSize: '0.875rem' }}>
              <strong>Conventus</strong> (Latin: <em>assembly</em> or <em>meeting</em>).
              Built as the meeting point of all study tools — collaborative classrooms, review games, active recall notes, and deep focus timers.
            </p>
          </div>

          {/* Column 2: Study Tools */}
          <div>
            <h4 style={{ fontFamily: 'var(--f-display)', fontSize: '0.9375rem', fontWeight: 600, color: 'var(--text)', marginBottom: '0.75rem' }}>
              Study Suites
            </h4>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
              <li><a href="/" style={{ color: 'var(--muted)', textDecoration: 'none' }}>Classrooms &amp; Cohorts</a></li>
              <li><a href="/arena" style={{ color: 'var(--muted)', textDecoration: 'none' }}>Live Quiz Games</a></li>
              <li><a href="/" style={{ color: 'var(--muted)', textDecoration: 'none' }}>Active Recall Notes</a></li>
              <li><a href="/" style={{ color: 'var(--muted)', textDecoration: 'none' }}>Assessment Creator &amp; Checker</a></li>
            </ul>
          </div>

          {/* Column 3: Productivity */}
          <div>
            <h4 style={{ fontFamily: 'var(--f-display)', fontSize: '0.9375rem', fontWeight: 600, color: 'var(--text)', marginBottom: '0.75rem' }}>
              Productivity &amp; Prep
            </h4>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
              <li><a href="/" style={{ color: 'var(--muted)', textDecoration: 'none' }}>Subject Practice Tests</a></li>
              <li><a href="/" style={{ color: 'var(--muted)', textDecoration: 'none' }}>Exam Study Planner</a></li>
              <li><a href="/focus" style={{ color: 'var(--muted)', textDecoration: 'none' }}>Deep Focus &amp; Pomodoro</a></li>
              <li><a href="/focus" style={{ color: 'var(--muted)', textDecoration: 'none' }}>Study Music</a></li>
            </ul>
          </div>

          {/* Column 4: Community */}
          <div>
            <h4 style={{ fontFamily: 'var(--f-display)', fontSize: '0.9375rem', fontWeight: 600, color: 'var(--text)', marginBottom: '0.75rem' }}>
              Co-Creation
            </h4>
            <p style={{ margin: '0 0 0.5rem', lineHeight: 1.45 }}>
              Have an idea for a feature or study deck? Suggest and vote on what ships next.
            </p>
            <a
              href="/"
              style={{
                fontFamily: 'var(--f-mono)',
                fontSize: '0.8125rem',
                color: 'var(--primary)',
                fontWeight: 500,
                textDecoration: 'underline',
              }}
            >
              Browse community votes →
            </a>
          </div>
        </div>

        {/* Bottom Bar */}
        <div
          style={{
            borderTop: '1px solid var(--border)',
            paddingTop: '1.25rem',
            display: 'flex',
            flexWrap: 'wrap',
            gap: '1rem',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span>
            © {new Date().getFullYear()} Conventus. Built with students, for students.
          </span>
          <div style={{ display: 'flex', gap: '1.25rem' }}>
            <a
              href="/"
              onClick={(e) => {
                e.preventDefault()
                window.scrollTo({ top: 0, behavior: 'smooth' })
              }}
              style={{ color: 'var(--muted)', textDecoration: 'none' }}
            >
              Back to top ↑
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}
