import { useEffect, useRef, useState } from 'react'
import { win98Icons } from '../../data/icons'
import type { NetworkState, WindowState } from '../../types'

type TaskbarProps = {
  windows: WindowState[]
  activeWindowId?: string
  startOpen: boolean
  timeLabel: string
  network: NetworkState
  audioEnabled: boolean
  audioMuted: boolean
  audioVolume: number
  onToggleStart: () => void
  onTaskClick: (instanceId: string) => void
  onToggleNetwork: () => void
  onToggleMute: () => void
  onSetVolume: (volume: number) => void
}

export function Taskbar({
  windows,
  activeWindowId,
  startOpen,
  timeLabel,
  network,
  audioEnabled,
  audioMuted,
  audioVolume,
  onToggleStart,
  onTaskClick,
  onToggleNetwork,
  onToggleMute,
  onSetVolume,
}: TaskbarProps) {
  const soundOn = audioEnabled && !audioMuted
  const [volumeOpen, setVolumeOpen] = useState(false)
  const volumeRef = useRef<HTMLDivElement>(null)

  // Close the volume flyout on Escape or a click anywhere outside it. The
  // taskbar swallows its own pointerdown events, so this window listener only
  // ever fires for clicks out on the desktop/windows.
  useEffect(() => {
    if (!volumeOpen) return
    function onPointerDown(event: PointerEvent) {
      if (!volumeRef.current?.contains(event.target as Node)) {
        setVolumeOpen(false)
      }
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setVolumeOpen(false)
    }
    window.addEventListener('pointerdown', onPointerDown)
    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [volumeOpen])

  const volumePercent = Math.round(audioVolume * 100)

  return (
    <footer className="taskbar" onPointerDown={(event) => event.stopPropagation()}>
      <button
        className={`start-button ${startOpen ? 'active' : ''}`}
        type="button"
        aria-expanded={startOpen}
        onClick={onToggleStart}
      >
        <img src={win98Icons.windowsSmall} alt="" />
        Start
      </button>
      <div className="task-buttons" role="list" aria-label="Open windows">
        {windows.map((window) => (
          <button
            key={window.instanceId}
            className={`task-button ${window.instanceId === activeWindowId && !window.minimized ? 'active' : ''}`}
            type="button"
            role="listitem"
            onClick={() => onTaskClick(window.instanceId)}
          >
            <img src={win98Icons[window.icon]} alt="" />
            <span>{window.title}</span>
          </button>
        ))}
      </div>
      <div className="tray" aria-label="System tray">
        <button
          className={`tray-button ${network.connected ? '' : 'offline'}`}
          type="button"
          title={network.connected ? 'Network (connected)' : 'Network (disconnected)'}
          aria-pressed={network.connected}
          onClick={onToggleNetwork}
        >
          <img className="tray-icon" src={win98Icons.network} alt="" />
        </button>
        <div className="tray-volume" ref={volumeRef}>
          <button
            className={`tray-button ${soundOn ? '' : 'muted'}`}
            type="button"
            title={soundOn ? `Volume: ${volumePercent}%` : 'Volume: muted'}
            aria-haspopup="dialog"
            aria-expanded={volumeOpen}
            onClick={() => setVolumeOpen((open) => !open)}
          >
            <img className="tray-icon" src={win98Icons.soundRecorder} alt="" />
          </button>
          {volumeOpen && (
            <div className="volume-flyout" role="dialog" aria-label="Volume control">
              <span className="volume-flyout-title">Volume</span>
              <input
                className="volume-slider"
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={audioVolume}
                aria-label="Volume level"
                onChange={(event) => onSetVolume(Number(event.target.value))}
              />
              <span className="volume-flyout-value">{volumePercent}%</span>
              <label className="volume-flyout-mute">
                <input type="checkbox" checked={!soundOn} onChange={onToggleMute} />
                Mute
              </label>
            </div>
          )}
        </div>
        <span className={`network-led ${network.connected ? 'online' : ''}`}></span>
        <span className="tray-cell">{network.connected ? 'LAN' : 'OFF'}</span>
        <span className="tray-time">{timeLabel}</span>
      </div>
    </footer>
  )
}
