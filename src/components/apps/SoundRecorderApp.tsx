import { useEffect, useState } from 'react'
import { win98Icons } from '../../data/icons'

type RecorderMode = 'stopped' | 'recording' | 'playing'

function formatTime(seconds: number) {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${String(secs).padStart(2, '0')}`
}

export function SoundRecorderApp() {
  const [mode, setMode] = useState<RecorderMode>('stopped')
  const [seconds, setSeconds] = useState(0)
  const [clips, setClips] = useState(0)

  useEffect(() => {
    if (mode === 'stopped') {
      return
    }
    const timer = window.setInterval(() => {
      setSeconds((current) => (current >= 59 ? 0 : current + 1))
    }, 1000)
    return () => window.clearInterval(timer)
  }, [mode])

  function stop() {
    if (mode === 'recording') {
      setClips((current) => current + 1)
    }
    setMode('stopped')
  }

  return (
    <div className="app-content sound-recorder-app">
      <ul className="os-menu-bar" role="menubar">
        <li>File</li>
        <li>Edit</li>
        <li>Effects</li>
        <li>Help</li>
      </ul>
      <div className="sound-recorder-panel">
        <img src={win98Icons.soundRecorder} alt="" />
        <div>
          <h2>Sound - Recorder</h2>
          <p>{mode === 'recording' ? 'Recording simulated audio...' : mode === 'playing' ? 'Playing fake clip...' : 'Ready'}</p>
        </div>
      </div>
      <div className="sound-display sunken-panel">
        <span>{formatTime(seconds)}</span>
        <div className={`sound-wave ${mode}`}>
          {Array.from({ length: 18 }, (_, index) => (
            <i key={index} style={{ height: `${8 + ((index * 7) % 28)}px` }}></i>
          ))}
        </div>
      </div>
      <div className="button-row sound-controls">
        <button type="button" onClick={() => setMode('recording')}>
          Record
        </button>
        <button type="button" onClick={() => setMode('playing')}>
          Play
        </button>
        <button type="button" onClick={stop}>
          Stop
        </button>
        <button type="button" onClick={() => setSeconds(0)}>
          Rewind
        </button>
      </div>
      <div className="status-bar">
        <p className="status-bar-field">{clips} saved clip(s)</p>
        <p className="status-bar-field">Portfolio microphone: simulated</p>
      </div>
    </div>
  )
}
