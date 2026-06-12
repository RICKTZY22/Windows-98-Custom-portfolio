import { useCallback, useEffect, useMemo, useState } from 'react'
import './App.css'
import { appDefinitions, desktopAppIds } from './data/apps'
import type {
  AppId,
  ControlPanelSectionId,
  DeletedFileEntry,
  DesktopIconPosition,
  FileSystemNode,
  NetworkStatus,
  SystemCrashState,
  WindowPayload,
  WindowRect,
  WindowState,
} from './types'
import { AboutApp } from './components/apps/AboutApp'
import { BootScreen } from './components/BootScreen'
import { CalculatorApp } from './components/apps/CalculatorApp'
import { ComputerApp } from './components/apps/ComputerApp'
import { ContactApp } from './components/apps/ContactApp'
import { ControlPanelApp } from './components/apps/ControlPanelApp'
import { CrashScreen } from './components/CrashScreen'
import { CreditsApp } from './components/apps/CreditsApp'
import { DesktopContextMenu } from './components/DesktopContextMenu'
import { DesktopIcon } from './components/DesktopIcon'
import { InternetExplorerApp } from './components/apps/InternetExplorerApp'
import { NetworkApp } from './components/apps/NetworkApp'
import { NotepadApp } from './components/apps/NotepadApp'
import { PaintApp } from './components/apps/PaintApp'
import { ProjectDetailsApp } from './components/apps/ProjectDetailsApp'
import { ProjectsApp } from './components/apps/ProjectsApp'
import { RecycleBinApp } from './components/apps/RecycleBinApp'
import { ResumeApp } from './components/apps/ResumeApp'
import { RunDialogApp } from './components/apps/RunDialogApp'
import { StartMenu } from './components/StartMenu'
import { SoundRecorderApp } from './components/apps/SoundRecorderApp'
import { SystemPropertiesApp } from './components/apps/SystemPropertiesApp'
import { Taskbar } from './components/Taskbar'
import { TaskManagerApp } from './components/apps/TaskManagerApp'
import { TerminalApp } from './components/apps/TerminalApp'
import { ThemesApp } from './components/apps/ThemesApp'
import { WindowFrame } from './components/WindowFrame'
import { getNode, isCriticalSystemPath } from './data/filesystem'
import { portfolioData } from './data/portfolioData'
import { controlPanelSections, defaultNetworkStatus } from './data/system'

const bootDurationMs = 10000
const desktopTaskbarHeight = 33
const desktopIconWidth = 88
const desktopIconHeight = 80
const desktopIconGapX = 8
const desktopIconGapY = 6

type DesktopIconPositionMap = Partial<Record<AppId, DesktopIconPosition>>

function createInstanceId(appId: AppId, singleton: boolean, payload?: WindowPayload) {
  if (appId === 'projectDetails' && payload?.projectId) {
    return `${appId}-${payload.projectId}`
  }
  if (appId === 'controlPanel' && payload?.controlPanelSection) {
    return `${appId}-${payload.controlPanelSection}`
  }
  if (appId === 'computer' && payload?.path) {
    return `${appId}-${payload.path}`
  }
  if (singleton) {
    return appId
  }
  return `${appId}-${Date.now()}-${Math.round(Math.random() * 1000)}`
}

function clampInitialRect(rect: WindowRect, offset: number): WindowRect {
  const width = Math.min(rect.width, window.innerWidth - 20)
  const height = Math.min(rect.height, window.innerHeight - 56)
  const maxX = Math.max(8, window.innerWidth - width - 8)
  const maxY = Math.max(8, window.innerHeight - height - 46)

  return {
    width,
    height,
    x: Math.max(8, Math.min(rect.x + offset, maxX)),
    y: Math.max(8, Math.min(rect.y + offset, maxY)),
  }
}

function formatClock(date: Date) {
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}

function clampDesktopIconPosition(position: DesktopIconPosition): DesktopIconPosition {
  const desktopWidth = window.innerWidth
  const desktopHeight = Math.max(160, window.innerHeight - desktopTaskbarHeight)

  return {
    x: Math.max(4, Math.min(position.x, desktopWidth - desktopIconWidth - 4)),
    y: Math.max(4, Math.min(position.y, desktopHeight - desktopIconHeight - 4)),
  }
}

function createDefaultDesktopIconPositions(): DesktopIconPositionMap {
  const desktopWidth = window.innerWidth
  const desktopHeight = Math.max(160, window.innerHeight - desktopTaskbarHeight)
  const isNarrow = desktopWidth <= 720
  const positions: DesktopIconPositionMap = {}

  if (isNarrow) {
    const columnCount = Math.min(3, desktopAppIds.length)
    const gridWidth = columnCount * desktopIconWidth + (columnCount - 1) * desktopIconGapX
    const startX = Math.max(8, Math.floor((desktopWidth - gridWidth) / 2))

    desktopAppIds.forEach((appId, index) => {
      const column = index % columnCount
      const row = Math.floor(index / columnCount)
      positions[appId] = clampDesktopIconPosition({
        x: startX + column * (desktopIconWidth + desktopIconGapX),
        y: 8 + row * (desktopIconHeight + desktopIconGapY),
      })
    })

    return positions
  }

  const rowsPerColumn = Math.max(1, Math.floor((desktopHeight - 24) / (desktopIconHeight + desktopIconGapY)))
  desktopAppIds.forEach((appId, index) => {
    const column = Math.floor(index / rowsPerColumn)
    const row = index % rowsPerColumn
    positions[appId] = clampDesktopIconPosition({
      x: 10 + column * (desktopIconWidth + desktopIconGapX),
      y: 12 + row * (desktopIconHeight + desktopIconGapY),
    })
  })

  return positions
}

function normalizeDesktopIconPositions(current: DesktopIconPositionMap): DesktopIconPositionMap {
  const defaults = createDefaultDesktopIconPositions()
  const next: DesktopIconPositionMap = {}

  desktopAppIds.forEach((appId) => {
    next[appId] = clampDesktopIconPosition(current[appId] ?? defaults[appId] ?? { x: 10, y: 12 })
  })

  return next
}

function titleFor(appId: AppId, payload?: WindowPayload) {
  const definition = appDefinitions[appId]
  if (appId === 'projectDetails') {
    return portfolioData.projects.find((project) => project.id === payload?.projectId)?.name ?? definition.title
  }
  if (appId === 'computer' && payload?.path) {
    return payload.path === 'C:\\' ? 'My Computer' : `Exploring - ${payload.path}`
  }
  if ((appId === 'documents' || appId === 'pictures') && payload?.path) {
    return `Exploring - ${payload.path}`
  }
  if (appId === 'notepad' && payload?.filePath) {
    return `${getNode(payload.filePath)?.name ?? 'Untitled'} - Notepad`
  }
  if (appId === 'resume' && payload?.filePath) {
    return getNode(payload.filePath)?.name ?? definition.title
  }
  if (appId === 'controlPanel' && payload?.controlPanelSection) {
    const section = controlPanelSections.find((item) => item.id === payload.controlPanelSection)
    return section ? `${section.title} Properties` : definition.title
  }
  return definition.title
}

function App() {
  const [bootPhase, setBootPhase] = useState<'booting' | 'desktop'>('booting')
  const [selectedDesktopApp, setSelectedDesktopApp] = useState<AppId>('computer')
  const [startOpen, setStartOpen] = useState(false)
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null)
  const [refreshingDesktop, setRefreshingDesktop] = useState(false)
  const [desktopIconPositions, setDesktopIconPositions] = useState<DesktopIconPositionMap>(() =>
    createDefaultDesktopIconPositions(),
  )
  const [windows, setWindows] = useState<WindowState[]>([])
  const [activeWindowId, setActiveWindowId] = useState<string>()
  const [clock, setClock] = useState(() => formatClock(new Date()))
  const [zCounter, setZCounter] = useState(20)
  const [network, setNetwork] = useState<NetworkStatus>(defaultNetworkStatus)
  const [deletedItems, setDeletedItems] = useState<DeletedFileEntry[]>([])
  const [systemCrash, setSystemCrash] = useState<SystemCrashState | null>(null)

  const orderedWindows = useMemo(() => [...windows].sort((a, b) => a.zIndex - b.zIndex), [windows])
  const deletedPathSet = useMemo(() => new Set(deletedItems.map((item) => item.path)), [deletedItems])

  const focusWindow = useCallback(
    (instanceId: string) => {
      const nextZ = zCounter + 1
      setZCounter(nextZ)
      setActiveWindowId(instanceId)
      setWindows((current) =>
        current.map((item) =>
          item.instanceId === instanceId ? { ...item, minimized: false, zIndex: nextZ } : item,
        ),
      )
    },
    [zCounter],
  )

  useEffect(() => {
    const interval = window.setInterval(() => setClock(formatClock(new Date())), 1000)
    return () => window.clearInterval(interval)
  }, [])

  useEffect(() => {
    function handleResize() {
      setDesktopIconPositions((current) => normalizeDesktopIconPositions(current))
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    if (bootPhase !== 'booting') {
      return
    }
    const timeout = window.setTimeout(() => setBootPhase('desktop'), bootDurationMs)
    return () => window.clearTimeout(timeout)
  }, [bootPhase])

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setStartOpen(false)
      }

      if (event.altKey && event.key.toLowerCase() === 'tab') {
        event.preventDefault()
        const visibleWindows = windows.filter((item) => !item.minimized)
        if (!visibleWindows.length) {
          return
        }
        const currentIndex = visibleWindows.findIndex((item) => item.instanceId === activeWindowId)
        const next = visibleWindows[(currentIndex + 1) % visibleWindows.length]
        focusWindow(next.instanceId)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [activeWindowId, focusWindow, windows])

  function openApp(appId: AppId, payload?: WindowPayload) {
    const definition = appDefinitions[appId]
    const singleton = definition.singleton !== false
    const instanceId = createInstanceId(appId, singleton, payload)
    const existing = windows.find((item) => item.instanceId === instanceId)
    setStartOpen(false)

    if (existing) {
      focusWindow(instanceId)
      return
    }

    const nextZ = zCounter + 1
    const rect = clampInitialRect(definition.defaultRect, windows.length * 18)

    setZCounter(nextZ)
    setWindows((current) => [
      ...current,
      {
        instanceId,
        appId,
        title: titleFor(appId, payload),
        icon: definition.icon,
        zIndex: nextZ,
        minimized: false,
        maximized: false,
        payload,
        ...rect,
      },
    ])
    setActiveWindowId(instanceId)
  }

  function closeWindow(instanceId: string) {
    setWindows((current) => current.filter((item) => item.instanceId !== instanceId))
    setActiveWindowId((current) => {
      if (current !== instanceId) {
        return current
      }
      const nextWindow = windows
        .filter((item) => item.instanceId !== instanceId && !item.minimized)
        .sort((a, b) => b.zIndex - a.zIndex)[0]
      return nextWindow?.instanceId
    })
  }

  function minimizeWindow(instanceId: string) {
    setWindows((current) =>
      current.map((item) => (item.instanceId === instanceId ? { ...item, minimized: true } : item)),
    )
    setActiveWindowId((current) => (current === instanceId ? undefined : current))
  }

  function toggleMaximize(instanceId: string) {
    focusWindow(instanceId)
    setWindows((current) =>
      current.map((item) => {
        if (item.instanceId !== instanceId) {
          return item
        }
        if (item.maximized && item.previousRect) {
          return { ...item, maximized: false, ...item.previousRect, previousRect: undefined }
        }
        return {
          ...item,
          maximized: true,
          previousRect: { x: item.x, y: item.y, width: item.width, height: item.height },
        }
      }),
    )
  }

  function moveWindow(instanceId: string, rect: WindowRect) {
    setWindows((current) =>
      current.map((item) => (item.instanceId === instanceId ? { ...item, ...rect } : item)),
    )
  }

  const moveDesktopIcon = useCallback((appId: AppId, position: DesktopIconPosition) => {
    setDesktopIconPositions((current) => ({
      ...current,
      [appId]: clampDesktopIconPosition(position),
    }))
  }, [])

  function handleTaskClick(instanceId: string) {
    const target = windows.find((item) => item.instanceId === instanceId)
    if (!target) {
      return
    }
    if (activeWindowId === instanceId && !target.minimized) {
      minimizeWindow(instanceId)
      return
    }
    focusWindow(instanceId)
  }

  function restart() {
    if (systemCrash) {
      setDeletedItems([])
      setSystemCrash(null)
    }
    setStartOpen(false)
    setContextMenu(null)
    setWindows([])
    setActiveWindowId(undefined)
    setBootPhase('booting')
  }

  function refreshDesktop() {
    setContextMenu(null)
    setRefreshingDesktop(true)
    window.setTimeout(() => setRefreshingDesktop(false), 260)
  }

  function arrangeDesktopIcons() {
    setContextMenu(null)
    setDesktopIconPositions(createDefaultDesktopIconPositions())
  }

  function deleteFileSystemNode(node: FileSystemNode) {
    const critical = isCriticalSystemPath(node.path)
    const entry: DeletedFileEntry = {
      path: node.path,
      name: node.name,
      kind: node.kind,
      icon: node.icon,
      fileType: node.fileType,
      deletedAt: new Date().toLocaleString([], {
        hour: 'numeric',
        minute: '2-digit',
        second: '2-digit',
        month: '2-digit',
        day: '2-digit',
        year: 'numeric',
      }),
      critical,
    }

    setDeletedItems((current) => [entry, ...current.filter((item) => item.path !== node.path)])

    if (critical) {
      setStartOpen(false)
      setContextMenu(null)
      setWindows([])
      setActiveWindowId(undefined)
      setSystemCrash({
        path: node.path,
        title: 'Windows protection error',
        message: 'The system has become unstable because a required system component was removed.',
        detail: 'Explorer, networking, display drivers, and shell services cannot continue.',
        stopCode: '0E : 0028 : C0011E36',
        crashedAt: new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', second: '2-digit' }),
      })
    }
  }

  function restoreDeletedItem(path: string) {
    setDeletedItems((current) => current.filter((item) => item.path !== path))
  }

  function renderWindowContent(windowState: WindowState) {
    switch (windowState.appId) {
      case 'about':
        return <AboutApp />
      case 'projects':
        return <ProjectsApp openApp={openApp} />
      case 'projectDetails':
        return <ProjectDetailsApp projectId={windowState.payload?.projectId} />
      case 'resume':
        return <ResumeApp filePath={windowState.payload?.filePath} />
      case 'contact':
        return <ContactApp />
      case 'computer':
        return (
          <ComputerApp
            path={windowState.payload?.path}
            openApp={openApp}
            deletedPaths={deletedPathSet}
            onDeleteNode={deleteFileSystemNode}
          />
        )
      case 'documents':
        return (
          <ComputerApp
            path="C:\\My Documents"
            openApp={openApp}
            deletedPaths={deletedPathSet}
            onDeleteNode={deleteFileSystemNode}
          />
        )
      case 'pictures':
        return (
          <ComputerApp
            path="C:\\My Pictures"
            openApp={openApp}
            deletedPaths={deletedPathSet}
            onDeleteNode={deleteFileSystemNode}
          />
        )
      case 'notepad':
        return <NotepadApp filePath={windowState.payload?.filePath} />
      case 'calculator':
        return <CalculatorApp />
      case 'soundRecorder':
        return <SoundRecorderApp />
      case 'internetExplorer':
        return <InternetExplorerApp openApp={openApp} />
      case 'terminal':
        return (
          <TerminalApp
            path={windowState.payload?.path}
            network={network}
            setNetwork={setNetwork}
            openApp={openApp}
            deletedPaths={deletedPathSet}
          />
        )
      case 'controlPanel':
        return (
          <ControlPanelApp
            section={windowState.payload?.controlPanelSection as ControlPanelSectionId | undefined}
            openApp={openApp}
          />
        )
      case 'paint':
        return <PaintApp />
      case 'network':
        return <NetworkApp network={network} setNetwork={setNetwork} />
      case 'run':
        return <RunDialogApp openApp={openApp} />
      case 'systemProperties':
        return <SystemPropertiesApp windows={windows} network={network} />
      case 'taskManager':
        return <TaskManagerApp windows={windows} network={network} />
      case 'recycleBin':
        return <RecycleBinApp deletedItems={deletedItems} onRestore={restoreDeletedItem} />
      case 'credits':
        return <CreditsApp />
      case 'themes':
        return <ThemesApp />
      default:
        return null
    }
  }

  if (bootPhase !== 'desktop') {
    return <BootScreen durationMs={bootDurationMs} />
  }

  if (systemCrash) {
    return <CrashScreen crash={systemCrash} onRestart={restart} />
  }

  return (
    <main
      className="os-shell"
      onPointerDown={() => {
        setStartOpen(false)
        setContextMenu(null)
      }}
    >
      <div
        className={`desktop ${refreshingDesktop ? 'is-refreshing' : ''}`}
        aria-label="Windows 98 portfolio desktop"
        onContextMenu={(event) => {
          event.preventDefault()
          const menuWidth = 210
          const menuHeight = 190
          setStartOpen(false)
          setContextMenu({
            x: Math.max(2, Math.min(event.clientX, window.innerWidth - menuWidth - 2)),
            y: Math.max(2, Math.min(event.clientY, window.innerHeight - menuHeight - 38)),
          })
        }}
      >
        <div className="desktop-grid">
          {desktopAppIds.map((appId) => {
            const app = appDefinitions[appId]
            return (
              <DesktopIcon
                key={appId}
                app={app}
                position={desktopIconPositions[appId] ?? { x: 10, y: 12 }}
                selected={selectedDesktopApp === appId}
                onSelect={() => setSelectedDesktopApp(appId)}
                onOpen={() => openApp(appId)}
                onMove={moveDesktopIcon}
              />
            )
          })}
        </div>
        {orderedWindows.map((windowState) =>
          windowState.minimized ? null : (
            <WindowFrame
              key={windowState.instanceId}
              window={windowState}
              active={activeWindowId === windowState.instanceId}
              onFocus={focusWindow}
              onClose={closeWindow}
              onMinimize={minimizeWindow}
              onToggleMaximize={toggleMaximize}
              onMove={moveWindow}
            >
              {renderWindowContent(windowState)}
            </WindowFrame>
          ),
        )}
        {startOpen && (
          <div onPointerDown={(event) => event.stopPropagation()}>
            <StartMenu openApp={openApp} onRestart={restart} network={network} />
          </div>
        )}
        {contextMenu && (
          <DesktopContextMenu
            x={contextMenu.x}
            y={contextMenu.y}
            openApp={openApp}
            onRefresh={refreshDesktop}
            onArrangeIcons={arrangeDesktopIcons}
          />
        )}
      </div>
      <Taskbar
        windows={windows}
        activeWindowId={activeWindowId}
        startOpen={startOpen}
        timeLabel={clock}
        network={network}
        onToggleStart={() => setStartOpen((value) => !value)}
        onTaskClick={handleTaskClick}
      />
    </main>
  )
}

export default App
