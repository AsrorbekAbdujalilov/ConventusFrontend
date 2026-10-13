export interface FeatureCardData {
  id: string
  title: string
  mark: string
  markClass: string
  summary: string
  description: string
  subFeatures: { label: string; detail: string }[]
  tags: string[]
}

const FEATURES: FeatureCardData[] = [
  {
    id: 'feature-classroom',
    title: 'Classroom',
    mark: 'C',
    markClass: 'mark-primary',
    summary: 'Synchronous and cohort-based learning rooms.',
    description: 'Create an online room for your study group or lecture section. Students join with a short teacher code, access shared resources, and collaborate in real-time.',
    subFeatures: [
      { label: 'Open Classroom', detail: 'Launch an instant collaborative study session with real-time participation.' },
      { label: 'Join with Code', detail: 'Quick 6-character access codes for frictionless student onboarding.' },
      { label: 'Discover Public Groups', detail: 'Explore open academic study circles grouped by curriculum and subject.' },
    ],
    tags: ['Live Room', 'Teacher Codes', 'Curriculum Hub'],
  },
  {
    id: 'feature-games',
    title: 'Games',
    mark: 'G',
    markClass: 'mark-secondary',
    summary: 'Turn any flashcard deck into a competitive live quiz.',
    description: 'Gamify memorization and review. Host game lobbies with live scoreboards, multiplayer buzzer rounds, and timed challenges designed to reinforce retention.',
    subFeatures: [
      { label: 'Create Game', detail: 'Convert any study deck into a multiplayer trivia match in one click.' },
      { label: 'Join Lobby', detail: 'Jump straight into an active classroom match using a PIN.' },
      { label: 'Community Library', detail: 'Browse thousands of curated quiz games built by students.' },
    ],
    tags: ['Live Quiz', 'PIN Lobbies', 'Scoreboards'],
  },
  {
    id: 'feature-notes',
    title: 'Notes',
    mark: 'N',
    markClass: 'mark-accent',
    summary: 'Markdown notes that automatically generate active recall decks.',
    description: 'Write distraction-free notes in Markdown. Conventus intelligently detects key definitions and formulas, converting them into spaced repetition review decks automatically.',
    subFeatures: [
      { label: 'My Notes', detail: 'Clean Markdown editing with LaTeX math and code syntax highlighting.' },
      { label: 'Automated Review', detail: 'Generates active recall prompts and flashcard questions directly from your notes.' },
      { label: 'Discover Notes', detail: 'Read and clone peer-reviewed study notes shared by community contributors.' },
    ],
    tags: ['Markdown', 'Auto-Decks', 'LaTeX Math'],
  },
  {
    id: 'feature-assessments',
    title: 'Assessment Creator & Checker',
    mark: 'A',
    markClass: 'mark-ok',
    summary: 'End-to-end quiz and exam generation with automated grading.',
    description: 'Build rigorous tests using question banks and customizable rubrics. Students can submit answers or upload work to receive instant step-by-step feedback and track mastery over time.',
    subFeatures: [
      { label: 'Assessment Creator', detail: 'Draft quizzes, mock finals, and timed exams with modular question types.' },
      { label: 'Assessment Checker', detail: 'Instant assessment evaluation with detailed explanations of misconceptions.' },
      { label: 'Progress History', detail: 'Comprehensive analytics tracking scores, weak spots, and improvement curves.' },
    ],
    tags: ['Question Banks', 'Instant Grading', 'Analytics'],
  },
  {
    id: 'feature-prepare',
    title: 'Prepare',
    mark: 'P',
    markClass: 'mark-primary',
    summary: 'Smarter test preparation: practice exams, study plans, and instant Q&A.',
    description: 'Eliminate exam anxiety with targeted preparation tools. Work through mock test series, follow a backward-scheduled calendar leading up to exam day, and get answers to tough questions.',
    subFeatures: [
      { label: 'Direct Study Chat', detail: 'Ask questions on specific problems and receive clear conceptual breakdowns.' },
      { label: 'Subject Practice Tests', detail: 'Adaptive practice tests calibrated by difficulty and grade level.' },
      { label: 'Exam Study Plan', detail: 'A calendar schedule that works backward from your test date.' },
    ],
    tags: ['Practice Tests', 'Study Planner', 'Conceptual Q&A'],
  },
  {
    id: 'feature-focus',
    title: 'Focus',
    mark: 'F',
    markClass: 'mark-secondary',
    summary: 'Protect attention with distraction-free timers and ambient soundscapes.',
    description: 'When it is time to study, Conventus gets out of your way. Deep Focus hides the navbar and sidebars, leaving only your active deck, timer, and optional ambient sounds.',
    subFeatures: [
      { label: 'Focus Pomodoro', detail: 'Customizable 25/5 interval timer integrated with your daily task list.' },
      { label: 'Deep Focus Mode', detail: 'Full-screen mode that eliminates all page clutter for intense study sprints.' },
      { label: 'Ambient Sounds', detail: 'High-fidelity audio generators: light rainfall, cozy library cafe, and brown noise.' },
    ],
    tags: ['Pomodoro', 'Deep Focus', 'Rain & Cafe Audio'],
  },
]

export function FeaturesOverview() {
  return (
    <section className="block" id="features" style={{ paddingBlock: '3.5rem 2rem' }}>
      <div className="head" style={{ marginBottom: '2rem' }}>
        <div>
          <span
            style={{
              fontFamily: 'var(--f-mono)',
              fontSize: '0.8125rem',
              color: 'var(--primary)',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              fontWeight: 600,
              display: 'block',
              marginBottom: '0.4rem',
            }}
          >
            Unified Academic Suite
          </span>
          <h2 style={{ fontSize: '2rem', fontWeight: 600, color: 'var(--text)' }}>
            Every Tool You Need to Study
          </h2>
          <p style={{ margin: '0.35rem 0 0', color: 'var(--muted)', fontSize: '1.0625rem' }}>
            All features accessible directly from the navbar — built to convene your entire study workflow.
          </p>
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gap: '1.5rem',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 23rem), 1fr))',
        }}
      >
        {FEATURES.map((feat) => (
          <div
            key={feat.id}
            id={feat.id}
            style={{
              backgroundColor: 'var(--card)',
              border: '1px solid var(--border)',
              borderRadius: '1.25rem',
              padding: '1.5rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
              transition: 'border-color 0.15s',
              textAlign: 'left',
            }}
          >
            {/* Header: Mark badge + Title */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
              <span
                style={{
                  width: '2.5rem',
                  height: '2.5rem',
                  borderRadius: '0.75rem',
                  display: 'grid',
                  placeItems: 'center',
                  fontFamily: 'var(--f-display)',
                  fontWeight: 700,
                  fontSize: '1.125rem',
                  backgroundColor:
                    feat.markClass === 'mark-primary'
                      ? 'var(--primary)'
                      : feat.markClass === 'mark-secondary'
                      ? 'var(--secondary)'
                      : feat.markClass === 'mark-accent'
                      ? 'var(--accent)'
                      : 'var(--ok)',
                  color:
                    feat.markClass === 'mark-primary'
                      ? 'var(--primary-ink)'
                      : feat.markClass === 'mark-secondary'
                      ? 'var(--on-secondary)'
                      : feat.markClass === 'mark-accent'
                      ? 'var(--accent-ink)'
                      : '#FFFFFF',
                }}
              >
                {feat.mark}
              </span>
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text)' }}>
                  {feat.title}
                </h3>
                <span style={{ fontSize: '0.8125rem', color: 'var(--muted)' }}>
                  {feat.summary}
                </span>
              </div>
            </div>

            {/* Description */}
            <p style={{ margin: 0, color: 'var(--muted)', fontSize: '0.9375rem', lineHeight: 1.5 }}>
              {feat.description}
            </p>

            {/* Sub-features list */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '0.6rem',
                backgroundColor: 'var(--surface)',
                borderRadius: '0.75rem',
                padding: '0.75rem',
                fontSize: '0.875rem',
              }}
            >
              {feat.subFeatures.map((sub) => (
                <div key={sub.label}>
                  <strong style={{ color: 'var(--text)', fontWeight: 600 }}>• {sub.label}: </strong>
                  <span style={{ color: 'var(--muted)' }}>{sub.detail}</span>
                </div>
              ))}
            </div>

            {/* Tags / Chips */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginTop: 'auto', paddingTop: '0.5rem' }}>
              {feat.tags.map((tag) => (
                <span
                  key={tag}
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: 500,
                    backgroundColor: 'var(--primary-soft)',
                    color: 'var(--primary)',
                    borderRadius: '999px',
                    padding: '0.2rem 0.65rem',
                    fontFamily: 'var(--f-mono)',
                  }}
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
