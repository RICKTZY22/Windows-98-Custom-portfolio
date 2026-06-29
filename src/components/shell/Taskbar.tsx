import { useEffect, useRef, useState, type MouseEvent } from 'react'
import { win98Icons } from '../../data/icons'
import type { NetworkState, WindowState } from '../../types'

const weekDays = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

function formatClock(date: Date) {
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}

function calendarCells(date: Date): Array<number | null> {
  const year = date.getFullYear()
  const month = date.getMonth()
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells: Array<number | null> = Array.from({ length: firstDay }, () => null)
  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push(day)
  }
  while (cells.length % 7 !== 0) {
    cells.push(null)
  }
  return cells
}

type TaskbarProps = {
  windows: WindowState[]
  activeWindowId?: string
  startOpen: boolean
  network: NetworkState
  audioEnabled: boolean
  audioMuted: boolean
  audioVolume: number
  onToggleStart: () => void
  onTaskClick: (instanceId: string) => void
  onToggleNetwork: () => void
  onToggleMute: () => void
  onSetVolume: (volume: number) => void
  onTaskRestore: (instanceId: string) => void
  onTaskMinimize: (instanceId: string) => void
  onTaskToggleMaximize: (instanceId: string) => void
  onTaskClose: (instanceId: string) => void
  onMinimizeAll: () => void
  onOpenTaskManager: () => void
  onOpenTaskbarProperties: () => void
}

type TaskbarContextMenu =
  | { kind: 'taskbar'; x: number; y: number }
  | { kind: 'window'; x: number; y: number; instanceId: string }

export function Taskbar({
  windows,
  activeWindowId,
  startOpen,
  network,
  audioEnabled,
  audioMuted,
  audioVolume,
  onToggleStart,
  onTaskClick,
  onToggleNetwork,
  onToggleMute,
  onSetVolume,
  onTaskRestore,
  onTaskMinimize,
  onTaskToggleMaximize,
  onTaskClose,
  onMinimizeAll,
  onOpenTaskManager,
  onOpenTaskbarProperties,
}: TaskbarProps) {
  const soundOn = audioEnabled && !audioMuted
  const [clockDate, setClockDate] = useState(() => new Date())
  const [volumeOpen, setVolumeOpen] = useState(false)
  const [clockOpen, setClockOpen] = useState(false)
  const [contextMenu, setContextMenu] = useState<TaskbarContextMenu | null>(null)
  const volumeRef = useRef<HTMLDivElement>(null)
  const clockRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const interval = window.setInterval(() => setClockDate(new Date()), 1000)
    return () => window.clearInterval(interval)
  }, [])

  // Close tray flyouts on Escape or a click anywhere outside them. The
  // taskbar swallows its own pointerdown events, so this window listener only
  // ever fires for clicks out on the desktop/windows.
  useEffect(() => {
    if (!volumeOpen && !clockOpen && !contextMenu) return
    function onPointerDown(event: PointerEvent) {
      if (!volumeRef.current?.contains(event.target as Node)) {
        setVolumeOpen(false)
      }
      if (!clockRef.current?.contains(event.target as Node)) {
        setClockOpen(false)
      }
      setContextMenu(null)
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setVolumeOpen(false)
        setClockOpen(false)
        setContextMenu(null)
      }
    }
    window.addEventListener('pointerdown', onPointerDown)
    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [clockOpen, contextMenu, volumeOpen])

  const volumePercent = Math.round(audioVolume * 100)
  const calendar = calendarCells(clockDate)
  const today = clockDate.getDate()
  const dateLabel = clockDate.toLocaleDateString([], {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
  const monthLabel = clockDate.toLocaleDateString([], { month: 'long', year: 'numeric' })
  const timeLabel = formatClock(clockDate)
  const contextWindow =
    contextMenu?.kind === 'window' ? windows.find((window) => window.instanceId === contextMenu.instanceId) : null
  const hasVisibleWindows = windows.some((window) => !window.minimized)

  function menuPosition(event: MouseEvent, menuHeight = 150) {
    const menuWidth = 190
    return {
      x: Math.max(2, Math.min(event.clientX, window.innerWidth - menuWidth - 2)),
      y: Math.max(2, Math.min(event.clientY, window.innerHeight - menuHeight - 38)),
    }
  }

  function openTaskbarContextMenu(event: MouseEvent) {
    event.preventDefault()
    event.stopPropagation()
    setVolumeOpen(false)
    setClockOpen(false)
    setContextMenu({ kind: 'taskbar', ...menuPosition(event, 112) })
  }

  function openTaskButtonContextMenu(event: MouseEvent, instanceId: string) {
    event.preventDefault()
    event.stopPropagation()
    setVolumeOpen(false)
    setClockOpen(false)
    setContextMenu({ kind: 'window', instanceId, ...menuPosition(event, 170) })
  }

  function runContextAction(action: () => void) {
    action()
    setContextMenu(null)
  }

  return (
    <footer
      className="taskbar"
      onPointerDown={(event) => event.stopPropagation()}
      onContextMenu={(event) => {
        const target = event.target as HTMLElement
        if (target.closest('.task-button, .start-button, .tray')) return
        openTaskbarContextMenu(event)
      }}
    >
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
            title={`${window.title}${window.minimized ? ' (minimized)' : ''}`}
            onClick={() => onTaskClick(window.instanceId)}
            onContextMenu={(event) => openTaskButtonContextMenu(event, window.instanceId)}
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
          title={
            network.connected
              ? `Network connected\nIP address: ${network.ipAddress}\nAdapter: ${network.adapterName}`
              : `Network disconnected\nAdapter: ${network.adapterName}`
          }
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
        <span
          className={`network-led ${network.connected ? 'online' : ''}`}
          title={network.connected ? 'Packets are moving on the simulated LAN.' : 'No simulated network link.'}
        ></span>
        <span className="tray-cell" title={network.connected ? `LAN connected: ${network.ipAddress}` : 'LAN offline'}>
          {network.connected ? 'LAN' : 'OFF'}
        </span>
        <div className="tray-clock" ref={clockRef}>
          <button
            className={`tray-time ${clockOpen ? 'active' : ''}`}
            type="button"
            title={`${dateLabel}\nClick to show calendar`}
            aria-haspopup="dialog"
            aria-expanded={clockOpen}
            onClick={() => setClockOpen((open) => !open)}
          >
            {timeLabel}
          </button>
          {clockOpen && (
            <div className="clock-flyout" role="dialog" aria-label="Date and Time">
              <div className="clock-flyout-title">Date/Time</div>
              <div className="clock-flyout-date">{dateLabel}</div>
              <div className="clock-flyout-time">{clockDate.toLocaleTimeString()}</div>
              <div className="clock-calendar" aria-label={monthLabel}>
                <div className="clock-calendar-month">{monthLabel}</div>
                <div className="clock-calendar-grid">
                  {weekDays.map((day) => (
                    <strong key={day}>{day}</strong>
                  ))}
                  {calendar.map((day, index) => (
                    <span key={`${day ?? 'blank'}-${index}`} className={day === today ? 'today' : ''}>
                      {day ?? ''}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      {contextMenu?.kind === 'taskbar' && (
        <nav
          className="desktop-context-menu taskbar-context-menu"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          aria-label="Taskbar context menu"
          onPointerDown={(event) => event.stopPropagation()}
        >
          <ul>
            <li>
              <button type="button" disabled={!hasVisibleWindows} onClick={() => runContextAction(onMinimizeAll)}>
                Minimize All Windows
              </button>
            </li>
            <li className="context-separator" aria-hidden="true"></li>
            <li>
              <button type="button" onClick={() => runContextAction(onOpenTaskManager)}>
                <img src={win98Icons.taskManager} alt="" />
                Task Manager
              </button>
            </li>
            <li>
              <button type="button" onClick={() => runContextAction(onOpenTaskbarProperties)}>
                Properties
              </button>
            </li>
          </ul>
        </nav>
      )}
      {contextMenu?.kind === 'window' && contextWindow && (
        <nav
          className="desktop-context-menu taskbar-context-menu"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          aria-label={`${contextWindow.title} taskbar button menu`}
          onPointerDown={(event) => event.stopPropagation()}
        >
          <ul>
            <li>
              <button type="button" onClick={() => runContextAction(() => onTaskRestore(contextWindow.instanceId))}>
                Restore
              </button>
            </li>
            <li>
              <button
                type="button"
                disabled={contextWindow.minimized}
                onClick={() => runContextAction(() => onTaskMinimize(contextWindow.instanceId))}
              >
                Minimize
              </button>
            </li>
            <li>
              <button type="button" onClick={() => runContextAction(() => onTaskToggleMaximize(contextWindow.instanceId))}>
                {contextWindow.maximized ? 'Restore Size' : 'Maximize'}
              </button>
            </li>
            <li className="context-separator" aria-hidden="true"></li>
            <li>
              <button type="button" onClick={() => runContextAction(() => onTaskClose(contextWindow.instanceId))}>
                Close
              </button>
            </li>
            <li className="context-separator" aria-hidden="true"></li>
            <li>
              <button type="button" onClick={() => runContextAction(onOpenTaskManager)}>
                <img src={win98Icons.taskManager} alt="" />
                Task Manager
              </button>
            </li>
          </ul>
        </nav>
      )}
    </footer>
  )
}
