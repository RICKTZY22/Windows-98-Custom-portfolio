import { useEffect, useMemo, useRef, useState } from 'react'
import './App.css'
import { desktopIconDefs } from './data/apps'
import {
  bootMenuOptions,
  bootMenuTitle,
  bootMenuUnhealthyWarning,
  osCreditLine,
  osCreditName,
  osProductName,
  osCreditYear,
  shutdownLines,
} from './data/system'
import { win98Icons } from './data/icons'
import type { AppId, WindowPayload, WindowState } from './types'
import { useOs } from './os/useOs'
import { isSystemHealthy, missingSystemFiles, restoreSystemFiles } from './os/recovery'
import { AboutApp } from './components/apps/AboutApp'
import { BootScreen } from './components/BootScreen'
import { CalculatorApp } from './components/apps/CalculatorApp'
import { ContactApp } from './components/apps/ContactApp'
import { ControlPanelApp } from './components/apps/ControlPanelApp'
import { CrashScreen } from './components/CrashScreen'
import { CreditsApp } from './components/apps/CreditsApp'
import { DesktopContextMenu } from './components/DesktopContextMenu'
import { DesktopIcon } from './components/DesktopIcon'
import { ExplorerApp } from './components/apps/ExplorerApp'
import { InternetExplorerApp } from './components/apps/InternetExplorerApp'
import { MediaPlayerApp } from './components/apps/MediaPlayerApp'
import { NetworkApp } from './components/apps/NetworkApp'
import { NotepadApp } from './components/apps/NotepadApp'
import { PaintApp } from './components/apps/PaintApp'
import { ProjectDetailsApp } from './components/apps/ProjectDetailsApp'
import { ProjectsApp } from './components/apps/ProjectsApp'
import { RecycleBinApp } from './components/apps/RecycleBinApp'
import { RunDialogApp } from './components/apps/RunDialogApp'
import { SoundRecorderApp } from './components/apps/SoundRecorderApp'
import { StartMenu } from './components/StartMenu'
import { Taskbar } from './components/Taskbar'
import { TaskManagerApp } from './components/apps/TaskManagerApp'
import { TerminalApp } from './components/apps/TerminalApp'
import { WindowFrame } from './components/WindowFrame'
import { WordPadApp } from './components/apps/WordPadApp'

const bootDurationMs = 18000

function formatClock(date: Date) {
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
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
    case 'paint':
      return <PaintApp {...props} />
    case 'internetExplorer':
      return <InternetExplorerApp {...props} />
    case 'mediaPlayer':
      return <MediaPlayerApp key={win.payload?.filePath ?? win.payload?.url ?? win.instanceId} {...props} />
    case 'soundRecorder':
      return <SoundRecorderApp />
    case 'controlPanel':
      return <ControlPanelApp key={win.payload?.controlPanelSection ?? 'controlPanel'} {...props} />
    case 'network':
      return <NetworkApp />
    case 'run':
      return <RunDialogApp />
    case 'taskManager':
      return <TaskManagerApp />
    case 'calculator':
      return <CalculatorApp />
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

function BootMenu() {
  const { state, restart } = useOs()
  const [selected, setSelected] = useState(0)
  const unhealthy = !isSystemHealthy(state.fs)

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'ArrowDown') {
        event.preventDefault()
        setSelected((current) => (current + 1) % bootMenuOptions.length)
      }
      if (event.key === 'ArrowUp') {
        event.preventDefault()
        setSelected((current) => (current - 1 + bootMenuOptions.length) % bootMenuOptions.length)
      }
      if (event.key === 'Enter') {
        event.preventDefault()
        restart(bootMenuOptions[selected].id)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [restart, selected])

  return (
    <main className="boot-menu-screen">
      <section className="boot-menu-panel">
        <h1>{bootMenuTitle}</h1>
        <p>Use the arrow keys to highlight your choice.</p>
        {unhealthy && <p className="boot-warning">{bootMenuUnhealthyWarning}</p>}
        <ol>
          {bootMenuOptions.map((option, index) => (
            <li key={option.id}>
              <button
                type="button"
                className={selected === index ? 'selected' : ''}
                onMouseEnter={() => setSelected(index)}
                onClick={() => restart(option.id)}
              >
                {index + 1}. {option.label}
              </button>
            </li>
          ))}
        </ol>
        <p className="boot-muted">Enter a choice: {selected + 1}</p>
      </section>
    </main>
  )
}

const recoveryOptions = [
  { id: 1, label: 'Scan for missing system files' },
  { id: 2, label: 'Restore missing system files (ScanReg /Restore)' },
  { id: 3, label: 'Verify protected system files (SFC /SCANNOW)' },
  { id: 4, label: 'Display disk information' },
] as const

function RecoveryConsole() {
  const { state, fsOps, restart, playSound } = useOs()
  const [choice, setChoice] = useState(1)
  const [output, setOutput] = useState<string[]>([])
  const missing = missingSystemFiles(state.fs)
  const choiceRef = useRef(choice)
  useEffect(() => {
    choiceRef.current = choice
  }, [choice])

  function runChoice(id: number) {
    if (id === 1) {
      setOutput(
        missing.length
          ? ['Scanning C:\\WINDOWS for required system files...', '', ...missing.map((path) => `MISSING   ${path}`), '', `${missing.length} file(s) must be restored before Windows can start.`]
          : ['Scanning C:\\WINDOWS for required system files...', '', 'No missing system files were found.', 'Windows should start normally.'],
      )
      return
    }
    if (id === 2) {
      if (!missing.length) {
        setOutput(['Nothing to restore. All required system files are present.'])
        return
      }
      const result = restoreSystemFiles(state.fs)
      fsOps.replaceFs(result.fs)
      playSound('ding')
      setOutput([
        'Restoring system files from registry backup RB000.CAB...',
        '',
        ...result.restored.map((path) => `RESTORED  ${path}`),
        '',
        `${result.restored.length} file(s) restored successfully.`,
        'Windows has fixed your registry. Press Esc, then choose Normal to start Windows.',
      ])
      return
    }
    if (id === 3) {
      setOutput(
        missing.length
          ? ['Verifying the integrity of all protected system files...', '', ...missing.map((path) => `CORRUPT   ${path}`), '', 'Integrity violations found. Run option 2 to repair.']
          : ['Verifying the integrity of all protected system files...', '', 'Windows resource protection did not find any integrity violations.'],
      )
      return
    }
    setOutput([
      'Current fixed disk drive: 1',
      '',
      'Partition   Status   Type      Volume Label   Mbytes   System   Usage',
      ' C: 1          A      PRI DOS   PORTFOLIO       2047    FAT16     100%',
      '',
      'Total fixed disk space is 2047 Mbytes (1 Mbyte = 1048576 bytes)',
    ])
  }

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault()
        restart('bootMenu')
        return
      }
      if (event.key >= '1' && event.key <= '4') {
        choiceRef.current = Number(event.key)
        setChoice(Number(event.key))
        return
      }
      if (event.key === 'ArrowDown') {
        event.preventDefault()
        setChoice((current) => (current % recoveryOptions.length) + 1)
        return
      }
      if (event.key === 'ArrowUp') {
        event.preventDefault()
        setChoice((current) => ((current + recoveryOptions.length - 2) % recoveryOptions.length) + 1)
        return
      }
      if (event.key === 'Enter') {
        event.preventDefault()
        runChoice(choiceRef.current)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.fs, restart])

  return (
    <main className="fdisk-screen">
      <header className="fdisk-header">
        <p>{osProductName}</p>
        <p>System Recovery Program</p>
        <p>{osCreditLine}</p>
      </header>
      <p className="fdisk-title">RECOVERY Options</p>
      <div className="fdisk-body">
        <p>Current fixed disk drive: 1</p>
        <p>System status: {missing.length ? `${missing.length} required file(s) missing` : 'healthy'}</p>
        <p>&nbsp;</p>
        <p>Choose one of the following:</p>
        <ol className="fdisk-options">
          {recoveryOptions.map((option) => (
            <li key={option.id}>
              <button
                type="button"
                className={choice === option.id ? 'selected' : ''}
                onMouseEnter={() => setChoice(option.id)}
                onClick={() => {
                  setChoice(option.id)
                  runChoice(option.id)
                }}
              >
                {option.id}. {option.label}
              </button>
            </li>
          ))}
        </ol>
        <p className="fdisk-choice">
          Enter choice: [{choice}]<span className="fdisk-cursor" aria-hidden="true" />
        </p>
        {output.length > 0 && <pre className="fdisk-output">{output.join('\n')}</pre>}
      </div>
      <footer className="fdisk-footer">
        <p>
          Press <b>Esc</b> to exit Recovery and return to the Startup Menu
        </p>
      </footer>
    </main>
  )
}

function ShutdownScreen() {
  const { restart, playSound } = useOs()
  const [stage, setStage] = useState<'wait' | 'crt' | 'safe'>('wait')

  useEffect(() => {
    playSound('shutdown')
    const crtTimer = window.setTimeout(() => setStage('crt'), 2400)
    const safeTimer = window.setTimeout(() => setStage('safe'), 2950)
    return () => {
      window.clearTimeout(crtTimer)
      window.clearTimeout(safeTimer)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (stage === 'wait') {
    return (
      <main className="shutdown-screen shutdown-wait">
        <div className="shutdown-wait-card">
          <img src={win98Icons.windows} alt="" />
          <h1>{osProductName}</h1>
          <p className="shutdown-dots">Windows is shutting down</p>
        </div>
      </main>
    )
  }

  if (stage === 'crt') {
    return (
      <main className="shutdown-screen">
        <div className="crt-off" aria-hidden="true" />
      </main>
    )
  }

  return (
    <main className="shutdown-screen shutdown-safe">
      <div className="shutdown-safe-copy">
        {shutdownLines.map((line) => (
          <p key={line}>{line}</p>
        ))}
        <p className="shutdown-credit">
          {osCreditName} - {osCreditYear}
        </p>
        <button type="button" onClick={() => restart('normal')}>
          Turn on again
        </button>
      </div>
    </main>
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
    arrangeDesktopIcons,
    restart,
    shutDown,
    enableAudio,
    setAudioMuted,
  } = useOs()
  const [selectedIcon, setSelectedIcon] = useState(desktopIconDefs[0]?.id ?? 'myComputer')
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null)
  const [refreshingDesktop, setRefreshingDesktop] = useState(false)
  const [clock, setClock] = useState(() => formatClock(new Date()))
  const orderedWindows = useMemo(() => [...state.windows].sort((a, b) => a.zIndex - b.zIndex), [state.windows])

  useEffect(() => {
    const interval = window.setInterval(() => setClock(formatClock(new Date())), 1000)
    return () => window.clearInterval(interval)
  }, [])

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setStartMenuOpen(false)
        setContextMenu(null)
      }
      if (event.altKey && event.key.toLowerCase() === 'tab') {
        event.preventDefault()
        const visible = state.windows.filter((item) => !item.minimized)
        if (!visible.length) return
        const currentIndex = visible.findIndex((item) => item.instanceId === state.activeWindowId)
        focusWindow(visible[(currentIndex + 1) % visible.length].instanceId)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [focusWindow, setStartMenuOpen, state.activeWindowId, state.windows])

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
      className={`os-shell ${state.bootMode === 'safe' ? 'safe-mode' : ''}`}
      onPointerDown={() => {
        setStartMenuOpen(false)
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
          setStartMenuOpen(false)
          setContextMenu({
            x: Math.max(2, Math.min(event.clientX, window.innerWidth - menuWidth - 2)),
            y: Math.max(2, Math.min(event.clientY, window.innerHeight - menuHeight - 38)),
          })
        }}
      >
        {state.bootMode === 'safe' && <div className="safe-mode-banner">Safe Mode</div>}
        <div className="desktop-grid">
          {desktopIconDefs.map((iconDef) => (
            <DesktopIcon
              key={iconDef.id}
              iconDef={iconDef}
              position={state.desktopIcons[iconDef.id] ?? { x: 10, y: 12 }}
              selected={selectedIcon === iconDef.id}
              onSelect={() => setSelectedIcon(iconDef.id)}
              onOpen={() => openApp(iconDef.appId, iconDef.payload)}
              onMove={moveDesktopIcon}
            />
          ))}
        </div>
        {orderedWindows.map((windowState) =>
          windowState.minimized ? null : (
            <WindowFrame
              key={windowState.instanceId}
              window={windowState}
              active={state.activeWindowId === windowState.instanceId}
              onFocus={focusWindow}
              onClose={closeWindow}
              onMinimize={minimizeWindow}
              onToggleMaximize={toggleMaximize}
              onMove={moveWindow}
            >
              {renderAppWindow(windowState, openApp)}
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
            openApp={openApp}
            onRefresh={refreshDesktop}
            onArrangeIcons={() => {
              arrangeDesktopIcons()
              setContextMenu(null)
            }}
          />
        )}
        <MessageBoxHost />
      </div>
      <Taskbar
        windows={state.windows}
        activeWindowId={state.activeWindowId}
        startOpen={state.startMenuOpen}
        timeLabel={clock}
        network={state.network}
        audioEnabled={state.audio.enabled}
        audioMuted={state.audio.muted}
        onToggleStart={() => setStartMenuOpen(!state.startMenuOpen)}
        onTaskClick={taskClick}
        onToggleNetwork={() => openApp('network')}
        onToggleAudio={() => {
          if (!state.audio.enabled) {
            enableAudio()
          } else {
            setAudioMuted(!state.audio.muted)
          }
        }}
      />
    </main>
  )
}

function App() {
  const { state, restart } = useOs()

  switch (state.phase) {
    case 'boot':
      return <BootScreen durationMs={state.bootProfile === 'warm' ? 6000 : bootDurationMs} />
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
      }} onRestart={() => restart('bootMenu')} />
    case 'shutdown':
      return <ShutdownScreen />
    default:
      return <Desktop />
  }
}

export default App
