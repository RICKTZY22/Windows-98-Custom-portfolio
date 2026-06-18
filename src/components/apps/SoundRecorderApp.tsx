import './SoundRecorderApp.css'
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

const RECORDINGS_DIR = 'C:\\My Documents\\My Recordings'

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })
}

export function SoundRecorderApp() {
  const { fsOps, enableAudio, showMessageBox, openApp } = useOs()
  const [mode, setMode] = useState<RecorderMode>('stopped')
  const [seconds, setSeconds] = useState(0)
  const [clips, setClips] = useState(0)
  const [status, setStatus] = useState('Ready')
  const [hasClip, setHasClip] = useState(false)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const clipCountRef = useRef(0)
  const lastClipRef = useRef<string | undefined>(undefined)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    if (mode === 'stopped') {
      return
    }
    const timer = window.setInterval(() => {
      setSeconds((current) => (current >= 599 ? 0 : current + 1))
    }, 1000)
    return () => window.clearInterval(timer)
  }, [mode])

  // Release the mic stream and stop playback when the window closes.
  useEffect(() => {
    return () => {
      mediaRecorderRef.current?.stream?.getTracks().forEach((track) => track.stop())
      audioRef.current?.pause()
    }
  }, [])

  function stopPlayback() {
    audioRef.current?.pause()
  }

  // Build the clip from whatever was captured (real mic chunks, or a synth tone when no
  // microphone is available), save it to My Recordings, and open it in Media Player.
  async function finalizeRecording() {
    let dataUrl: string | undefined
    if (chunksRef.current.length) {
      const blob = new Blob(chunksRef.current, { type: chunksRef.current[0].type || 'audio/webm' })
      dataUrl = await blobToDataUrl(blob).catch(() => undefined)
    } else {
      dataUrl = await renderSoundToWavDataUrl('ding').catch(() => undefined)
    }
    chunksRef.current = []
    setMode('stopped')
    if (!dataUrl) {
      setStatus('Nothing was captured.')
      return
    }
    lastClipRef.current = dataUrl
    setHasClip(true)
    const index = clipCountRef.current + 1
    clipCountRef.current = index
    setClips(index)
    const name = `Recording ${index}.wav`
    const error = fsOps.createFile(RECORDINGS_DIR, name, { dataUrl, content: `Recorded ${nowStamp()}` })
    if (error) {
      showMessageBox({ title: 'Sound Recorder', message: error, icon: 'error', buttons: ['ok'] })
      setStatus('Could not save the recording.')
      return
    }
    setStatus(`Saved ${joinPath(RECORDINGS_DIR, name)} — opening Media Player...`)
    openApp('mediaPlayer', { filePath: joinPath(RECORDINGS_DIR, name) })
  }

  async function record() {
    if (mode === 'recording') return
    enableAudio()
    stopPlayback()
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
      // Finalize only once the recorder has fully flushed its data: the final
      // 'dataavailable' fires right before 'stop', so reading chunks here keeps
      // the real audio instead of losing it to a synchronous read.
      recorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop())
        void finalizeRecording()
      }
      recorder.start()
      setMode('recording')
      setStatus('Recording from microphone...')
    } catch {
      mediaRecorderRef.current = null
      setMode('recording')
      setStatus('No microphone — a tone will be saved on Stop.')
    }
  }

  function stop() {
    if (mode === 'playing') {
      stopPlayback()
      setMode('stopped')
      setStatus('Ready')
      return
    }
    if (mode !== 'recording') return
    const recorder = mediaRecorderRef.current
    if (recorder && recorder.state !== 'inactive') {
      setStatus('Saving recording...')
      recorder.stop() // -> onstop -> finalizeRecording()
      return
    }
    void finalizeRecording()
  }

  function play() {
    enableAudio()
    const clip = lastClipRef.current
    if (!clip) {
      setStatus('Nothing recorded yet — press Record first.')
      return
    }
    stopPlayback()
    // Fresh element each time, fully configured before it's stored in the ref.
    const audio = new Audio(clip)
    audio.onended = () => {
      setMode('stopped')
      setStatus('Ready')
    }
    audioRef.current = audio
    void audio
      .play()
      .then(() => {
        setMode('playing')
        setStatus('Playing current clip...')
      })
      .catch(() => setStatus('Cannot play this clip.'))
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
        <button type="button" onClick={() => void record()} disabled={mode === 'recording'}>
          Record
        </button>
        <button type="button" onClick={play} disabled={!hasClip || mode === 'recording'}>
          Play
        </button>
        <button type="button" onClick={stop} disabled={mode === 'stopped'}>
          Stop
        </button>
        <button type="button" onClick={() => setSeconds(0)}>
          Rewind
        </button>
      </div>
      <div className="status-bar">
        <p className="status-bar-field">{clips} saved clip(s)</p>
        <p className="status-bar-field">Saved in {RECORDINGS_DIR}</p>
      </div>
    </div>
  )
}
