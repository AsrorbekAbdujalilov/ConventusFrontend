import { useState } from 'react'
import type { Player, LeaderboardEntry } from '../../api/types'
import type { GameModeId } from '../../pages/GameTypeSelectPage'

interface HostGameTrackerProps {
  gameMode: GameModeId
  settings: Record<string, any>
  players: Player[]
  leaderboard: LeaderboardEntry[]
  onStopGame: () => void
  currentQIndex: number
  totalQuestions: number
}

export function HostGameTracker({
  gameMode,
  players,
  leaderboard,
  onStopGame,
  currentQIndex,
  totalQuestions,
}: HostGameTrackerProps) {
  // Classic Quiz dashboard view tab
  const [classicView, setClassicView] = useState<'table' | 'hbars' | 'vbars' | 'circles'>('table')
  const [classicMetric, setClassicMetric] = useState<'points' | 'accuracy' | 'avgTime'>('points')

  // Sorted players by points
  const rankings = leaderboard.length > 0
    ? leaderboard
    : players.map((p) => ({ display_name: p.display_name, points: (p as any).points || 0 })).sort((a, b) => b.points - a.points)

  const maxPoints = Math.max(...rankings.map((r) => r.points), 100)

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Top Host Control Ribbon */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '1rem 1.5rem',
          background: 'var(--surface)',
          borderRadius: 'var(--radius-xl)',
          border: '1px solid var(--border)',
          flexWrap: 'wrap',
          gap: '1rem',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                padding: '0.2rem 0.6rem',
                borderRadius: '999px',
                background: 'var(--primary-soft, rgba(99, 102, 241, 0.12))',
                color: 'var(--primary)',
                fontWeight: 700,
                fontSize: '0.75rem',
                textTransform: 'uppercase',
              }}
            >
              👑 Host Live Deck
            </span>
            <span style={{ fontSize: '0.85rem', color: 'var(--muted)', fontFamily: 'var(--f-mono)' }}>
              Question {currentQIndex + 1} of {totalQuestions || 10}
            </span>
          </div>
          <h2 style={{ margin: '0.25rem 0 0', fontSize: '1.35rem', fontWeight: 800 }}>
            {gameMode === 'classic' && 'Teacher Analytics Dashboard'}
            {gameMode === 'pharaoh' && 'Expedition Labyrinth Radar'}
            {gameMode === 'tictactoe' && 'Ultimate Arena Scoreboard'}
            {gameMode === 'academic_deception' && 'Dossier Surveillance Station'}
            {gameMode === 'duel_league' && 'Swiss Tournament Control Deck'}
            {gameMode === 'land_rush' && 'Hex Territory Command Center'}
          </h2>
        </div>

        <button
          type="button"
          className="btn line danger"
          style={{ fontWeight: 700, padding: '0.65rem 1.25rem' }}
          onClick={onStopGame}
        >
          End Match & Show Podium ➔
        </button>
      </div>

      {/* ── 1. CLASSIC QUIZ TRACKER (TEACHER DASHBOARD) ── */}
      {gameMode === 'classic' && (
        <div className="card stack" style={{ background: 'var(--card)', border: '1px solid var(--line, var(--border))', borderRadius: '16px', padding: '1.5rem' }}>
          {/* Dashboard metric and view toolbars */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '1rem' }}>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {(['table', 'hbars', 'vbars', 'circles'] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  className={`btn small ${classicView === v ? 'primary' : 'ghost'}`}
                  style={{ fontWeight: 600, textTransform: 'capitalize' }}
                  onClick={() => setClassicView(v)}
                >
                  {v === 'hbars' ? 'Horizontal Bars' : v === 'vbars' ? 'Vertical Bars' : v}
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.8125rem', color: 'var(--muted)', fontWeight: 600 }}>Metric:</span>
              <select
                className="inp"
                style={{ width: 'auto', padding: '0.35rem 0.65rem', fontSize: '0.85rem' }}
                value={classicMetric}
                onChange={(e) => setClassicMetric(e.target.value as any)}
              >
                <option value="points">Total Points</option>
                <option value="accuracy">Accuracy %</option>
                <option value="avgTime">Answer Speed</option>
              </select>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div style={{ display: 'flex', gap: '2rem', padding: '0.75rem 0', flexWrap: 'wrap', fontSize: '0.9rem', color: 'var(--muted)' }}>
            <span>Active Students: <strong style={{ color: 'var(--text)' }}>{rankings.length}</strong></span>
            <span>Class Top Score: <strong style={{ color: 'var(--primary)' }}>{rankings[0]?.points || 0} pts</strong></span>
            <span>Current Leader: <strong style={{ color: 'var(--text)' }}>{rankings[0]?.display_name || '—'}</strong></span>
          </div>

          {/* Table View */}
          {classicView === 'table' && (
            <div style={{ overflowX: 'auto' }}>
              <table className="arena-score-table" style={{ width: '100%' }}>
                <thead>
                  <tr style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>
                    <th style={{ textAlign: 'left', padding: '0.6rem' }}>Rank</th>
                    <th style={{ textAlign: 'left', padding: '0.6rem' }}>Student Player</th>
                    <th style={{ textAlign: 'right', padding: '0.6rem' }}>Points</th>
                    <th style={{ textAlign: 'right', padding: '0.6rem' }}>Performance Bar</th>
                  </tr>
                </thead>
                <tbody>
                  {rankings.map((r, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '0.65rem 0.6rem', fontWeight: 700 }}>#{idx + 1}</td>
                      <td style={{ padding: '0.65rem 0.6rem', fontWeight: 600 }}>{r.display_name}</td>
                      <td style={{ textAlign: 'right', padding: '0.65rem 0.6rem', fontWeight: 700, color: 'var(--primary)', fontFamily: 'var(--f-mono)' }}>
                        {r.points} pts
                      </td>
                      <td style={{ width: '35%', padding: '0.65rem 0.6rem' }}>
                        <div style={{ height: '10px', background: 'var(--surface2, rgba(0,0,0,0.06))', borderRadius: '5px', overflow: 'hidden' }}>
                          <div
                            style={{
                              height: '100%',
                              width: `${Math.min(100, Math.max(8, (r.points / maxPoints) * 100))}%`,
                              background: 'var(--primary)',
                              borderRadius: '5px',
                            }}
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Horizontal Bars View */}
          {classicView === 'hbars' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', padding: '0.5rem 0' }}>
              {rankings.map((r, idx) => (
                <div key={idx} style={{ display: 'grid', gridTemplateColumns: '8rem 1fr 5rem', gap: '1rem', alignItems: 'center' }}>
                  <span style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {r.display_name}
                  </span>
                  <div style={{ height: '20px', background: 'var(--surface2, rgba(0,0,0,0.06))', borderRadius: '6px', overflow: 'hidden' }}>
                    <div
                      style={{
                        height: '100%',
                        width: `${Math.min(100, Math.max(6, (r.points / maxPoints) * 100))}%`,
                        background: 'linear-gradient(90deg, #4338ca, #6366f1)',
                        borderRadius: '6px',
                      }}
                    />
                  </div>
                  <span style={{ textAlign: 'right', fontWeight: 700, fontFamily: 'var(--f-mono)' }}>
                    {r.points} pts
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Vertical Bars View */}
          {classicView === 'vbars' && (
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '1.25rem', height: '260px', padding: '1rem 0', borderBottom: '1px solid var(--border)', overflowX: 'auto' }}>
              {rankings.map((r, idx) => {
                const pct = Math.min(100, Math.max(8, (r.points / maxPoints) * 100))
                return (
                  <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.4rem', height: '100%', justifyContent: 'flex-end', minWidth: '3.5rem' }}>
                    <span style={{ fontSize: '0.75rem', fontFamily: 'var(--f-mono)', fontWeight: 700 }}>
                      {r.points}
                    </span>
                    <div
                      style={{
                        width: '28px',
                        height: `${pct}%`,
                        background: 'linear-gradient(180deg, #6366f1, #4338ca)',
                        borderRadius: '6px 6px 0 0',
                      }}
                    />
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, maxWidth: '4rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {r.display_name}
                    </span>
                  </div>
                )
              })}
            </div>
          )}

          {/* Circles View */}
          {classicView === 'circles' && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem', justifyContent: 'center', padding: '2rem 1rem' }}>
              {rankings.map((r, idx) => {
                const sz = Math.max(60, Math.min(140, 60 + (r.points / maxPoints) * 80))
                return (
                  <div
                    key={idx}
                    style={{
                      width: `${sz}px`,
                      height: `${sz}px`,
                      borderRadius: '50%',
                      background: 'radial-gradient(circle, #6366f1 0%, #4338ca 100%)',
                      color: '#fff',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 4px 14px rgba(67, 56, 202, 0.35)',
                      textAlign: 'center',
                      padding: '0.4rem',
                    }}
                  >
                    <span style={{ fontSize: sz < 80 ? '0.7rem' : '0.85rem', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '90%', whiteSpace: 'nowrap' }}>
                      {r.display_name}
                    </span>
                    <span style={{ fontSize: sz < 80 ? '0.65rem' : '0.75rem', fontFamily: 'var(--f-mono)', fontWeight: 600, opacity: 0.9 }}>
                      {r.points} pts
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ── 2. PHARAOH'S LABYRINTH TRACKER (EXPEDITION RADAR) ── */}
      {gameMode === 'pharaoh' && (
        <div
          style={{
            background: '#efe9df',
            color: '#2a1f14',
            padding: '1.5rem',
            borderRadius: '16px',
            border: '1px solid #d8c9b2',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.25rem',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700, color: '#2a1f14' }}>
              Expedition Roster & Maze Progress
            </h3>
            <span style={{ fontSize: '0.85rem', color: '#7a6a58', fontWeight: 600 }}>
              Golden Exit (★) on Far East Wall
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(16rem, 1fr))', gap: '1rem' }}>
            {rankings.map((p, idx) => {
              const movesEarned = Math.round(p.points / 30) * 3
              return (
                <div
                  key={idx}
                  style={{
                    background: '#fff8ec',
                    border: '1px solid #d8c9b2',
                    borderRadius: '12px',
                    padding: '1rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.5rem',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 700, fontSize: '1.05rem', color: '#2a1f14' }}>
                      {p.display_name}
                    </span>
                    <span style={{ fontSize: '0.8rem', background: '#c2691a', color: '#fff', padding: '0.2rem 0.5rem', borderRadius: '4px', fontWeight: 600 }}>
                      Rank #{idx + 1}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#7a6a58' }}>
                    <span>Moves Balance: <b style={{ color: '#2a1f14' }}>{movesEarned} moves</b></span>
                    <span>Score: <b style={{ color: '#c2691a' }}>{p.points} pts</b></span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem' }}>
                    <span style={{ fontSize: '0.8rem', color: '#7a6a58' }}>Status:</span>
                    <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#c2691a' }}>
                      🏃 Exploring Corridor...
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── 3. TIC-TAC-TOE TRACKER (MATCH ARENA SCOREBOARD) ── */}
      {gameMode === 'tictactoe' && (
        <div className="card stack" style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '16px', padding: '1.5rem' }}>
          <h3 style={{ margin: '0 0 0.5rem', fontSize: '1.25rem', fontWeight: 700 }}>
            Live Match Standings & Streak Scoreboard
          </h3>
          <table className="arena-score-table" style={{ width: '100%' }}>
            <thead>
              <tr style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>
                <th style={{ textAlign: 'left', padding: '0.5rem' }}>Finishing Rank</th>
                <th style={{ textAlign: 'left', padding: '0.5rem' }}>Player Mark</th>
                <th style={{ textAlign: 'right', padding: '0.5rem' }}>Points Scored</th>
                <th style={{ textAlign: 'right', padding: '0.5rem' }}>Match Status</th>
              </tr>
            </thead>
            <tbody>
              {rankings.map((r, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '0.75rem 0.5rem', fontWeight: 700 }}>#{idx + 1}</td>
                  <td style={{ padding: '0.75rem 0.5rem', fontWeight: 600 }}>
                    <span style={{ marginRight: '0.5rem' }}>
                      {['❌', '⭕', '🔺', '🟩'][idx % 4]}
                    </span>
                    {r.display_name}
                  </td>
                  <td style={{ textAlign: 'right', padding: '0.75rem 0.5rem', fontWeight: 700, color: 'var(--primary)', fontFamily: 'var(--f-mono)' }}>
                    {r.points} pts
                  </td>
                  <td style={{ textAlign: 'right', padding: '0.75rem 0.5rem', color: 'var(--muted)', fontSize: '0.85rem', fontWeight: 500 }}>
                    {idx === 0 ? '👑 Streak Leader' : 'In Contention'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── 4. ACADEMIC DECEPTION TRACKER (DOSSIER SURVEILLANCE) ── */}
      {gameMode === 'academic_deception' && (
        <div
          style={{
            background: '#0e1420',
            color: '#e8e4d6',
            padding: '1.5rem',
            borderRadius: '16px',
            border: '1px solid #2b3b55',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.25rem',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div>
              <span style={{ fontSize: '0.75rem', letterSpacing: '0.12em', color: '#f0cf5a', textTransform: 'uppercase', fontFamily: 'monospace' }}>
                Intelligence Dossier
              </span>
              <h3 style={{ margin: '0.2rem 0 0', fontSize: '1.25rem', color: '#f0cf5a' }}>
                Town vs Saboteurs Surveillance Deck
              </h3>
            </div>
            <span style={{ border: '2px solid #f0cf5a', padding: '0.2rem 0.8rem', borderRadius: '4px', color: '#f0cf5a', fontFamily: 'monospace', fontWeight: 700, transform: 'rotate(-2deg)' }}>
              PHASE: QUEST & COVERT OPS
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '0.75rem' }}>
            {rankings.map((r, idx) => (
              <div
                key={idx}
                style={{
                  background: '#16202f',
                  border: '1px solid #2b3b55',
                  borderRadius: '8px',
                  padding: '0.75rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.35rem',
                }}
              >
                <span style={{ fontWeight: 600, color: '#e8e4d6', fontSize: '0.95rem' }}>
                  {r.display_name}
                </span>
                <span style={{ fontSize: '0.75rem', color: '#72b4f4', fontWeight: 600 }}>
                  ● Scholar Status
                </span>
                <span style={{ fontSize: '0.8rem', color: '#f0cf5a', fontFamily: 'monospace' }}>
                  {r.points} pts
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── 5. DUEL LEAGUE TRACKER (SWISS TOURNAMENT DECK) ── */}
      {gameMode === 'duel_league' && (
        <div className="card stack" style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '16px', padding: '1.5rem' }}>
          <h3 style={{ margin: '0 0 0.5rem', fontSize: '1.25rem', fontWeight: 700 }}>
            Swiss League Standings & Pairing Fixtures
          </h3>
          <table className="arena-score-table" style={{ width: '100%' }}>
            <thead>
              <tr style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>
                <th style={{ textAlign: 'left', padding: '0.5rem' }}>League Rank</th>
                <th style={{ textAlign: 'left', padding: '0.5rem' }}>Competitor</th>
                <th style={{ textAlign: 'right', padding: '0.5rem' }}>Duel Points</th>
                <th style={{ textAlign: 'right', padding: '0.5rem' }}>Match Status</th>
              </tr>
            </thead>
            <tbody>
              {rankings.map((r, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '0.75rem 0.5rem', fontWeight: 700 }}>#{idx + 1}</td>
                  <td style={{ padding: '0.75rem 0.5rem', fontWeight: 600 }}>{r.display_name}</td>
                  <td style={{ textAlign: 'right', padding: '0.75rem 0.5rem', fontWeight: 700, color: 'var(--primary)', fontFamily: 'var(--f-mono)' }}>
                    {r.points} pts
                  </td>
                  <td style={{ textAlign: 'right', padding: '0.75rem 0.5rem', color: 'var(--muted)', fontSize: '0.85rem' }}>
                    Active Swiss Pair
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── 6. LAND RUSH TRACKER (HEX COMMAND CENTER) ── */}
      {gameMode === 'land_rush' && (
        <div className="card stack" style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '16px', padding: '1.5rem' }}>
          <h3 style={{ margin: '0 0 0.5rem', fontSize: '1.25rem', fontWeight: 700 }}>
            Hex Territory Ownership & Tile Control
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(14rem, 1fr))', gap: '1rem' }}>
            {rankings.map((r, idx) => {
              const tilesClaimed = Math.max(1, Math.round(r.points / 50))
              return (
                <div
                  key={idx}
                  style={{
                    background: 'var(--surface)',
                    border: '1px solid var(--border)',
                    borderRadius: '12px',
                    padding: '1rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.4rem',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 700 }}>{r.display_name}</span>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--primary)' }}>
                      #{idx + 1}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--muted)' }}>
                    <span>Tiles Controlled: <strong style={{ color: 'var(--text)' }}>{tilesClaimed} ⬡</strong></span>
                    <span>{r.points} pts</span>
                  </div>
                  <div style={{ height: '6px', background: 'var(--surface2, rgba(0,0,0,0.06))', borderRadius: '3px', overflow: 'hidden', marginTop: '0.25rem' }}>
                    <div style={{ height: '100%', width: `${Math.min(100, tilesClaimed * 10)}%`, background: 'var(--primary)' }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
