import './VideoPlayerApp.css'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { AppProps, FsNode } from '../../types'
import { win98Icons } from '../../data/icons'
import { localMediaLibrary } from '../../data/media'
import { extensionOf, formatSize, getNode, listDirectory } from '../../os/filesystem'
import { useOs } from '../../os/useOs'
import { driverFailureBox, requiredDriverMissing } from '../../os/systemHealth'
import { useResolvedMediaUrl } from '../../os/useResolvedMediaUrl'

const VIDEO_EXTENSIONS = new Set(['mp4', 'avi', 'webm', 'mov', 'mkv', 'ogg'])

type VideoTrack = {
  id: string
  name: string
  src?: string
  filePath?: string
  size?: number
  fileType?: string
}

function isVideoFile(node: FsNode): boolean {
  return node.kind === 'file' && VIDEO_EXTENSIONS.has(extensionOf(node.name))
}

function trackFromNode(node: FsNode): VideoTrack {
  return {
    id: node.path,
    name: node.name,
    src: node.dataUrl,
    filePath: node.path,
    size: node.size,
    fileType: node.fileType,
  }
}

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds)) return '00:00'
  const minutes = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
}

export function VideoPlayerApp({ windowId, payload }: AppProps) {
  const { state, setWindowTitle, showMessageBox, enableAudio } = useOs()
  const videoRef = useRef<HTMLVideoElement>(null)
  const payloadNode = payload?.filePath ? getNode(state.fs, payload.filePath) : undefined
  const initialTrack = payloadNode ? trackFromNode(payloadNode) : null
  const [currentTrack, setCurrentTrack] = useState<VideoTrack | null>(() => initialTrack)
  const [currentSrc, setCurrentSrc] = useState<string | undefined>(() => initialTrack?.src)
  const playableSrc = useResolvedMediaUrl(currentSrc)
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
  const [error, setError] = useState<string | undefined>(() =>
    payload?.filePath && !payloadNode ? `Cannot find '${payload.filePath}'.` : undefined,
  )

  const playlist = useMemo<VideoTrack[]>(() => {
    const tracks: VideoTrack[] = []
    localMediaLibrary
      .filter((item) => item.kind === 'video')
      .forEach((item) => tracks.push({ id: `local-${item.id}`, name: item.name, src: item.src }))

    listDirectory(state.fs, 'C:\\My Videos')
      .filter(isVideoFile)
      .forEach((node) => {
        tracks.push(trackFromNode(node))
      })

    return tracks
  }, [state.fs])

  const loadTrack = useCallback(
    (track: VideoTrack, autoplay = false) => {
      const missingDriver = requiredDriverMissing(state.fs, ['video', 'audio'])
      if (missingDriver) {
        showMessageBox(driverFailureBox(missingDriver.type, 'Video Player', missingDriver.missing))
        return
      }
      if (!track.src) {
        showMessageBox({
          title: 'Video Player',
          message: `Cannot open '${track.name}'.`,
          detail: 'The virtual file exists, but no playable media URL is attached.',
          icon: 'error',
          buttons: ['ok'],
        })
        return
      }
      setCurrentTrack(track)
      setCurrentSrc(track.src)
      setIsPlaying(autoplay)
      setPosition(0)
      setDuration(0)
      setError(undefined)
    },
    [showMessageBox, state.fs],
  )

  useEffect(() => {
    setWindowTitle(windowId, currentTrack ? `${currentTrack.name} - Video Player` : 'Video Player')
  }, [currentTrack, setWindowTitle, windowId])

  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    video.volume = volume
  }, [volume])

  useEffect(() => {
    const video = videoRef.current
    if (!video || !playableSrc) return
    video.volume = volumeRef.current
    if (isPlayingRef.current) {
      void video.play().catch(() => setIsPlaying(false))
    }
  }, [playableSrc])

  function togglePlay() {
    const video = videoRef.current
    if (!video || !playableSrc) return
    const missingDriver = requiredDriverMissing(state.fs, ['video', 'audio'])
    if (missingDriver) {
      showMessageBox(driverFailureBox(missingDriver.type, 'Video Player', missingDriver.missing))
      return
    }
    if (video.paused) {
      void video.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false))
    } else {
      video.pause()
      setIsPlaying(false)
    }
  }

  function stop() {
    const video = videoRef.current
    if (!video) return
    video.pause()
    video.currentTime = 0
    setIsPlaying(false)
    setPosition(0)
  }

  function seek(nextPosition: number) {
    const video = videoRef.current
    if (!video || !Number.isFinite(video.duration)) return
    video.currentTime = nextPosition
    setPosition(nextPosition)
  }

  const status = error ?? (currentTrack ? (isPlaying ? 'Playing' : 'Ready') : 'No video loaded')

  return (
    <div className="app-content video-player-app">
      <ul className="os-menu-bar" role="menubar">
        <li>File</li>
        <li>View</li>
        <li>Play</li>
        <li>Favorites</li>
        <li>Help</li>
      </ul>
      <div className="video-player-main">
        <div className="sunken-panel video-stage">
          {playableSrc ? (
            <video
              ref={videoRef}
              src={playableSrc}
              className="video-screen"
              onTimeUpdate={(event) => setPosition(event.currentTarget.currentTime)}
              onLoadedMetadata={(event) => setDuration(event.currentTarget.duration)}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onEnded={() => setIsPlaying(false)}
              onError={() => {
                setError('Cannot play this video format in the browser.')
                setIsPlaying(false)
              }}
            />
          ) : (
            <div className="video-empty">
              <img src={win98Icons.videoPlayer} alt="" />
              <p>Select a video from the playlist.</p>
              <span>Files in C:\My Videos open here.</span>
            </div>
          )}
        </div>
        <div className="sunken-panel video-playlist">
          {playlist.map((track) => (
            <button
              type="button"
              key={track.id}
              className={`video-track ${currentTrack?.id === track.id ? 'selected' : ''}`}
              onDoubleClick={() => loadTrack(track, true)}
              onClick={() => loadTrack(track)}
            >
              <img src={win98Icons.videoFile} alt="" />
              <span>{track.name}</span>
            </button>
          ))}
          {playlist.length === 0 && <p className="video-empty-list">No video files found.</p>}
        </div>
      </div>
      <div className="video-controls">
        <button type="button" onClick={togglePlay} disabled={!playableSrc}>
          {isPlaying ? 'Pause' : 'Play'}
        </button>
        <button type="button" onClick={stop} disabled={!playableSrc}>
          Stop
        </button>
        <input
          type="range"
          aria-label="Seek"
          min={0}
          max={duration || 0}
          step={0.1}
          value={Math.min(position, duration || 0)}
          disabled={!playableSrc}
          onChange={(event) => seek(Number(event.target.value))}
        />
        <span>{formatTime(position)} / {formatTime(duration)}</span>
        <label>
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
        {!state.audio.enabled && (
          <button type="button" onClick={enableAudio}>
            Enable Sound
          </button>
        )}
      </div>
      <div className="status-bar">
        <p className="status-bar-field">{status}</p>
        <p className="status-bar-field">{currentTrack?.filePath ?? currentTrack?.name ?? 'C:\\My Videos'}</p>
        <p className="status-bar-field">
          {currentTrack?.fileType ?? 'Video'} {currentTrack?.size ? `- ${formatSize(currentTrack.size)}` : ''}
        </p>
      </div>
    </div>
  )
}
