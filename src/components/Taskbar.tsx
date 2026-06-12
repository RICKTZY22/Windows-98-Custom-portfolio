import { win98Icons } from '../data/icons'
import type { NetworkStatus, WindowState } from '../types'

type TaskbarProps = {
  windows: WindowState[]
  activeWindowId?: string
  startOpen: boolean
  timeLabel: string
  network: NetworkStatus
  onToggleStart: () => void
  onTaskClick: (instanceId: string) => void
}

export function Taskbar({
  windows,
  activeWindowId,
  startOpen,
  timeLabel,
  network,
  onToggleStart,
  onTaskClick,
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
        <img className="tray-icon" src={win98Icons.network} alt="" />
        <img className="tray-icon" src={win98Icons.soundRecorder} alt="" />
        <span className={`network-led ${network.connected ? 'online' : ''}`}></span>
        <span className="tray-cell">{network.connected ? 'LAN' : 'OFF'}</span>
        <span className="tray-time">{timeLabel}</span>
      </div>
    </footer>
  )
}
