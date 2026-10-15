import { useState } from 'react'

interface FeatureVote {
  id: number
  title: string
  suggester: string
  status: 'Under Review' | 'In Progress' | 'Shipped'
  statusClass: 'b-review' | 'b-prog' | 'b-live'
  initialVotes: number
}

const INITIAL_VOTES: FeatureVote[] = [
  {
    id: 1,
    title: 'Shared review decks for a whole classroom cohort',
    suggester: '@lysander_v',
    status: 'Shipped',
    statusClass: 'b-live',
    initialVotes: 48,
  },
  {
    id: 2,
    title: 'Integrated dark mode palettes for late-night sessions',
    suggester: '@zephyr_k',
    status: 'In Progress',
    statusClass: 'b-prog',
    initialVotes: 37,
  },
  {
    id: 3,
    title: 'Import flashcards directly from Anki and CSV spreadsheets',
    suggester: '@morandi_s',
    status: 'Under Review',
    statusClass: 'b-review',
    initialVotes: 21,
  },
]

export function CommunitySection() {
  const [votes, setVotes] = useState(INITIAL_VOTES)
  const [upvotedIds, setUpvotedIds] = useState<Set<number>>(new Set())

  const handleToggleUpvote = (id: number) => {
    setUpvotedIds((prev) => {
      const next = new Set(prev)
      const hasVoted = next.has(id)
      if (hasVoted) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })

    setVotes((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const delta = upvotedIds.has(id) ? -1 : 1
          return { ...item, initialVotes: item.initialVotes + delta }
        }
        return item
      })
    )
  }

  return (
    <section className="block two" id="community-votes" style={{ paddingBlock: '3rem 2rem' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 26rem), 1fr))', gap: '2rem', textAlign: 'left' }}>
        {/* Left: Co-Creator Shoutout Card */}
        <div>
          <div className="head" style={{ marginBottom: '1.25rem' }}>
            <div>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--text)' }}>
                Made With You
              </h2>
              <p style={{ margin: '0.25rem 0 0', color: 'var(--muted)', fontSize: '0.9375rem' }}>
                Features that started as student feedback and ideas.
              </p>
            </div>
          </div>

          <div
            className="shout"
            style={{
              border: '1px dashed var(--primary)',
              borderRadius: '1rem',
              padding: '1.5rem',
              backgroundColor: 'var(--primary-soft)',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.85rem',
            }}
          >
            <span
              style={{
                fontFamily: 'var(--f-mono)',
                fontSize: '0.75rem',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: 'var(--primary)',
                fontWeight: 600,
              }}
            >
              Recent Community Contributions
            </span>

            <div>
              <p style={{ margin: 0, fontSize: '1.0625rem', color: 'var(--text)' }}>
                <b>Deep Focus Mode</b> — Suggested &amp; co-created with{' '}
                <span
                  style={{
                    display: 'inline-block',
                    backgroundColor: 'var(--card)',
                    color: 'var(--primary)',
                    fontFamily: 'var(--f-mono)',
                    fontSize: '0.875rem',
                    padding: '0.1rem 0.6rem',
                    borderRadius: '999px',
                    fontWeight: 500,
                    border: '1px solid var(--border)',
                  }}
                >
                  @morandi_s
                </span>
              </p>
              <p style={{ color: 'var(--muted)', fontSize: '0.875rem', margin: '0.25rem 0 0' }}>
                A distraction-free timer that hides the navbar and sidebars, keeping only your current card and task in view.
              </p>
            </div>

            <hr style={{ border: 0, borderTop: '1px dashed var(--border)', margin: '0.4rem 0' }} />

            <div>
              <p style={{ margin: 0, fontSize: '1.0625rem', color: 'var(--text)' }}>
                <b>Shared Review Decks</b> — Suggested &amp; co-created with{' '}
                <span
                  style={{
                    display: 'inline-block',
                    backgroundColor: 'var(--card)',
                    color: 'var(--primary)',
                    fontFamily: 'var(--f-mono)',
                    fontSize: '0.875rem',
                    padding: '0.1rem 0.6rem',
                    borderRadius: '999px',
                    fontWeight: 500,
                    border: '1px solid var(--border)',
                  }}
                >
                  @lysander_v
                </span>
              </p>
              <p style={{ color: 'var(--muted)', fontSize: '0.875rem', margin: '0.25rem 0 0' }}>
                Collaborative active recall flashcards where students collectively flag difficult cards for group review.
              </p>
            </div>
          </div>
        </div>

        {/* Right: Feature Voting Board */}
        <div>
          <div className="head" style={{ marginBottom: '1.25rem' }}>
            <div>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--text)' }}>
                Vote on What Ships Next
              </h2>
              <p style={{ margin: '0.25rem 0 0', color: 'var(--muted)', fontSize: '0.9375rem' }}>
                Upvote the features you want to see built into the Conventus study suite.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {votes.map((item) => {
              const isUpvoted = upvotedIds.has(item.id)
              return (
                <div
                  key={item.id}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'auto 1fr auto',
                    gap: '1rem',
                    alignItems: 'center',
                    backgroundColor: 'var(--card)',
                    border: '1px solid var(--border)',
                    borderRadius: '1rem',
                    padding: '1rem',
                  }}
                >
                  {/* Upvote Button */}
                  <button
                    type="button"
                    onClick={() => handleToggleUpvote(item.id)}
                    aria-pressed={isUpvoted}
                    aria-label={`Upvote ${item.title}`}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      minWidth: '3.25rem',
                      border: isUpvoted ? '1px solid var(--primary)' : '1px solid var(--border)',
                      backgroundColor: isUpvoted ? 'var(--primary-soft)' : 'var(--bg)',
                      color: isUpvoted ? 'var(--primary)' : 'var(--text)',
                      borderRadius: '0.75rem',
                      padding: '0.4rem 0.5rem',
                      fontFamily: 'var(--f-mono)',
                      fontSize: '0.9375rem',
                      cursor: 'pointer',
                      transition: 'border-color 0.15s, background-color 0.15s',
                    }}
                  >
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M6 15l6-6 6 6" />
                    </svg>
                    <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>
                      {item.initialVotes}
                    </span>
                  </button>

                  {/* Feature Title & Suggester */}
                  <div style={{ minWidth: 0 }}>
                    <h3 style={{ fontSize: '1.0625rem', fontWeight: 500, color: 'var(--text)', margin: 0 }}>
                      {item.title}
                    </h3>
                    <small style={{ color: 'var(--muted)', fontSize: '0.8125rem' }}>
                      Suggested by <span style={{ fontFamily: 'var(--f-mono)' }}>{item.suggester}</span>
                    </small>
                  </div>

                  {/* Status Badge */}
                  <span
                    style={{
                      fontSize: '0.8125rem',
                      fontWeight: 600,
                      borderRadius: '999px',
                      padding: '0.2rem 0.7rem',
                      whiteSpace: 'nowrap',
                      backgroundColor:
                        item.status === 'Shipped'
                          ? '#D1FAE5'
                          : item.status === 'In Progress'
                          ? '#E0E7FF'
                          : '#FEF3C7',
                      color:
                        item.status === 'Shipped'
                          ? '#065F46'
                          : item.status === 'In Progress'
                          ? '#3730A3'
                          : '#78350F',
                    }}
                  >
                    {item.status}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}
