import './MediaPlayerApp.css'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { AppProps, FsNode, SoundId } from '../../types'
import { win98Icons } from '../../data/icons'
import { localMediaLibrary } from '../../data/media'
import { getNode, listDirectory } from '../../os/filesystem'
import { renderSoundToWavDataUrl } from '../../os/audio'
import { useOs } from '../../os/useOs'
import { driverFailureBox, requiredDriverMissing } from '../../os/systemHealth'

const soundByFileName: Record<string, SoundId> = {
  'startup.wav': 'startup',
  'shutdown.wav': 'shutdown',
  'error.wav': 'error',
  'warning.wav': 'warn',
  'click.wav': 'click',
  'menu open.wav': 'menuOpen',
  'recycle.wav': 'recycle',
  'network up.wav': 'networkUp',
  'network down.wav': 'networkDown',
  'launch.wav': 'launch',
  'minimize.wav': 'minimize',
  'restore.wav': 'restore',
  'ding.wav': 'ding',
  'tada.wav': 'tada',
}

type Track = {
  id: string
  name: string
  kind: 'audio' | 'video'
  /** Either a direct src, a VFS dataUrl, or a synth SoundId rendered on demand. */
  src?: string
  synthId?: SoundId
}

function isMediaFile(node: FsNode): boolean {
  return Boolean(node.dataUrl) && /\.(wav|mp3|mp4|webm|ogg|avi|mid)$/i.test(node.name)
}

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds)) return '00:00'
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export function MediaPlayerApp({ windowId, payload }: AppProps) {
  const { state, setWindowTitle, showMessageBox, enableAudio } = useOs()
  const mediaRef = useRef<HTMLVideoElement>(null)
  const synthCache = useRef(new Map<SoundId, string>())
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null)
  const [currentSrc, setCurrentSrc] = useState<string>()
  const [isPlaying, setIsPlaying] = useState(false)
  const [position, setPosition] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(0.8)
  // Mirror volume/isPlaying into refs so the [currentSrc] effect can read the latest
  // values without listing them as deps (it must run only when the source changes).
  const volumeRef = useRef(volume)
  const isPlayingRef = useRef(isPlaying)
  useEffect(() => {
    volumeRef.current = volume
    isPlayingRef.current = isPlaying
  })

  const playlist = useMemo<Track[]>(() => {
    const tracks: Track[] = []
    localMediaLibrary.forEach((item) =>
      tracks.push({ id: `local-${item.id}`, name: item.name, kind: item.kind, src: item.src }),
    )
    // Only the user's own media is listed. System event sounds (C:\Windows\Media)
    // are intentionally excluded so the playlist shows music/recordings, not bleeps.
    const documentDirs = ['C:\\My Documents', 'C:\\My Documents\\Music', 'C:\\My Documents\\My Recordings']
    documentDirs.forEach((dir) => {
      listDirectory(state.fs, dir).forEach((node) => {
        if (isMediaFile(node)) {
          tracks.push({
            id: node.path,
            name: node.name,
            kind: /\.(mp4|webm|avi)$/i.test(node.name) ? 'video' : 'audio',
            src: node.dataUrl,
          })
        }
      })
    })
    return tracks
  }, [state.fs])

  const resolveSrc = useCallback(async (track: Track): Promise<string | undefined> => {
    if (track.src) return track.src
    if (track.synthId) {
      const cached = synthCache.current.get(track.synthId)
      if (cached) return cached
      const rendered = await renderSoundToWavDataUrl(track.synthId)
      synthCache.current.set(track.synthId, rendered)
      return rendered
    }
    return undefined
  }, [])

  const playTrack = useCallback(
    async (track: Track) => {
      const missingDriver = requiredDriverMissing(state.fs, track.kind === 'video' ? ['video', 'audio'] : ['audio'])
      if (missingDriver) {
        showMessageBox(driverFailureBox(missingDriver.type, 'Media Player', missingDriver.missing))
        return
      }
      try {
        const src = await resolveSrc(track)
        if (!src) {
          showMessageBox({ title: 'Media Player', message: `Cannot open '${track.name}'.`, icon: 'error', buttons: ['ok'] })
          return
        }
        setCurrentTrack(track)
        setCurrentSrc(src)
        setIsPlaying(true)
      } catch {
        showMessageBox({ title: 'Media Player', message: `Cannot render '${track.name}'.`, icon: 'error', buttons: ['ok'] })
      }
    },
    [resolveSrc, showMessageBox, state.fs],
  )

  // Open a file passed via association (double-click in Explorer). Deferred a
  // tick so the window mounts before any dialog/state updates fire.
  useEffect(() => {
    if (!payload?.filePath) return
    const filePath = payload.filePath
    const timer = window.setTimeout(() => {
      const node = getNode(state.fs, filePath)
      if (!node) {
        showMessageBox({ title: 'Media Player', message: `Cannot find '${filePath}'.`, icon: 'error', buttons: ['ok'] })
        return
      }
      const synthId = soundByFileName[node.name.toLowerCase()]
      void playTrack({
        id: node.path,
        name: node.name,
        kind: /\.(mp4|webm|avi)$/i.test(node.name) ? 'video' : 'audio',
        src: node.dataUrl,
        synthId,
      })
    }, 0)
    return () => window.clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payload?.filePath])

  useEffect(() => {
    setWindowTitle(windowId, currentTrack ? `${currentTrack.name} - Media Player` : 'Media Player')
  }, [currentTrack, setWindowTitle, windowId])

  useEffect(() => {
    const media = mediaRef.current
    if (!media || !currentSrc) return
    media.volume = volumeRef.current
    if (isPlayingRef.current) {
      void media.play().catch(() => setIsPlaying(false))
    }
  }, [currentSrc])

  useEffect(() => {
    const media = mediaRef.current
    if (media) media.volume = volume
  }, [volume])

  function togglePlay() {
    const media = mediaRef.current
    if (!media || !currentSrc || !currentTrack) return
    const missingDriver = requiredDriverMissing(state.fs, currentTrack.kind === 'video' ? ['video', 'audio'] : ['audio'])
    if (missingDriver) {
      showMessageBox(driverFailureBox(missingDriver.type, 'Media Player', missingDriver.missing))
      return
    }
    if (media.paused) {
      void media.play().catch(() => undefined)
      setIsPlaying(true)
    } else {
      media.pause()
      setIsPlaying(false)
    }
  }

  function stop() {
    const media = mediaRef.current
    if (!media) return
    media.pause()
    media.currentTime = 0
    setIsPlaying(false)
    setPosition(0)
  }

  function seek(value: number) {
    const media = mediaRef.current
    if (!media || !Number.isFinite(media.duration)) return
    media.currentTime = value
    setPosition(value)
  }

  const statusLabel = !currentTrack ? 'Ready' : isPlaying ? 'Playing' : 'Paused'

  return (
    <div className="app-content media-player-app">
      <ul className="os-menu-bar" role="menubar">
        <li>File</li>
        <li>View</li>
        <li>Play</li>
        <li>Help</li>
      </ul>
      <div className="sunken-panel media-screen">
        <video
          ref={mediaRef}
          className={currentTrack?.kind === 'video' ? 'media-video' : 'media-audio-element'}
          src={currentSrc}
          onTimeUpdate={(event) => setPosition(event.currentTarget.currentTime)}
          onLoadedMetadata={(event) => setDuration(event.currentTarget.duration)}
          onEnded={() => setIsPlaying(false)}
        />
        {currentTrack?.kind !== 'video' && (
          <div className="media-placeholder">
            <img src={win98Icons.mediaPlayer} alt="" />
            <p>{currentTrack ? currentTrack.name : 'Select a track from the playlist below.'}</p>
            {isPlaying && <div className="media-eq" aria-hidden="true"><span /><span /><span /><span /><span /></div>}
          </div>
        )}
      </div>
      <div className="media-transport">
        <button type="button" onClick={togglePlay} disabled={!currentTrack} title={isPlaying ? 'Pause' : 'Play'}>
          {isPlaying ? '❚❚' : '►'}
        </button>
        <button type="button" onClick={stop} disabled={!currentTrack} title="Stop">
          ■
        </button>
        <input
          type="range"
          aria-label="Seek"
          min={0}
          max={duration || 0}
          step={0.1}
          value={Math.min(position, duration || 0)}
          disabled={!currentTrack}
          onChange={(event) => seek(Number(event.target.value))}
        />
        <span className="media-time">
          {formatTime(position)} / {formatTime(duration)}
        </span>
        <label className="media-volume">
          Vol
          <input
            type="range"
            aria-label="Volume"
            min={0}
            max={1}
            step={0.05}
            value={volume}
            onChange={(event) => setVolume(Number(event.target.value))}
          />
        </label>
      </div>
      <div className="sunken-panel media-playlist">
        {playlist.map((track) => (
          <div
            key={track.id}
            role="button"
            tabIndex={0}
            className={`media-playlist-row ${currentTrack?.id === track.id ? 'selected' : ''}`}
            onDoubleClick={() => void playTrack(track)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') void playTrack(track)
            }}
          >
            <span>{track.kind === 'video' ? '🎬' : '♪'}</span>
            <span className="media-playlist-name">{track.name}</span>
            <span className="media-playlist-kind">{track.kind}</span>
          </div>
        ))}
        {playlist.length === 0 && (
          <p className="media-empty">
            No media yet. Record a clip in Sound Recorder, or add audio/video to My Documents\Music.
          </p>
        )}
      </div>
      {!state.audio.enabled && (
        <button type="button" className="media-enable-hint" onClick={enableAudio}>
          Sound is off — click to enable audio
        </button>
      )}
      <div className="status-bar">
        <p className="status-bar-field">{statusLabel}</p>
        <p className="status-bar-field">{currentTrack?.name ?? 'No clip loaded'}</p>
        <p className="status-bar-field">{playlist.length} track(s)</p>
      </div>
    </div>
  )
}
