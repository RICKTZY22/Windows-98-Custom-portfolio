import { useEffect, useRef, useState } from 'react'
import { win98Icons } from '../../data/icons'
import { useOs } from '../../os/useOs'
import { renderSoundToWavDataUrl } from '../../os/audio'
import { joinPath, nowStamp } from '../../os/filesystem'

type RecorderMode = 'stopped' | 'recording' | 'playing'

function formatTime(seconds: number) {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${String(secs).padStart(2, '0')}`
}

export function SoundRecorderApp() {
  const { fsOps, enableAudio, playSound, showMessageBox } = useOs()
  const [mode, setMode] = useState<RecorderMode>('stopped')
  const [seconds, setSeconds] = useState(0)
  const [clips, setClips] = useState(0)
  const [status, setStatus] = useState('Ready')
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])

  useEffect(() => {
    if (mode === 'stopped') {
      return
    }
    const timer = window.setInterval(() => {
      setSeconds((current) => (current >= 59 ? 0 : current + 1))
    }, 1000)
    return () => window.clearInterval(timer)
  }, [mode])

  async function record() {
    enableAudio()
    chunksRef.current = []
    setSeconds(0)
    try {
      const stream = await navigator.mediaDevices?.getUserMedia({ audio: true })
      if (!stream || typeof MediaRecorder === 'undefined') {
        throw new Error('Recording is unavailable.')
      }
      const recorder = new MediaRecorder(stream)
      mediaRecorderRef.current = recorder
      recorder.ondataavailable = (event) => {
        if (event.data.size) chunksRef.current.push(event.data)
      }
      recorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop())
      }
      recorder.start()
      setMode('recording')
      setStatus('Recording from microphone...')
    } catch {
      setMode('recording')
      setStatus('Recording simulated audio...')
    }
  }

  async function stop() {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop()
    }
    if (mode === 'recording') {
      setClips((current) => current + 1)
      const name = `Recording ${clips + 1}.wav`
      let dataUrl: string | undefined
      if (chunksRef.current.length) {
        const blob = new Blob(chunksRef.current, { type: chunksRef.current[0].type || 'audio/webm' })
        dataUrl = await new Promise<string>((resolve) => {
          const reader = new FileReader()
          reader.onload = () => resolve(String(reader.result))
          reader.readAsDataURL(blob)
        })
      } else {
        dataUrl = await renderSoundToWavDataUrl('ding').catch(() => undefined)
      }
      const error = fsOps.createFile('C:\\My Documents\\Music', name, {
        dataUrl,
        content: `Recorded ${nowStamp()}`,
      })
      if (error) {
        showMessageBox({ title: 'Sound Recorder', message: error, icon: 'error', buttons: ['ok'] })
      } else {
        setStatus(`Saved ${joinPath('C:\\My Documents\\Music', name)}`)
      }
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
          <p>{status}</p>
        </div>
      </div>
      <div className="sound-display sunken-panel">
        <span>{formatTime(seconds)}</span>
        <div className={`sound-wave ${mode}`}>
          {Array.from({ length: 18 }, (_, index) => (
            <i key={index} style={{ height: `${8 + ((index * 7) % 28)}px` }} />
          ))}
        </div>
      </div>
      <div className="button-row sound-controls">
        <button type="button" onClick={record}>
          Record
        </button>
        <button
          type="button"
          onClick={() => {
            enableAudio()
            playSound('ding')
            setMode('playing')
            setStatus('Playing current clip...')
          }}
        >
          Play
        </button>
        <button type="button" onClick={() => void stop()}>
          Stop
        </button>
        <button type="button" onClick={() => setSeconds(0)}>
          Rewind
        </button>
      </div>
      <div className="status-bar">
        <p className="status-bar-field">{clips} saved clip(s)</p>
        <p className="status-bar-field">Saved in C:\My Documents\Music</p>
      </div>
    </div>
  )
}
