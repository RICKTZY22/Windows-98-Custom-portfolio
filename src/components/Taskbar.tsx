import { win98Icons } from '../data/icons'
import type { NetworkState, WindowState } from '../types'

type TaskbarProps = {
  windows: WindowState[]
  activeWindowId?: string
  startOpen: boolean
  timeLabel: string
  network: NetworkState
  audioEnabled: boolean
  audioMuted: boolean
  onToggleStart: () => void
  onTaskClick: (instanceId: string) => void
  onToggleNetwork: () => void
  onToggleAudio: () => void
}

export function Taskbar({
  windows,
  activeWindowId,
  startOpen,
  timeLabel,
  network,
  audioEnabled,
  audioMuted,
  onToggleStart,
  onTaskClick,
  onToggleNetwork,
  onToggleAudio,
}: TaskbarProps) {
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
        <button className="tray-button" type="button" title="Network" onClick={onToggleNetwork}>
          <img className="tray-icon" src={win98Icons.network} alt="" />
        </button>
        <button
          className={`tray-button ${audioEnabled && !audioMuted ? 'online' : ''}`}
          type="button"
          title={audioEnabled ? 'Mute sound' : 'Enable sound'}
          onClick={onToggleAudio}
        >
          <img className="tray-icon" src={win98Icons.soundRecorder} alt="" />
        </button>
        <span className={`network-led ${network.connected ? 'online' : ''}`}></span>
        <span className="tray-cell">{network.connected ? 'LAN' : 'OFF'}</span>
        <span className="tray-time">{timeLabel}</span>
      </div>
    </footer>
  )
}
