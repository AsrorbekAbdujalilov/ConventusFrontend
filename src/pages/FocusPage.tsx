import { useEffect, useRef, useState } from 'react'
import '../styles/focus.css'

type FocusMode = 'timer' | 'stopwatch'
type MusicTrack = {
  name: string
  detail: string
  notes: number[]
  wave: OscillatorType
  tempo: number
}

const TIMER_PRESETS = [25, 50, 90]

const MUSIC_TRACKS: MusicTrack[] = [
  {
    name: 'Lo-fi keys',
    detail: 'Warm, mellow chords',
    notes: [261.63, 329.63, 392, 329.63, 293.66, 349.23, 440, 349.23],
    wave: 'triangle',
    tempo: 560,
  },
  {
    name: 'Soft piano',
    detail: 'Gentle notes, slow pace',
    notes: [261.63, 392, 329.63, 440, 293.66, 392, 349.23, 493.88],
    wave: 'sine',
    tempo: 720,
  },
  {
    name: 'Ambient',
    detail: 'A quiet, floating sound',
    notes: [196, 246.94, 293.66, 246.94, 220, 261.63, 329.63, 261.63],
    wave: 'sine',
    tempo: 900,
  },
]

function formatTime(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

function playTone(
  context: AudioContext,
  destination: GainNode,
  frequency: number,
  duration: number,
  wave: OscillatorType,
  volume: number,
) {
  const oscillator = context.createOscillator()
  const envelope = context.createGain()
  const now = context.currentTime

  oscillator.type = wave
  oscillator.frequency.value = frequency
  envelope.gain.setValueAtTime(0.0001, now)
  envelope.gain.exponentialRampToValueAtTime(volume, now + 0.04)
  envelope.gain.exponentialRampToValueAtTime(0.0001, now + duration)
  oscillator.connect(envelope)
  envelope.connect(destination)
  oscillator.start(now)
  oscillator.stop(now + duration + 0.02)
}

export function FocusPage() {
  const [mode, setMode] = useState<FocusMode>('timer')
  const [presetMinutes, setPresetMinutes] = useState(25)
  const [remainingSeconds, setRemainingSeconds] = useState(25 * 60)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [isRunning, setIsRunning] = useState(false)
  const [timerComplete, setTimerComplete] = useState(false)
  const [task, setTask] = useState('')
  const [selectedTrackIndex, setSelectedTrackIndex] = useState(0)
  const [musicPlaying, setMusicPlaying] = useState(false)
  const [volume, setVolume] = useState(35)
  const [musicError, setMusicError] = useState('')
  const timerDeadlineRef = useRef(0)
  const stopwatchStartedAtRef = useRef(0)
  const audioContextRef = useRef<AudioContext | null>(null)
  const musicGainRef = useRef<GainNode | null>(null)
  const musicIntervalRef = useRef<number | null>(null)
  const musicStepRef = useRef(0)

  useEffect(() => {
    if (!isRunning) return

    const interval = window.setInterval(() => {
      if (mode === 'timer') {
        const nextRemaining = Math.max(0, Math.ceil((timerDeadlineRef.current - Date.now()) / 1000))
        setRemainingSeconds(nextRemaining)
        if (nextRemaining === 0) {
          setIsRunning(false)
          setTimerComplete(true)
        }
      } else {
        setElapsedSeconds(Math.floor((Date.now() - stopwatchStartedAtRef.current) / 1000))
      }
    }, 200)

    return () => window.clearInterval(interval)
  }, [isRunning, mode])

  useEffect(() => {
    if (musicGainRef.current) {
      musicGainRef.current.gain.setTargetAtTime(volume / 100 * 0.16, musicGainRef.current.context.currentTime, 0.08)
    }
  }, [volume])

  useEffect(() => {
    return () => {
      if (musicIntervalRef.current !== null) window.clearInterval(musicIntervalRef.current)
      void audioContextRef.current?.close()
    }
  }, [])

  const stopMusic = () => {
    if (musicIntervalRef.current !== null) {
      window.clearInterval(musicIntervalRef.current)
      musicIntervalRef.current = null
    }
    setMusicPlaying(false)
  }

  const startMusic = async (trackIndex = selectedTrackIndex) => {
    const AudioContextConstructor = window.AudioContext
    if (!AudioContextConstructor) {
      setMusicError('This browser does not support audio playback.')
      return
    }

    try {
      const context = audioContextRef.current ?? new AudioContextConstructor()
      audioContextRef.current = context
      if (context.state === 'suspended') await context.resume()

      if (!musicGainRef.current) {
        const gain = context.createGain()
        gain.gain.value = volume / 100 * 0.16
        gain.connect(context.destination)
        musicGainRef.current = gain
      }

      if (musicIntervalRef.current !== null) window.clearInterval(musicIntervalRef.current)
      const track = MUSIC_TRACKS[trackIndex]
      musicStepRef.current = 0
      setMusicError('')
      setMusicPlaying(true)

      const playNextNote = () => {
        const step = musicStepRef.current
        const note = track.notes[step % track.notes.length]
        const bassNote = track.notes[Math.floor(step / 4) % track.notes.length] / 2
        playTone(context, musicGainRef.current!, note, 0.46, track.wave, 0.28)
        if (step % 4 === 0) playTone(context, musicGainRef.current!, bassNote, 1.4, 'sine', 0.12)
        musicStepRef.current += 1
      }

      playNextNote()
      musicIntervalRef.current = window.setInterval(playNextNote, track.tempo)
    } catch (error) {
      stopMusic()
      setMusicError(error instanceof Error ? `Could not start music: ${error.message}` : 'Could not start music.')
    }
  }

  const selectMode = (nextMode: FocusMode) => {
    setIsRunning(false)
    setTimerComplete(false)
    setMode(nextMode)
  }

  const selectPreset = (minutes: number) => {
    setPresetMinutes(minutes)
    setRemainingSeconds(minutes * 60)
    setTimerComplete(false)
  }

  const startOrPause = () => {
    if (isRunning) {
      if (mode === 'timer') {
        setRemainingSeconds(Math.max(0, Math.ceil((timerDeadlineRef.current - Date.now()) / 1000)))
      } else {
        setElapsedSeconds(Math.floor((Date.now() - stopwatchStartedAtRef.current) / 1000))
      }
      setIsRunning(false)
      return
    }

    if (mode === 'timer') {
      if (remainingSeconds === 0) setRemainingSeconds(presetMinutes * 60)
      timerDeadlineRef.current = Date.now() + (remainingSeconds === 0 ? presetMinutes * 60 : remainingSeconds) * 1000
      setTimerComplete(false)
    } else {
      stopwatchStartedAtRef.current = Date.now() - elapsedSeconds * 1000
    }
    setIsRunning(true)
  }

  const resetClock = () => {
    setIsRunning(false)
    setTimerComplete(false)
    if (mode === 'timer') setRemainingSeconds(presetMinutes * 60)
    else setElapsedSeconds(0)
  }

  const switchTrack = (index: number) => {
    setSelectedTrackIndex(index)
    if (musicPlaying) void startMusic(index)
  }

  const clockValue = mode === 'timer' ? remainingSeconds : elapsedSeconds
  const progress = mode === 'timer'
    ? 1 - remainingSeconds / (presetMinutes * 60)
    : (elapsedSeconds % 3600) / 3600
  const circumference = 2 * Math.PI * 118

  return (
    <div className="focus-page">
      <div className="focus-wrap">
        <header className="focus-heading">
          <span className="focus-eyebrow"><span className="focus-live-dot" /> YOUR QUIET STUDY SPACE</span>
          <h1>Find your focus.</h1>
          <p>A little structure, a little music, and one thing at a time.</p>
        </header>

        <div className="focus-layout">
          <section className="focus-clock-card" aria-label="Study timer and stopwatch">
            <div className="focus-mode-switch" role="tablist" aria-label="Clock mode">
              <button
                type="button"
                role="tab"
                aria-selected={mode === 'timer'}
                className={mode === 'timer' ? 'is-selected' : ''}
                onClick={() => selectMode('timer')}
              >
                Focus timer
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={mode === 'stopwatch'}
                className={mode === 'stopwatch' ? 'is-selected' : ''}
                onClick={() => selectMode('stopwatch')}
              >
                Stopwatch
              </button>
            </div>

            {mode === 'timer' && (
              <div className="focus-presets" aria-label="Focus session length">
                {TIMER_PRESETS.map((minutes) => (
                  <button
                    type="button"
                    key={minutes}
                    aria-pressed={presetMinutes === minutes}
                    className={presetMinutes === minutes ? 'is-selected' : ''}
                    onClick={() => selectPreset(minutes)}
                    disabled={isRunning}
                  >
                    {minutes} min
                  </button>
                ))}
              </div>
            )}

            <div className={`focus-clock ${isRunning ? 'is-running' : ''}`}>
              <svg className="focus-progress" viewBox="0 0 260 260" aria-hidden="true">
                <circle className="focus-progress-track" cx="130" cy="130" r="118" />
                <circle
                  className="focus-progress-value"
                  cx="130"
                  cy="130"
                  r="118"
                  strokeDasharray={circumference}
                  strokeDashoffset={circumference * (1 - progress)}
                />
              </svg>
              <div className="focus-clock-content" role="timer" aria-live="off">
                <span className="focus-clock-label">{timerComplete ? 'Session complete' : mode === 'timer' ? 'TIME TO FOCUS' : 'TIME FOCUSED'}</span>
                <strong>{formatTime(clockValue)}</strong>
                <span className="focus-clock-caption">
                  {timerComplete ? 'You did great. Take a little break.' : isRunning ? 'You’re in the zone' : 'Ready when you are'}
                </span>
              </div>
            </div>

            <div className="focus-clock-actions">
              <button type="button" className="btn primary focus-start-button" onClick={startOrPause}>
                <span aria-hidden="true">{isRunning ? 'Ⅱ' : '▶'}</span>
                {isRunning ? 'Pause' : timerComplete ? 'Start again' : 'Start focusing'}
              </button>
              <button type="button" className="btn line focus-reset-button" onClick={resetClock} aria-label="Reset clock">
                ↻
              </button>
            </div>

            <label className="focus-task-field">
              <span>What are you working on?</span>
              <input
                type="text"
                value={task}
                onChange={(event) => setTask(event.target.value)}
                placeholder="e.g. Review biology notes"
                maxLength={100}
              />
            </label>
          </section>

          <aside className="focus-side-column">
            <section className="focus-music-card">
              <div className="focus-card-heading">
                <div className="focus-music-icon" aria-hidden="true">♫</div>
                <div>
                  <span className="focus-card-kicker">A LITTLE BACKGROUND</span>
                  <h2>Study music</h2>
                </div>
              </div>
              <p className="focus-card-description">Soft, looping tones made right here in your browser.</p>

              <div className="focus-track-list" role="group" aria-label="Choose study music">
                {MUSIC_TRACKS.map((track, index) => (
                  <button
                    type="button"
                    key={track.name}
                    className={`focus-track ${selectedTrackIndex === index ? 'is-selected' : ''}`}
                    aria-pressed={selectedTrackIndex === index}
                    onClick={() => switchTrack(index)}
                  >
                    <span className="focus-track-symbol" aria-hidden="true">{selectedTrackIndex === index && musicPlaying ? '♫' : '♪'}</span>
                    <span className="focus-track-copy">
                      <strong>{track.name}</strong>
                      <small>{track.detail}</small>
                    </span>
                    {selectedTrackIndex === index && musicPlaying && <span className="focus-playing-label">PLAYING</span>}
                  </button>
                ))}
              </div>

              <div className="focus-music-controls">
                <button
                  type="button"
                  className="focus-music-play"
                  onClick={() => musicPlaying ? stopMusic() : void startMusic()}
                  aria-label={musicPlaying ? 'Pause study music' : 'Play study music'}
                >
                  {musicPlaying ? 'Ⅱ' : '▶'}
                </button>
                <label className="focus-volume">
                  <span>Volume</span>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={volume}
                    onChange={(event) => setVolume(Number(event.target.value))}
                    aria-label="Music volume"
                  />
                </label>
                <span className="focus-volume-value">{volume}%</span>
              </div>
              {musicError && <p className="focus-music-error" role="alert">{musicError}</p>}
            </section>

            <section className="focus-note-card">
              <span className="focus-note-sparkle" aria-hidden="true">✳</span>
              <div>
                <h2>Small steps count.</h2>
                <p>Pick one task, give it your attention, and let the rest wait.</p>
              </div>
            </section>
          </aside>
        </div>
        <p className="focus-footer-note">Your focus session stays on this device. No sign-in needed.</p>
      </div>
    </div>
  )
}
