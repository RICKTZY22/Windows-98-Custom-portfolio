// Windows 98 Portfolio Edition (c) 2026 John Erick Mendoza (github.com/RICKTZY22) - MIT, attribution required. origin-fingerprint: JEM-W98P-ORIGIN-7f3a9c1e2b5d
import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { desktopIconDefs } from './data/apps'
import type { AppId, DesktopIconDef, FsNode, OsNotification, Point, WindowPayload, WindowState } from './types'
import { useOs } from './os/useOs'
import { DESKTOP_FOLDER, getNode, openTargetFor } from './os/filesystem'
import { driverHealthy } from './os/systemHealth'
import { BootScreen } from './components/system/BootScreen'
import { CrashScreen } from './components/system/CrashScreen'
import { BiosSetupScreen } from './components/system/BiosSetupScreen'
import { BootMenu } from './components/system/BootMenu'
import { RecoveryConsole } from './components/system/RecoveryConsole'
import { LoadFailureScreen } from './components/system/LoadFailureScreen'
import { SafetyTrainingScreen } from './components/system/SafetyTrainingScreen'
import { ShutdownScreen } from './components/system/ShutdownScreen'
import { StartupScanScreen } from './components/system/StartupScanScreen'
import { BootDisclaimer } from './components/system/BootDisclaimer'
import { DesktopContextMenu, type DesktopArrangeMode } from './components/shell/DesktopContextMenu'
import { DesktopIcon } from './components/shell/DesktopIcon'
import { StartMenu } from './components/shell/StartMenu'
import { Taskbar } from './components/shell/Taskbar'
import { WindowFrame } from './components/shell/WindowFrame'

// App windows are code-split: each app is loaded on demand (its own JS/CSS chunk) the first
// time a window of that type opens, keeping the initial desktop bundle small. The shell
// (boot, desktop, taskbar, Start menu, window frame) above stays eager so booting is instant.
const AboutApp = lazy(() => import('./components/apps/AboutApp').then((m) => ({ default: m.AboutApp })))
const CalculatorApp = lazy(() => import('./components/apps/CalculatorApp').then((m) => ({ default: m.CalculatorApp })))
const ContactApp = lazy(() => import('./components/apps/ContactApp').then((m) => ({ default: m.ContactApp })))
const ControlPanelApp = lazy(() =>
  import('./components/apps/ControlPanelApp').then((m) => ({ default: m.ControlPanelApp })),
)
const CreditsApp = lazy(() => import('./components/apps/CreditsApp').then((m) => ({ default: m.CreditsApp })))
const ExplorerApp = lazy(() => import('./components/apps/ExplorerApp').then((m) => ({ default: m.ExplorerApp })))
const GalleryApp = lazy(() => import('./components/apps/GalleryApp').then((m) => ({ default: m.GalleryApp })))
const HelpApp = lazy(() => import('./components/apps/HelpApp').then((m) => ({ default: m.HelpApp })))
const ImageViewerApp = lazy(() => import('./components/apps/ImageViewerApp').then((m) => ({ default: m.ImageViewerApp })))
const InternetExplorerApp = lazy(() =>
  import('./components/apps/InternetExplorerApp').then((m) => ({ default: m.InternetExplorerApp })),
)
const InboxApp = lazy(() => import('./components/apps/InboxApp').then((m) => ({ default: m.InboxApp })))
const MediaPlayerApp = lazy(() => import('./components/apps/MediaPlayerApp').then((m) => ({ default: m.MediaPlayerApp })))
const JsDosGameApp = lazy(() =>
  import('./components/apps/JsDosGameApp').then((m) => ({ default: m.JsDosGameApp })),
)
const MinesweeperApp = lazy(() => import('./components/apps/MinesweeperApp').then((m) => ({ default: m.MinesweeperApp })))
const NetworkApp = lazy(() => import('./components/apps/NetworkApp').then((m) => ({ default: m.NetworkApp })))
const NotepadApp = lazy(() => import('./components/apps/NotepadApp').then((m) => ({ default: m.NotepadApp })))
const PaintApp = lazy(() => import('./components/apps/PaintApp').then((m) => ({ default: m.PaintApp })))
const PdfViewerApp = lazy(() => import('./components/apps/PdfViewerApp').then((m) => ({ default: m.PdfViewerApp })))
const ProjectDetailsApp = lazy(() =>
  import('./components/apps/ProjectDetailsApp').then((m) => ({ default: m.ProjectDetailsApp })),
)
const ProjectsApp = lazy(() => import('./components/apps/ProjectsApp').then((m) => ({ default: m.ProjectsApp })))
const RecycleBinApp = lazy(() => import('./components/apps/RecycleBinApp').then((m) => ({ default: m.RecycleBinApp })))
const RegistryEditorApp = lazy(() =>
  import('./components/apps/RegistryEditorApp').then((m) => ({ default: m.RegistryEditorApp })),
)
const ScanDiskApp = lazy(() => import('./components/apps/ScanDiskApp').then((m) => ({ default: m.ScanDiskApp })))
const DefragApp = lazy(() => import('./components/apps/DefragApp').then((m) => ({ default: m.DefragApp })))
const RunDialogApp = lazy(() => import('./components/apps/RunDialogApp').then((m) => ({ default: m.RunDialogApp })))
const SetupSafetyApp = lazy(() =>
  import('./components/apps/SetupSafetyApp').then((m) => ({ default: m.SetupSafetyApp })),
)
const SoundRecorderApp = lazy(() =>
  import('./components/apps/SoundRecorderApp').then((m) => ({ default: m.SoundRecorderApp })),
)
const TaskManagerApp = lazy(() => import('./components/apps/TaskManagerApp').then((m) => ({ default: m.TaskManagerApp })))
const SystemInfoApp = lazy(() => import('./components/apps/SystemInfoApp').then((m) => ({ default: m.SystemInfoApp })))
const DeviceManagerApp = lazy(() =>
  import('./components/apps/DeviceManagerApp').then((m) => ({ default: m.DeviceManagerApp })),
)
const MsConfigApp = lazy(() => import('./components/apps/MsConfigApp').then((m) => ({ default: m.MsConfigApp })))
const TerminalApp = lazy(() => import('./components/apps/TerminalApp').then((m) => ({ default: m.TerminalApp })))
const VideoPlayerApp = lazy(() => import('./components/apps/VideoPlayerApp').then((m) => ({ default: m.VideoPlayerApp })))
const AntivirusApp = lazy(() => import('./components/apps/AntivirusApp').then((m) => ({ default: m.AntivirusApp })))
const WordPadApp = lazy(() => import('./components/apps/WordPadApp').then((m) => ({ default: m.WordPadApp })))

const desktopIconWidth = 88
const desktopIconHeight = 80
const desktopIconGapX = 8
const desktopIconGapY = 12
const desktopShellIntroMs = 5_000

function formatClock(date: Date) {
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}

type SelectionBox = {
  pointerId: number
  startX: number
  startY: number
  currentX: number
  currentY: number
  moved: boolean
}

type MouseTrailPoint = {
  id: number
  x: number
  y: number
  opacity: number
}

function normalizeRect(box: Pick<SelectionBox, 'startX' | 'startY' | 'currentX' | 'currentY'>) {
  const left = Math.min(box.startX, box.currentX)
  const top = Math.min(box.startY, box.currentY)
  const right = Math.max(box.startX, box.currentX)
  const bottom = Math.max(box.startY, box.currentY)
  return { left, top, right, bottom, width: right - left, height: bottom - top }
}

// Win98-style pointer trail. Two fixes over the naive version: (1) throttle so a
// flood of pointermove events doesn't re-render every frame, and (2) clear the
// trail shortly after the cursor stops — otherwise the last few dots freeze on
// screen as stray squares. Capped to a short tail so it stays cheap.
const TRAIL_MAX = 7
const TRAIL_THROTTLE_MS = 24
const TRAIL_CLEAR_MS = 140

function MouseTrails() {
  const [points, setPoints] = useState<MouseTrailPoint[]>([])
  const counterRef = useRef(0)
  const lastMoveRef = useRef(0)
  const clearTimerRef = useRef(0)

  useEffect(() => {
    function handlePointerMove(event: PointerEvent) {
      if (event.timeStamp - lastMoveRef.current < TRAIL_THROTTLE_MS) return
      lastMoveRef.current = event.timeStamp
      counterRef.current += 1
      setPoints((current) => [
        { id: counterRef.current, x: event.clientX, y: event.clientY, opacity: 0.7 },
        ...current
          .slice(0, TRAIL_MAX - 1)
          .map((point, index) => ({ ...point, opacity: Math.max(0.12, 0.6 - index * 0.09) })),
      ])
      window.clearTimeout(clearTimerRef.current)
      clearTimerRef.current = window.setTimeout(() => setPoints([]), TRAIL_CLEAR_MS)
    }
    window.addEventListener('pointermove', handlePointerMove)
    return () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.clearTimeout(clearTimerRef.current)
    }
  }, [])

  if (!points.length) return null

  return (
    <div className="mouse-trail-layer" aria-hidden="true">
      {points.map((point) => (
        <span
          key={point.id}
          className="mouse-trail-dot"
          style={{ left: point.x, top: point.y, opacity: point.opacity }}
        />
      ))}
    </div>
  )
}

function intersectsIcon(rect: ReturnType<typeof normalizeRect>, pos: Point): boolean {
  return (
    rect.left <= pos.x + desktopIconWidth &&
    rect.right >= pos.x &&
    rect.top <= pos.y + desktopIconHeight &&
    rect.bottom >= pos.y
  )
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  if (target.isContentEditable) return true
  return Boolean(target.closest('input, textarea, select, [contenteditable="true"]'))
}

// Mirror the store's defaultDesktopIconPositions grid so FS-backed icons (which have
// no stored position yet) continue the same columns the hardcoded icons use.
const iconLayoutStepX = 96 // icon width 88 + gap 8
const iconLayoutStepY = 96 // icon row 84 + gap 12 (matches src/os/store.tsx)

function fallbackIconPosition(index: number): Point {
  const viewportHeight = typeof window === 'undefined' ? 768 : window.innerHeight
  const desktopHeight = Math.max(160, viewportHeight - 33)
  const rowsPerColumn = Math.max(1, Math.floor((desktopHeight - 24) / iconLayoutStepY))
  const column = Math.floor(index / rowsPerColumn)
  const row = index % rowsPerColumn
  return { x: 10 + column * iconLayoutStepX, y: 12 + row * iconLayoutStepY }
}

function desktopIconNode(iconId: string, fsNodes: Record<string, FsNode>): FsNode | undefined {
  return iconId.startsWith('fs:') ? fsNodes[iconId.slice(3)] : undefined
}

function desktopIconTooltip(iconDef: DesktopIconDef, fsNodes: Record<string, FsNode>): string {
  const node = desktopIconNode(iconDef.id, fsNodes)
  if (!node) {
    return `${iconDef.label}\nDouble-click to open.`
  }
  const targetLabel = node.appPayload?.filePath ?? node.appPayload?.path ?? node.appId ?? 'portfolio item'
  return `${iconDef.label}\nShortcut\nTarget: ${targetLabel}\nModified: ${node.modified}`
}

function sortDesktopIconDefs(
  icons: DesktopIconDef[],
  mode: DesktopArrangeMode,
  fsNodes: Record<string, FsNode>,
): DesktopIconDef[] {
  return [...icons].sort((a, b) => {
    if (mode === 'type') {
      const typeA = desktopIconNode(a.id, fsNodes)?.fileType ?? a.appId
      const typeB = desktopIconNode(b.id, fsNodes)?.fileType ?? b.appId
      return typeA.localeCompare(typeB) || a.label.localeCompare(b.label)
    }
    if (mode === 'modified') {
      const modifiedA = desktopIconNode(a.id, fsNodes)?.modified ?? ''
      const modifiedB = desktopIconNode(b.id, fsNodes)?.modified ?? ''
      return modifiedB.localeCompare(modifiedA) || a.label.localeCompare(b.label)
    }
    return a.label.localeCompare(b.label)
  })
}

// Turn a node living in C:\Windows\Desktop into a desktop icon definition so the
// desktop mirrors that folder — this is how "Send to Desktop" shortcuts show up.
function fsNodeToIconDef(node: FsNode): DesktopIconDef | null {
  const target = openTargetFor(node)
  if (!target) return null
  return {
    id: `fs:${node.path}`,
    label: node.name.replace(/\.lnk$/i, ''),
    icon: node.icon,
    appId: target.appId,
    payload: target.payload,
  }
}

// Taglish note: App.tsx ang shell/router layer. Dito lang pinipili kung anong
// window/app component ang irerender; yung business logic stays sa src/os.
function renderAppWindow(win: WindowState, openApp: (appId: AppId, payload?: WindowPayload) => void) {
  const props = { windowId: win.instanceId, payload: win.payload }
  switch (win.appId) {
    case 'explorer':
      return <ExplorerApp {...props} />
    case 'recycleBin':
      return <RecycleBinApp />
    case 'terminal':
      return <TerminalApp {...props} />
    case 'notepad':
      return <NotepadApp {...props} />
    case 'wordpad':
      return <WordPadApp {...props} />
    case 'pdfViewer':
      return <PdfViewerApp key={win.payload?.filePath ?? win.instanceId} {...props} />
    case 'paint':
      return <PaintApp {...props} />
    case 'imageViewer':
      return <ImageViewerApp key={win.payload?.filePath ?? win.instanceId} {...props} />
    case 'internetExplorer':
      return <InternetExplorerApp {...props} />
    case 'inbox':
      return <InboxApp />
    case 'mediaPlayer':
      return <MediaPlayerApp key={win.payload?.filePath ?? win.payload?.url ?? win.instanceId} {...props} />
    case 'videoPlayer':
      return <VideoPlayerApp key={win.payload?.filePath ?? win.payload?.url ?? win.instanceId} {...props} />
    case 'gallery':
      return <GalleryApp />
    case 'soundRecorder':
      return <SoundRecorderApp />
    case 'controlPanel':
      return <ControlPanelApp key={win.payload?.controlPanelSection ?? 'controlPanel'} {...props} />
    case 'network':
      return <NetworkApp />
    case 'run':
      return <RunDialogApp {...props} />
    case 'taskManager':
      return <TaskManagerApp />
    case 'systemInfo':
      return <SystemInfoApp />
    case 'deviceManager':
      return <DeviceManagerApp />
    case 'msconfig':
      return <MsConfigApp />
    case 'registryEditor':
      return <RegistryEditorApp />
    case 'scandisk':
      return <ScanDiskApp {...props} />
    case 'defrag':
      return <DefragApp {...props} />
    case 'calculator':
      return <CalculatorApp />
    case 'minesweeper':
      return <MinesweeperApp />
    case 'dosGame':
      return <JsDosGameApp {...props} />
    case 'antivirus':
      return <AntivirusApp {...props} />
    case 'setupSafety':
      return <SetupSafetyApp {...props} />
    case 'about':
      return <AboutApp />
    case 'contact':
      return <ContactApp />
    case 'projects':
      return <ProjectsApp openApp={openApp} />
    case 'projectDetails':
      return <ProjectDetailsApp projectId={win.payload?.projectId} />
    case 'credits':
      return <CreditsApp />
    case 'help':
      return <HelpApp />
    default:
      return null
  }
}

function MessageBoxHost() {
  const { state, dismissMessageBox } = useOs()
  if (!state.messageBoxes.length) return null
  return (
    <div className="message-box-layer" role="presentation">
      {state.messageBoxes.map((box) => (
        <section key={box.id} className="window message-box" role="alertdialog" aria-label={box.title}>
          <div className="title-bar">
            <div className="title-bar-text">{box.title}</div>
          </div>
          <div className="window-body message-box-body">
            <div className="message-box-copy">
              <span className={`message-icon ${box.icon}`}>!</span>
              <div>
                <p>{box.message}</p>
                {box.detail && <p className="message-detail">{box.detail}</p>}
              </div>
            </div>
            <div className="button-row run-buttons">
              {box.buttons.map((button) => (
                <button key={button} type="button" onClick={() => dismissMessageBox(box.id, button)}>
                  {button[0].toUpperCase() + button.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </section>
      ))}
    </div>
  )
}

// Transient taskbar balloon (e.g. "VGA Display disabled" after a driver delete).
// Each balloon dismisses itself after a few seconds or on click.
function NotificationBalloon({ note, onDismiss }: Readonly<{ note: OsNotification; onDismiss: (id: string) => void }>) {
  useEffect(() => {
    const timer = window.setTimeout(() => onDismiss(note.id), 2000)
    return () => window.clearTimeout(timer)
  }, [note.id, onDismiss])
  return (
    <div className="tray-balloon" role="status">
      <button
        type="button"
        className="tray-balloon-close"
        aria-label="Dismiss"
        onClick={() => onDismiss(note.id)}
      >
        ×
      </button>
      <strong>{note.title}</strong>
      <span>{note.body}</span>
    </div>
  )
}

function NotificationHost() {
  const { state, dismissNotification } = useOs()
  if (!state.notifications.length) return null
  return (
    <div className="tray-balloon-layer" aria-live="polite">
      {state.notifications.map((note) => (
        <NotificationBalloon key={note.id} note={note} onDismiss={dismissNotification} />
      ))}
    </div>
  )
}

function Desktop() {
  const {
    state,
    openApp,
    closeWindow,
    minimizeWindow,
    focusWindow,
    toggleMaximize,
    moveWindow,
    setStartMenuOpen,
    moveDesktopIcon,
    restart,
    shutDown,
    enableAudio,
    setAudioMuted,
    setAudioVolume,
    fsOps,
    showMessageBox,
    completeDesktopShellIntro,
  } = useOs()
  const [selectedIcon, setSelectedIcon] = useState(desktopIconDefs[0]?.id ?? 'myComputer')
  const [selectedIconIds, setSelectedIconIds] = useState<string[]>(() =>
    desktopIconDefs[0]?.id ? [desktopIconDefs[0].id] : [],
  )
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null)
  const [arrangeMode, setArrangeMode] = useState<DesktopArrangeMode>('name')
  const [autoArrange, setAutoArrange] = useState(false)
  const [selectionBox, setSelectionBox] = useState<SelectionBox | null>(null)
  const [recycleHover, setRecycleHover] = useState(false)
  const [refreshingDesktop, setRefreshingDesktop] = useState(false)
  const [shellIntroActive, setShellIntroActive] = useState(true)
  const [clockDate, setClockDate] = useState(() => new Date())
  const desktopRef = useRef<HTMLDivElement>(null)
  const orderedWindows = useMemo(() => [...state.windows].sort((a, b) => a.zIndex - b.zIndex), [state.windows])
  const primarySelectedIcon = selectedIconIds[0]
  const keyboardAnchorIcon = primarySelectedIcon ?? selectedIcon ?? desktopIconDefs[0]?.id
  const displayDriverDegraded = state.bootMode !== 'safe' && !driverHealthy(state.fs, 'video')

  // The desktop mirrors C:\Windows\Desktop: those FS nodes render as extra icons
  // alongside the hardcoded system icons. "Send to Desktop" drops shortcuts here.
  const fsDesktopIcons = useMemo<DesktopIconDef[]>(() => {
    const folder = getNode(state.fs, DESKTOP_FOLDER)
    if (!folder?.children) return []
    return folder.children
      .map((path) => state.fs.nodes[path])
      .filter((node): node is FsNode => Boolean(node))
      .map(fsNodeToIconDef)
      .filter((def): def is DesktopIconDef => Boolean(def))
  }, [state.fs])
  const allIconDefs = useMemo(() => [...desktopIconDefs, ...fsDesktopIcons], [fsDesktopIcons])
  // Stored position if the user has moved the icon, else a computed grid slot.
  const iconPositions = useMemo(() => {
    const map: Record<string, Point> = {}
    allIconDefs.forEach((def, index) => {
      map[def.id] = state.desktopIcons[def.id] ?? fallbackIconPosition(index)
    })
    return map
  }, [allIconDefs, state.desktopIcons])

  useEffect(() => {
    const interval = window.setInterval(() => setClockDate(new Date()), 1000)
    return () => window.clearInterval(interval)
  }, [])

  useEffect(() => {
    const delay = state.bootMode === 'safe' ? 300 : desktopShellIntroMs
    const timer = window.setTimeout(() => {
      setShellIntroActive(false)
      completeDesktopShellIntro()
    }, delay)
    return () => window.clearTimeout(timer)
  }, [completeDesktopShellIntro, state.bootMode])

  function focusDesktopIcon(id: string) {
    window.requestAnimationFrame(() => {
      const button = desktopRef.current?.querySelector<HTMLButtonElement>(`[data-desktop-icon-id="${id}"]`)
      button?.focus()
    })
  }

  function selectDesktopIcon(id: string, extend = false) {
    setSelectedIcon(id)
    setSelectedIconIds((current) => {
      if (!extend) return [id]
      return current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
    })
  }

  const desktopPoint = useCallback((clientX: number, clientY: number): Point => {
    const rect = desktopRef.current?.getBoundingClientRect()
    return { x: clientX - (rect?.left ?? 0), y: clientY - (rect?.top ?? 0) }
  }, [])

  const selectedIdsForBox = useCallback((box: SelectionBox): string[] => {
    const rect = normalizeRect(box)
    return allIconDefs
      .filter((icon) => intersectsIcon(rect, iconPositions[icon.id] ?? { x: 10, y: 12 }))
      .map((icon) => icon.id)
  }, [allIconDefs, iconPositions])

  const handleCloseWindow = useCallback(
    (instanceId: string) => {
      const target = state.windows.find((item) => item.instanceId === instanceId)
      if (target?.appId === 'setupSafety') {
        focusWindow(instanceId)
        window.dispatchEvent(new Event('setup-safety-close-attempt'))
        return
      }
      closeWindow(instanceId)
    },
    [closeWindow, focusWindow, state.windows],
  )

  const findNextDesktopIcon = useCallback((currentId: string, key: string): string => {
    const current = iconPositions[currentId] ?? { x: 10, y: 12 }
    const currentCenter = {
      x: current.x + desktopIconWidth / 2,
      y: current.y + desktopIconHeight / 2,
    }
    const scored = allIconDefs
      .filter((icon) => icon.id !== currentId)
      .map((icon) => {
        const pos = iconPositions[icon.id] ?? { x: 10, y: 12 }
        const center = { x: pos.x + desktopIconWidth / 2, y: pos.y + desktopIconHeight / 2 }
        return { id: icon.id, dx: center.x - currentCenter.x, dy: center.y - currentCenter.y }
      })
      .filter((item) => {
        if (key === 'ArrowRight') return item.dx > 0
        if (key === 'ArrowLeft') return item.dx < 0
        if (key === 'ArrowDown') return item.dy > 0
        return item.dy < 0
      })
      .sort((a, b) => {
        const primaryA = key === 'ArrowLeft' || key === 'ArrowRight' ? Math.abs(a.dx) : Math.abs(a.dy)
        const primaryB = key === 'ArrowLeft' || key === 'ArrowRight' ? Math.abs(b.dx) : Math.abs(b.dy)
        const secondaryA = key === 'ArrowLeft' || key === 'ArrowRight' ? Math.abs(a.dy) : Math.abs(a.dx)
        const secondaryB = key === 'ArrowLeft' || key === 'ArrowRight' ? Math.abs(b.dy) : Math.abs(b.dx)
        return primaryA - primaryB || secondaryA - secondaryB
      })
    return scored[0]?.id ?? currentId
  }, [allIconDefs, iconPositions])

  // Dropping a desktop shortcut onto the Recycle Bin deletes it (after the usual
  // Win98 confirmation). Only FS-backed icons (`fs:<path>`) are deletable.
  const handleDropOnRecycle = useCallback(
    (iconId: string) => {
      setRecycleHover(false)
      if (!iconId.startsWith('fs:')) return
      const path = iconId.slice(3)
      const node = getNode(state.fs, path)
      if (!node) return
      showMessageBox({
        title: 'Confirm File Delete',
        message: `Are you sure you want to send '${node.name.replace(/\.lnk$/i, '')}' to the Recycle Bin?`,
        icon: 'question',
        buttons: ['yes', 'no'],
        onResult: (button) => {
          if (button !== 'yes') return
          const error = fsOps.deleteNode(path, { skipConfirm: true })
          if (error) {
            showMessageBox({ title: 'Delete', message: error, icon: 'error', buttons: ['ok'] })
          }
        },
      })
    },
    [state.fs, fsOps, showMessageBox],
  )

  const gridPositionForIndex = useCallback((index: number): Point => {
    const desktopHeight = Math.max(160, window.innerHeight - 33)
    const rowsPerColumn = Math.max(1, Math.floor((desktopHeight - 24) / (desktopIconHeight + desktopIconGapY)))
    const column = Math.floor(index / rowsPerColumn)
    const row = index % rowsPerColumn
    return {
      x: 10 + column * (desktopIconWidth + desktopIconGapX),
      y: 12 + row * (desktopIconHeight + desktopIconGapY),
    }
  }, [])

  const applyDesktopIconLayout = useCallback(
    (iconIds: string[]) => {
      iconIds.forEach((id, index) => {
        moveDesktopIcon(id, gridPositionForIndex(index))
      })
    },
    [gridPositionForIndex, moveDesktopIcon],
  )

  function arrangeIconsBy(mode: DesktopArrangeMode) {
    setArrangeMode(mode)
    applyDesktopIconLayout(sortDesktopIconDefs(allIconDefs, mode, state.fs.nodes).map((icon) => icon.id))
    setContextMenu(null)
  }

  function toggleAutoArrange() {
    const next = !autoArrange
    setAutoArrange(next)
    if (next) {
      applyDesktopIconLayout(sortDesktopIconDefs(allIconDefs, arrangeMode, state.fs.nodes).map((icon) => icon.id))
    }
    setContextMenu(null)
  }

  function lineUpIcons() {
    const targets = selectedIconIds.length ? selectedIconIds : allIconDefs.map((icon) => icon.id)
    const orderedTargets = [...targets].sort((a, b) => {
      const posA = iconPositions[a] ?? { x: 10, y: 12 }
      const posB = iconPositions[b] ?? { x: 10, y: 12 }
      return posA.y - posB.y || posA.x - posB.x
    })
    orderedTargets.forEach((id, index) => {
      moveDesktopIcon(id, gridPositionForIndex(index))
    })
    setContextMenu(null)
  }

  useEffect(() => {
    if (!autoArrange) return
    applyDesktopIconLayout(sortDesktopIconDefs(allIconDefs, arrangeMode, state.fs.nodes).map((icon) => icon.id))
  }, [allIconDefs, applyDesktopIconLayout, arrangeMode, autoArrange, state.fs.nodes])

  useEffect(() => {
    if (!selectionBox) return
    const activeBox: SelectionBox = selectionBox

    function handlePointerMove(event: PointerEvent) {
      if (event.pointerId !== activeBox.pointerId) return
      const point = desktopPoint(event.clientX, event.clientY)
      const moved =
        activeBox.moved ||
        Math.abs(point.x - activeBox.startX) > 4 ||
        Math.abs(point.y - activeBox.startY) > 4
      const nextBox: SelectionBox = { ...activeBox, currentX: point.x, currentY: point.y, moved }
      setSelectionBox(nextBox)
      if (moved) {
        setSelectedIconIds(selectedIdsForBox(nextBox))
      }
    }

    function handlePointerUp(event: PointerEvent) {
      if (event.pointerId !== activeBox.pointerId) return
      const point = desktopPoint(event.clientX, event.clientY)
      const moved =
        activeBox.moved ||
        Math.abs(point.x - activeBox.startX) > 4 ||
        Math.abs(point.y - activeBox.startY) > 4
      if (!moved) {
        setSelectedIconIds([])
      }
      setSelectionBox(null)
    }

    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerUp)
    window.addEventListener('pointercancel', handlePointerUp)
    return () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
      window.removeEventListener('pointercancel', handlePointerUp)
    }
  }, [desktopPoint, selectedIdsForBox, selectionBox])

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const activeWindow = state.windows.find((item) => item.instanceId === state.activeWindowId)

      // Alt+F4 / Ctrl+W close the focused window. Checked before the DOS-game guard
      // below so a keyboard-captured game window can still be dismissed. Browsers
      // reserve some of these (Ctrl+W usually closes the tab and can't be prevented);
      // where the event reaches us we honor it, and since OS state is persisted an
      // intercepted Ctrl+W simply reloads to the same desktop.
      if (
        activeWindow &&
        !activeWindow.minimized &&
        ((event.altKey && event.key === 'F4') || (event.ctrlKey && event.key.toLowerCase() === 'w'))
      ) {
        event.preventDefault()
        handleCloseWindow(activeWindow.instanceId)
        return
      }

      // When a DOS game window is focused it captures the keyboard entirely:
      // arrows are player movement, Ctrl/Alt/Space are fire/strafe/use, and
      // F-keys/Enter/Escape drive in-game menus. Let js-dos have every key so
      // desktop icon navigation and Windows shortcuts don't fire at the same
      // time. The user switches away by clicking the taskbar or another window.
      if (activeWindow?.appId === 'dosGame' && !activeWindow.minimized) {
        return
      }
      if (event.ctrlKey && event.key === 'Escape') {
        event.preventDefault()
        setContextMenu(null)
        setStartMenuOpen(!state.startMenuOpen)
        return
      }
      if (event.key === 'Escape') {
        setStartMenuOpen(false)
        setContextMenu(null)
        if (selectedIconIds.length) {
          setSelectedIconIds([])
        }
      }
      if (event.altKey && event.key.toLowerCase() === 'tab') {
        event.preventDefault()
        const visible = state.windows.filter((item) => !item.minimized)
        if (!visible.length) return
        const currentIndex = visible.findIndex((item) => item.instanceId === state.activeWindowId)
        // Shift+Alt+Tab cycles backward, like the real Windows task switcher.
        const step = event.shiftKey ? -1 : 1
        const nextIndex = (currentIndex + step + visible.length) % visible.length
        focusWindow(visible[nextIndex].instanceId)
      }
      if (event.key === 'F5') {
        event.preventDefault()
        refreshDesktop()
      }
      if (isEditableTarget(event.target)) {
        return
      }
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) {
        event.preventDefault()
        const nextId = findNextDesktopIcon(keyboardAnchorIcon, event.key)
        selectDesktopIcon(nextId)
        focusDesktopIcon(nextId)
      }
      if (event.key === 'Enter' && primarySelectedIcon) {
        const icon = allIconDefs.find((item) => item.id === primarySelectedIcon)
        if (icon) {
          event.preventDefault()
          openApp(icon.appId, icon.payload)
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [
    allIconDefs,
    focusWindow,
    findNextDesktopIcon,
    handleCloseWindow,
    openApp,
    keyboardAnchorIcon,
    primarySelectedIcon,
    selectedIconIds.length,
    setStartMenuOpen,
    state.activeWindowId,
    state.desktopIcons,
    state.startMenuOpen,
    state.windows,
  ])

  function taskClick(instanceId: string) {
    const target = state.windows.find((item) => item.instanceId === instanceId)
    if (!target) return
    if (state.activeWindowId === instanceId && !target.minimized) {
      minimizeWindow(instanceId)
    } else {
      focusWindow(instanceId)
    }
  }

  function refreshDesktop() {
    setContextMenu(null)
    setRefreshingDesktop(true)
    window.setTimeout(() => setRefreshingDesktop(false), 260)
  }

  return (
    <main
      className={`os-shell ${state.bootMode === 'safe' ? 'safe-mode' : ''} ${
        displayDriverDegraded ? 'display-driver-missing' : ''
      } ${shellIntroActive ? 'is-shell-starting' : ''}`}
      onPointerDown={() => {
        setStartMenuOpen(false)
        setContextMenu(null)
      }}
    >
      <div
        ref={desktopRef}
        className={`desktop ${refreshingDesktop ? 'is-refreshing' : ''} ${
          displayDriverDegraded ? 'is-display-degraded' : ''
        }`}
        aria-label="Windows 98 portfolio desktop"
        onPointerDown={(event) => {
          const target = event.target as HTMLElement
          setStartMenuOpen(false)
          setContextMenu(null)
          if (
            event.button !== 0 ||
            target.closest('.desktop-icon, .window, .desktop-context-menu')
          ) {
            return
          }
          const point = desktopPoint(event.clientX, event.clientY)
          setSelectionBox({
            pointerId: event.pointerId,
            startX: point.x,
            startY: point.y,
            currentX: point.x,
            currentY: point.y,
            moved: false,
          })
        }}
        onContextMenu={(event) => {
          event.preventDefault()
          const target = event.target as HTMLElement
          const iconButton = target.closest<HTMLButtonElement>('.desktop-icon')
          if (iconButton?.dataset.desktopIconId) {
            selectDesktopIcon(iconButton.dataset.desktopIconId)
          } else {
            setSelectedIconIds([])
          }
          const menuWidth = 210
          const menuHeight = 190
          setStartMenuOpen(false)
          setContextMenu({
            x: Math.max(2, Math.min(event.clientX, window.innerWidth - menuWidth - 2)),
            y: Math.max(2, Math.min(event.clientY, window.innerHeight - menuHeight - 38)),
          })
        }}
      >
        {state.bootMode === 'safe' && (
          <div className="safe-mode-banner" role="status">
            <strong>Safe Mode</strong>
            <span>
              Generic VGA, keyboard &amp; mouse loaded for repair. Networking, sound, and accelerated
              video are disabled.
            </span>
          </div>
        )}
        <div className="desktop-grid">
          {allIconDefs.map((iconDef) => (
            <DesktopIcon
              key={iconDef.id}
              iconDef={iconDef}
              position={iconPositions[iconDef.id] ?? { x: 10, y: 12 }}
              selected={selectedIconIds.includes(iconDef.id)}
              deletable={iconDef.id.startsWith('fs:')}
              highlighted={recycleHover && iconDef.id === 'recycleBin'}
              shortcut={iconDef.id.startsWith('fs:')}
              tooltip={desktopIconTooltip(iconDef, state.fs.nodes)}
              onSelect={(extend) => selectDesktopIcon(iconDef.id, extend)}
              onOpen={() => openApp(iconDef.appId, iconDef.payload)}
              onMove={(id, pos) => {
                if (!autoArrange) moveDesktopIcon(id, pos)
              }}
              onRecycleHoverChange={setRecycleHover}
              onDropOnRecycle={handleDropOnRecycle}
            />
          ))}
        </div>
        {selectionBox?.moved && (
          <div
            className="desktop-selection-box"
            style={{
              left: normalizeRect(selectionBox).left,
              top: normalizeRect(selectionBox).top,
              width: normalizeRect(selectionBox).width,
              height: normalizeRect(selectionBox).height,
            }}
            aria-hidden="true"
          />
        )}
        {orderedWindows.map((windowState) =>
          windowState.minimized ? null : (
            <WindowFrame
              key={windowState.instanceId}
              window={windowState}
              active={state.activeWindowId === windowState.instanceId}
              onFocus={focusWindow}
              onClose={handleCloseWindow}
              onMinimize={minimizeWindow}
              onToggleMaximize={toggleMaximize}
              onMove={moveWindow}
            >
              <Suspense fallback={<div className="window-loading-placeholder">Loading...</div>}>
                {renderAppWindow(windowState, openApp)}
              </Suspense>
            </WindowFrame>
          ),
        )}
        {state.startMenuOpen && (
          <div onPointerDown={(event) => event.stopPropagation()}>
            <StartMenu
              openApp={openApp}
              onRestart={() => restart('normal', { bootProfile: 'warm' })}
              onShutdown={shutDown}
              network={state.network}
            />
          </div>
        )}
        {contextMenu && (
          <DesktopContextMenu
            x={contextMenu.x}
            y={contextMenu.y}
            openApp={(appId, payload) => {
              setContextMenu(null)
              openApp(appId, payload)
            }}
            arrangeMode={arrangeMode}
            autoArrange={autoArrange}
            onRefresh={refreshDesktop}
            onArrangeIcons={() => arrangeIconsBy(arrangeMode)}
            onArrangeBy={arrangeIconsBy}
            onToggleAutoArrange={toggleAutoArrange}
            onLineUpIcons={lineUpIcons}
          />
        )}
        <MessageBoxHost />
        <NotificationHost />
        {shellIntroActive && state.bootMode !== 'safe' && (
          <div className="desktop-startup-loader" aria-live="polite">
            <span className="desktop-startup-loader-icon" aria-hidden="true"></span>
            <span>Loading Windows settings...</span>
          </div>
        )}
        {!shellIntroActive && <BootDisclaimer />}
      </div>
      <Taskbar
        windows={state.windows}
        activeWindowId={state.activeWindowId}
        startOpen={state.startMenuOpen}
        timeLabel={formatClock(clockDate)}
        clockDate={clockDate}
        network={state.network}
        audioEnabled={state.audio.enabled}
        audioMuted={state.audio.muted}
        audioVolume={state.audio.volume}
        onToggleStart={() => setStartMenuOpen(!state.startMenuOpen)}
        onTaskClick={taskClick}
        onToggleNetwork={() => openApp('network')}
        onToggleMute={() => {
          if (!state.audio.enabled) {
            enableAudio()
          } else {
            setAudioMuted(!state.audio.muted)
          }
        }}
        onSetVolume={setAudioVolume}
        onTaskRestore={focusWindow}
        onTaskMinimize={minimizeWindow}
        onTaskToggleMaximize={toggleMaximize}
        onTaskClose={handleCloseWindow}
        onMinimizeAll={() => {
          state.windows.filter((window) => !window.minimized).forEach((window) => minimizeWindow(window.instanceId))
        }}
        onOpenTaskManager={() => openApp('taskManager')}
        onOpenTaskbarProperties={() => openApp('controlPanel', { controlPanelSection: 'display' })}
      />
      {state.appearanceEffects.mouseTrails && <MouseTrails />}
    </main>
  )
}

function App() {
  const { state, restart } = useOs()

  switch (state.phase) {
    case 'boot':
      return <BootScreen />
    case 'biosSetup':
      return <BiosSetupScreen />
    case 'bootMenu':
      return <BootMenu />
    case 'desktop':
      return <Desktop />
    case 'dosOnly':
      return (
        <main className="dos-only-screen">
          <TerminalApp windowId="dos-only" payload={{ path: 'C:\\' }} />
        </main>
      )
    case 'recovery':
      return <RecoveryConsole />
    case 'crashed':
      return <CrashScreen crash={state.crash ?? {
        title: 'Windows protection error',
        message: 'Windows could not continue.',
        detail: 'A simulated fatal exception occurred.',
        stopCode: '0E : 0028 : C0011E36',
        crashedAt: new Date().toLocaleString(),
      }} onRestart={() => restart('normal', { bootProfile: 'warm' })} />
    case 'loadFailed':
      return <LoadFailureScreen />
    case 'safetyTraining':
      return <SafetyTrainingScreen />
    case 'startupScan':
      return <StartupScanScreen />
    case 'shutdown':
      return <ShutdownScreen />
    default:
      return <Desktop />
  }
}

export default App
