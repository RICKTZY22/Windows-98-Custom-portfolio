import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { desktopIconDefs } from './data/apps'
import {
  biosSetupSections,
  bootDeviceDosNames,
  bootDeviceLabels,
  bootDeviceShortLabels,
  bootSequenceLabel,
  defaultBiosSettings,
  enabledBootDevices,
  haltOnLabels,
  moveBootDevice,
} from './data/bios'
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
import type { AppId, BiosSettings, BootDeviceId, DesktopIconDef, FsNode, Point, WindowPayload, WindowState } from './types'
import { useOs } from './os/useOs'
import { DESKTOP_FOLDER, getNode, openTargetFor } from './os/filesystem'
import { isSystemHealthy, missingSystemFiles, restoreSystemFiles } from './os/recovery'
import { BootScreen } from './components/system/BootScreen'
import { CrashScreen } from './components/system/CrashScreen'
import { DesktopContextMenu } from './components/shell/DesktopContextMenu'
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
const RunDialogApp = lazy(() => import('./components/apps/RunDialogApp').then((m) => ({ default: m.RunDialogApp })))
const SoundRecorderApp = lazy(() =>
  import('./components/apps/SoundRecorderApp').then((m) => ({ default: m.SoundRecorderApp })),
)
const TaskManagerApp = lazy(() => import('./components/apps/TaskManagerApp').then((m) => ({ default: m.TaskManagerApp })))
const TerminalApp = lazy(() => import('./components/apps/TerminalApp').then((m) => ({ default: m.TerminalApp })))
const VideoPlayerApp = lazy(() => import('./components/apps/VideoPlayerApp').then((m) => ({ default: m.VideoPlayerApp })))
const WordPadApp = lazy(() => import('./components/apps/WordPadApp').then((m) => ({ default: m.WordPadApp })))

const desktopIconWidth = 88
const desktopIconHeight = 80
const desktopIconGapX = 8
const desktopIconGapY = 12

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

function normalizeRect(box: Pick<SelectionBox, 'startX' | 'startY' | 'currentX' | 'currentY'>) {
  const left = Math.min(box.startX, box.currentX)
  const top = Math.min(box.startY, box.currentY)
  const right = Math.max(box.startX, box.currentX)
  const bottom = Math.max(box.startY, box.currentY)
  return { left, top, right, bottom, width: right - left, height: bottom - top }
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
      return <RunDialogApp />
    case 'taskManager':
      return <TaskManagerApp />
    case 'calculator':
      return <CalculatorApp />
    case 'minesweeper':
      return <MinesweeperApp />
    case 'dosGame':
      return <JsDosGameApp {...props} />
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
        restart(bootMenuOptions[selected].id, { bootProfile: 'warm' })
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
                onClick={() => restart(option.id, { bootProfile: 'warm' })}
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

type BiosRow = {
  label: string
  value: string
  hint?: string
  onChange?: () => void
  onPrevious?: () => void
  onNext?: () => void
}

function yesNo(value: boolean): string {
  return value ? 'Enabled' : 'Disabled'
}

function bootDeviceEnabled(settings: BiosSettings, device: BootDeviceId): boolean {
  if (device === 'floppy') return settings.floppyEnabled
  if (device === 'cdrom') return settings.cdromEnabled
  if (device === 'network') return settings.networkBootEnabled
  return true
}

function BiosSetupScreen() {
  const { state, setBiosSettings, restart } = useOs()
  const [draft, setDraft] = useState<BiosSettings>(state.bios)
  const [sectionIndex, setSectionIndex] = useState(0)
  const [rowIndex, setRowIndex] = useState(0)
  const section = biosSetupSections[sectionIndex]

  const rows = useMemo<BiosRow[]>(() => {
    const toggle = (key: keyof Pick<
      BiosSettings,
      'quickPost' | 'floppyEnabled' | 'cdromEnabled' | 'networkBootEnabled' | 'soundEnabled' | 'virusWarning'
    >) => {
      setDraft((current) => ({ ...current, [key]: !current[key] }))
    }
    const cycleHaltOn = () => {
      const order: BiosSettings['haltOn'][] = ['allErrors', 'allButKeyboard', 'noErrors']
      setDraft((current) => ({
        ...current,
        haltOn: order[(order.indexOf(current.haltOn) + 1) % order.length],
      }))
    }
    const moveDevice = (device: BootDeviceId, direction: -1 | 1) => {
      setDraft((current) => ({ ...current, bootOrder: moveBootDevice(current.bootOrder, device, direction) }))
    }

    if (section.id === 'standard') {
      return [
        { label: 'Date (mm:dd:yy)', value: '06/14/26' },
        { label: 'Time (hh:mm:ss)', value: new Date().toLocaleTimeString('en-US', { hour12: false }) },
        { label: 'Primary Master', value: 'VIRTUAL_DISK_98 2.1GB' },
        { label: 'Primary Slave', value: 'None' },
        { label: 'Secondary Master', value: draft.cdromEnabled ? 'PORTFOLIO CD-ROM 24X' : 'None' },
        { label: 'Drive A', value: draft.floppyEnabled ? '1.44M, 3.5 in.' : 'None' },
        { label: 'Base Memory', value: '640K' },
        { label: 'Extended Memory', value: '64512K' },
        { label: 'Display', value: 'EGA/VGA' },
      ]
    }

    if (section.id === 'features') {
      return [
        { label: 'Virus Warning', value: yesNo(draft.virusWarning), onChange: () => toggle('virusWarning') },
        { label: 'CPU Internal Cache', value: 'Enabled' },
        { label: 'External Cache', value: 'Enabled' },
        { label: 'Quick Power On Self Test', value: yesNo(draft.quickPost), onChange: () => toggle('quickPost') },
        { label: 'Boot Sequence', value: bootSequenceLabel(draft) },
        { label: 'Swap Floppy Drive', value: 'Disabled' },
        { label: 'Boot Up NumLock Status', value: 'On' },
        { label: 'Halt On', value: haltOnLabels[draft.haltOn], onChange: cycleHaltOn },
      ]
    }

    if (section.id === 'peripherals') {
      return [
        { label: 'Onboard IDE-1 Controller', value: 'Enabled' },
        { label: 'Onboard IDE-2 Controller', value: yesNo(draft.cdromEnabled), onChange: () => toggle('cdromEnabled') },
        { label: 'Onboard FDC Controller', value: yesNo(draft.floppyEnabled), onChange: () => toggle('floppyEnabled') },
        { label: 'Onboard Serial Port 1', value: '3F8/IRQ4' },
        { label: 'Onboard Parallel Port', value: '378/IRQ7' },
        { label: 'Sound Blaster 16', value: yesNo(draft.soundEnabled), onChange: () => toggle('soundEnabled') },
        { label: 'PCI Ethernet Boot ROM', value: yesNo(draft.networkBootEnabled), onChange: () => toggle('networkBootEnabled') },
      ]
    }

    if (section.id === 'boot') {
      return draft.bootOrder.map((device, index) => ({
        label: `${index + 1}${index === 0 ? 'st' : index === 1 ? 'nd' : index === 2 ? 'rd' : 'th'} Boot Device`,
        value: `${bootDeviceLabels[device]}${bootDeviceEnabled(draft, device) ? '' : ' (Disabled)'}`,
        hint: bootDeviceEnabled(draft, device)
          ? 'Only the hard disk contains a bootable Portfolio Windows installation.'
          : 'Enable this device under Integrated Peripherals before using it.',
        onPrevious: () => moveDevice(device, -1),
        onNext: () => moveDevice(device, 1),
      }))
    }

    if (section.id === 'power') {
      return [
        { label: 'Power Management', value: 'User Define' },
        { label: 'PM Control by APM', value: 'Yes' },
        { label: 'Video Off Method', value: 'V/H SYNC+Blank' },
        { label: 'MODEM Use IRQ', value: '3' },
        { label: 'Soft-Off by PWR-BTTN', value: 'Instant-Off' },
        { label: 'Resume by LAN', value: draft.networkBootEnabled ? 'Enabled' : 'Disabled' },
      ]
    }

    if (section.id === 'defaults') {
      return [{ label: 'Load stable defaults', value: 'Press Enter or click Load Defaults', onChange: () => setDraft(defaultBiosSettings) }]
    }

    if (section.id === 'save') {
      return [{ label: 'Save to CMOS and exit', value: 'Press Enter or F10', onChange: () => saveAndExit() }]
    }

    return [{ label: 'Exit setup', value: 'Press Enter or Esc', onChange: () => restart('normal', { bootProfile: 'warm' }) }]
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft, restart, section.id])

  const safeRowIndex = Math.min(rowIndex, Math.max(0, rows.length - 1))

  function saveAndExit() {
    setBiosSettings(draft)
    restart('normal', { bootProfile: 'warm' })
  }

  function changeCurrentRow(direction?: -1 | 1) {
    const row = rows[safeRowIndex]
    if (!row) return
    if (direction === -1 && row.onPrevious) {
      row.onPrevious()
      return
    }
    if (direction === 1 && row.onNext) {
      row.onNext()
      return
    }
    row.onChange?.()
  }

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'F10') {
        event.preventDefault()
        saveAndExit()
        return
      }
      if (event.key === 'F5') {
        event.preventDefault()
        setDraft(defaultBiosSettings)
        return
      }
      if (event.key === 'Escape') {
        event.preventDefault()
        restart('normal', { bootProfile: 'warm' })
        return
      }
      if (event.key === 'ArrowRight' || event.key === 'Tab') {
        event.preventDefault()
        setSectionIndex((current) => (current + 1) % biosSetupSections.length)
        setRowIndex(0)
        return
      }
      if (event.key === 'ArrowLeft') {
        event.preventDefault()
        setSectionIndex((current) => (current - 1 + biosSetupSections.length) % biosSetupSections.length)
        setRowIndex(0)
        return
      }
      if (event.key === 'ArrowDown') {
        event.preventDefault()
        setRowIndex((current) => (current + 1) % Math.max(1, rows.length))
        return
      }
      if (event.key === 'ArrowUp') {
        event.preventDefault()
        setRowIndex((current) => (current - 1 + Math.max(1, rows.length)) % Math.max(1, rows.length))
        return
      }
      if (event.key === 'PageUp' || event.key === '+') {
        event.preventDefault()
        changeCurrentRow(-1)
        return
      }
      if (event.key === 'PageDown' || event.key === '-') {
        event.preventDefault()
        changeCurrentRow(1)
        return
      }
      if (event.key === 'Enter') {
        event.preventDefault()
        if (section.id === 'save') {
          saveAndExit()
        } else if (section.id === 'exit') {
          restart('normal', { bootProfile: 'warm' })
        } else {
          changeCurrentRow()
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rowIndex, rows, restart, section.id, draft])

  const activeRow = rows[safeRowIndex]

  return (
    <main className="bios-setup-screen" aria-label="Award BIOS setup utility">
      <section className="bios-frame">
        <header className="bios-title">CMOS Setup Utility - Award Software</header>
        <div className="bios-main">
          <nav className="bios-section-list" aria-label="BIOS setup sections">
            {biosSetupSections.map((item, index) => (
              <button
                key={item.id}
                type="button"
                className={sectionIndex === index ? 'selected' : ''}
                onClick={() => {
                  setSectionIndex(index)
                  setRowIndex(0)
                }}
              >
                {item.title}
              </button>
            ))}
          </nav>
          <section className="bios-detail" aria-label={section.title}>
            <h1>{section.title}</h1>
            <div className="bios-table">
              {rows.map((row, index) => (
                <button
                  key={`${row.label}-${index}`}
                  type="button"
                  className={`bios-row ${safeRowIndex === index ? 'selected' : ''}`}
                  onClick={() => setRowIndex(index)}
                  onDoubleClick={() => changeCurrentRow()}
                >
                  <span>{row.label}</span>
                  <strong>{row.value}</strong>
                </button>
              ))}
            </div>
          </section>
        </div>
        <footer className="bios-help">
          <p>{activeRow?.hint ?? section.help}</p>
          <div className="bios-actions">
            <button type="button" onClick={() => changeCurrentRow()} disabled={!activeRow?.onChange && !activeRow?.onNext}>
              Enter: Select
            </button>
            <button type="button" onClick={() => changeCurrentRow(-1)} disabled={!activeRow?.onPrevious}>
              PgUp
            </button>
            <button type="button" onClick={() => changeCurrentRow(1)} disabled={!activeRow?.onNext}>
              PgDn
            </button>
            <button type="button" onClick={() => setDraft(defaultBiosSettings)}>
              F5 Defaults
            </button>
            <button type="button" onClick={saveAndExit}>
              F10 Save
            </button>
            <button type="button" onClick={() => restart('normal', { bootProfile: 'warm' })}>
              Esc Exit
            </button>
          </div>
        </footer>
      </section>
    </main>
  )
}

function BootDeviceQuickMenu() {
  const { state, restart } = useOs()
  const [selected, setSelected] = useState(() => Math.max(0, state.bios.bootOrder.indexOf('hardDisk')))
  const [attemptLines, setAttemptLines] = useState<string[]>([])
  const enabledDevices = enabledBootDevices(state.bios)
  const devices = state.bios.bootOrder

  function chooseDevice(index: number) {
    const device = devices[index]
    if (!device) return
    if (!enabledDevices.includes(device)) {
      setAttemptLines([
        `${bootDeviceLabels[device]} is disabled in CMOS Setup.`,
        'Press Del during POST to enable this device.',
      ])
      return
    }
    if (device === 'hardDisk') {
      restart('normal', { bootProfile: 'warm' })
      return
    }

    const lines: Record<Exclude<BootDeviceId, 'hardDisk'>, string[]> = {
      cdrom: [
        'Boot from ATAPI CD-ROM...',
        'No bootable El Torito image was found in drive D:.',
        'Continuing startup from fixed disk C:.',
      ],
      floppy: [
        'Searching for boot record from Floppy...',
        'Drive A: does not contain a system diskette.',
        'Continuing startup from fixed disk C:.',
      ],
      network: [
        'PXE-M0F: Exiting PCI Ethernet Boot ROM.',
        'PXE-E61: Media test failure, check cable.',
        'Continuing startup from fixed disk C:.',
      ],
    }
    setAttemptLines(lines[device])
    window.setTimeout(() => restart('normal', { bootProfile: 'warm' }), 1900)
  }

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault()
        restart('normal', { bootProfile: 'warm' })
        return
      }
      if (event.key === 'ArrowDown') {
        event.preventDefault()
        setSelected((current) => (current + 1) % devices.length)
        return
      }
      if (event.key === 'ArrowUp') {
        event.preventDefault()
        setSelected((current) => (current - 1 + devices.length) % devices.length)
        return
      }
      if (event.key >= '1' && event.key <= String(devices.length)) {
        const next = Number(event.key) - 1
        setSelected(next)
        chooseDevice(next)
        return
      }
      if (event.key === 'Enter') {
        event.preventDefault()
        chooseDevice(selected)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [devices, restart, selected])

  return (
    <main className="boot-device-quick-screen">
      <section className="boot-device-quick-panel">
        <h1>{osProductName} Boot Device Menu</h1>
        <p>Use arrow keys to select a startup device, then press Enter.</p>
        <ol>
          {devices.map((device, index) => {
            const available = enabledDevices.includes(device)
            return (
              <li key={device}>
                <button
                  type="button"
                  className={selected === index ? 'selected' : ''}
                  onMouseEnter={() => setSelected(index)}
                  onClick={() => chooseDevice(index)}
                >
                  {index + 1}. {bootDeviceShortLabels[device]} ({bootDeviceDosNames[device]}){' '}
                  <span>{available ? bootDeviceLabels[device] : 'Disabled in CMOS'}</span>
                </button>
              </li>
            )
          })}
        </ol>
        <p className="boot-muted">Boot sequence: {bootSequenceLabel(state.bios)}</p>
        {attemptLines.length > 0 && <pre>{attemptLines.join('\n')}</pre>}
        <p className="boot-muted">Esc: normal startup from fixed disk</p>
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

// Scans and verifications run a real-time progress sweep up to this long so they
// feel like genuine disk work instead of finishing instantly. 2 minutes max.
const RECOVERY_SCAN_MS = 120000
const RECOVERY_BAR_WIDTH = 30
// Representative protected files shown ticking past during a scan/verify sweep.
const RECOVERY_SCAN_FILES = [
  'C:\\WINDOWS\\SYSTEM\\KERNEL32.DLL',
  'C:\\WINDOWS\\SYSTEM\\USER32.DLL',
  'C:\\WINDOWS\\SYSTEM\\GDI32.DLL',
  'C:\\WINDOWS\\SYSTEM\\SHELL32.DLL',
  'C:\\WINDOWS\\SYSTEM\\ADVAPI32.DLL',
  'C:\\WINDOWS\\SYSTEM\\COMCTL32.DLL',
  'C:\\WINDOWS\\SYSTEM\\OLE32.DLL',
  'C:\\WINDOWS\\SYSTEM\\RPCRT4.DLL',
  'C:\\WINDOWS\\SYSTEM\\WININET.DLL',
  'C:\\WINDOWS\\SYSTEM\\VMM32.VXD',
  'C:\\WINDOWS\\SYSTEM\\MSGSRV32.EXE',
  'C:\\WINDOWS\\SYSTEM\\KRNL386.EXE',
  'C:\\WINDOWS\\EXPLORER.EXE',
  'C:\\WINDOWS\\WIN.COM',
  'C:\\WINDOWS\\COMMAND.COM',
  'C:\\WINDOWS\\SYSTEM.INI',
  'C:\\WINDOWS\\WIN.INI',
  'C:\\WINDOWS\\FONTS\\MSSANSSERIF.FON',
  'C:\\IO.SYS',
  'C:\\MSDOS.SYS',
]

function recoveryBar(pct: number): string {
  const filled = Math.max(0, Math.min(RECOVERY_BAR_WIDTH, Math.round((pct / 100) * RECOVERY_BAR_WIDTH)))
  return `[${'█'.repeat(filled)}${'░'.repeat(RECOVERY_BAR_WIDTH - filled)}]`
}

// Restore reinstalls protected components with an npm/pnpm vibe: each shows as a
// `+ name@version` line. 4.10.1998 is the real Windows 98 build number.
const RECOVERY_INSTALL_VERSION = '4.10.1998'
const RECOVERY_SPINNER = ['|', '/', '-', '\\']
const RECOVERY_INSTALL_PACKAGES = RECOVERY_SCAN_FILES.map((path) => (path.split('\\').pop() ?? path).toLowerCase())

function RecoveryConsole() {
  const { state, fsOps, restart, playSound } = useOs()
  const [choice, setChoice] = useState(1)
  const [output, setOutput] = useState<string[]>([])
  const [scanning, setScanning] = useState(false)
  const missing = missingSystemFiles(state.fs)
  const choiceRef = useRef(choice)
  const scanTimer = useRef<number | null>(null)
  useEffect(() => {
    choiceRef.current = choice
  }, [choice])

  const stopScan = useCallback(() => {
    if (scanTimer.current !== null) {
      window.clearInterval(scanTimer.current)
      scanTimer.current = null
    }
  }, [])

  // Clear any running scan when the recovery console unmounts.
  useEffect(() => () => stopScan(), [stopScan])

  // Reveal output one line at a time so a scan/restore feels like real work
  // instead of dumping the whole list instantly. onDone fires after the last
  // line (used to apply the filesystem repair only once the animation ends).
  const reveal = useCallback(
    (lines: string[], onDone?: () => void) => {
      stopScan()
      setScanning(true)
      setOutput(lines.slice(0, 1))
      let index = 1
      scanTimer.current = window.setInterval(() => {
        if (index >= lines.length) {
          stopScan()
          setScanning(false)
          onDone?.()
          return
        }
        const line = lines[index]
        index += 1
        setOutput((prev) => [...prev, line])
      }, 45)
    },
    [stopScan],
  )

  // A timed progress sweep for scans/verifications: a Courier progress bar fills in
  // real time (anchored to Date.now, so it's immune to interval drift) over
  // RECOVERY_SCAN_MS while file names tick past, then the result lines are revealed
  // at 100%. label is the in-progress verb shown before each file (Checking/Verifying).
  const runScan = useCallback(
    (header: string, label: string, resultLines: string[]) => {
      stopScan()
      setScanning(true)
      const startedAt = Date.now()
      const tick = () => {
        const elapsed = Math.min(RECOVERY_SCAN_MS, Date.now() - startedAt)
        if (elapsed >= RECOVERY_SCAN_MS) {
          stopScan()
          setScanning(false)
          setOutput([header, '', `${recoveryBar(100)} 100%`, '', ...resultLines])
          return
        }
        const pct = Math.floor((elapsed / RECOVERY_SCAN_MS) * 100)
        const fileIndex = Math.floor((elapsed / RECOVERY_SCAN_MS) * RECOVERY_SCAN_FILES.length) % RECOVERY_SCAN_FILES.length
        setOutput([header, '', `${recoveryBar(pct)} ${String(pct).padStart(3, ' ')}%`, `${label} ${RECOVERY_SCAN_FILES[fileIndex]}`])
      }
      tick()
      scanTimer.current = window.setInterval(tick, 250)
    },
    [stopScan],
  )

  // Restore (option 2) plays like an npm/pnpm reinstall: a spinner + progress bar
  // sweep over RECOVERY_SCAN_MS while protected components reinstall one by one
  // (green `+ pkg@ver` lines accumulating), then the real filesystem repair is
  // applied at 100% via onDone (replaceFs + ding).
  const runRestore = useCallback(
    (header: string, summary: string[], onDone: () => void) => {
      stopScan()
      setScanning(true)
      const packages = RECOVERY_INSTALL_PACKAGES
      const head = [header, '', 'Resolving system components...', '']
      const startedAt = Date.now()
      let spin = 0
      const tick = () => {
        const elapsed = Math.min(RECOVERY_SCAN_MS, Date.now() - startedAt)
        if (elapsed >= RECOVERY_SCAN_MS) {
          stopScan()
          setScanning(false)
          const secs = Math.max(1, Math.round((Date.now() - startedAt) / 1000))
          setOutput([
            ...head,
            ...packages.map((p) => `+ ${p}@${RECOVERY_INSTALL_VERSION}`),
            '',
            `${recoveryBar(100)} 100%`,
            '',
            `added ${packages.length} packages from RB000.CAB in ${secs}s`,
            ...summary,
          ])
          onDone()
          return
        }
        const pct = Math.floor((elapsed / RECOVERY_SCAN_MS) * 100)
        const installed = Math.min(packages.length, Math.floor((elapsed / RECOVERY_SCAN_MS) * packages.length) + 1)
        spin = (spin + 1) % RECOVERY_SPINNER.length
        setOutput([
          ...head,
          ...packages.slice(0, installed).map((p) => `+ ${p}@${RECOVERY_INSTALL_VERSION}`),
          '',
          `${RECOVERY_SPINNER[spin]} ${recoveryBar(pct)} ${String(pct).padStart(3, ' ')}%  reinstalling ${packages[installed - 1]}`,
        ])
      }
      tick()
      scanTimer.current = window.setInterval(tick, 250)
    },
    [stopScan],
  )

  function runChoice(id: number) {
    if (id === 1) {
      runScan(
        'Scanning C:\\WINDOWS for required system files...',
        'Checking',
        missing.length
          ? [...missing.map((path) => `MISSING   ${path}`), '', `${missing.length} file(s) must be restored before Windows can start.`]
          : ['No missing system files were found.', 'Windows should start normally.'],
      )
      return
    }
    if (id === 2) {
      if (!missing.length) {
        reveal(['Nothing to restore. All required system files are present.'])
        return
      }
      const result = restoreSystemFiles(state.fs)
      runRestore(
        'Restoring system files from registry backup RB000.CAB...',
        [
          `${result.restored.length} file(s) restored successfully.`,
          'Windows has fixed your registry. Press Esc, then choose Normal to start Windows.',
        ],
        () => {
          fsOps.replaceFs(result.fs)
          playSound('ding')
        },
      )
      return
    }
    if (id === 3) {
      runScan(
        'Verifying the integrity of all protected system files...',
        'Verifying',
        missing.length
          ? [...missing.map((path) => `CORRUPT   ${path}`), '', 'Integrity violations found. Run option 2 to repair.']
          : ['Windows resource protection did not find any integrity violations.'],
      )
      return
    }
    reveal([
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
          Enter choice: [{choice}]
          {!scanning && <span className="fdisk-cursor" aria-hidden="true" />}
        </p>
        {(output.length > 0 || scanning) && (
          <div className="fdisk-output" role="log" aria-live="polite">
            {output.map((line, index) => (
              <RecoveryLine key={index} text={line} />
            ))}
            {scanning && <span className="fdisk-scan-cursor" aria-hidden="true" />}
          </div>
        )}
      </div>
      <footer className="fdisk-footer">
        <p>
          Press <b>Esc</b> to exit Recovery and return to the Startup Menu
        </p>
      </footer>
    </main>
  )
}

// Renders one recovery output line, coloring a leading status keyword
// (MISSING/CORRUPT in red, RESTORED/OK in green) like a real repair console.
function RecoveryLine({ text }: { text: string }) {
  // npm-style added-package line (green +), used by the Restore reinstall animation.
  if (text.startsWith('+ ')) {
    return <div className="fdisk-line fdisk-add">{text}</div>
  }
  const match = /^(MISSING|CORRUPT|RESTORED|OK|FOUND)\s{2,}(.*)$/.exec(text)
  if (match) {
    const status = match[1]
    const bad = status === 'MISSING' || status === 'CORRUPT'
    return (
      <div className="fdisk-line">
        <span className={`fdisk-status ${bad ? 'fdisk-status-bad' : 'fdisk-status-good'}`}>{status}</span>
        {match[2]}
      </div>
    )
  }
  return <div className="fdisk-line">{text === '' ? ' ' : text}</div>
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
    setAudioVolume,
    fsOps,
    showMessageBox,
  } = useOs()
  const [selectedIcon, setSelectedIcon] = useState(desktopIconDefs[0]?.id ?? 'myComputer')
  const [selectedIconIds, setSelectedIconIds] = useState<string[]>(() =>
    desktopIconDefs[0]?.id ? [desktopIconDefs[0].id] : [],
  )
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null)
  const [selectionBox, setSelectionBox] = useState<SelectionBox | null>(null)
  const [recycleHover, setRecycleHover] = useState(false)
  const [refreshingDesktop, setRefreshingDesktop] = useState(false)
  const [clock, setClock] = useState(() => formatClock(new Date()))
  const desktopRef = useRef<HTMLDivElement>(null)
  const orderedWindows = useMemo(() => [...state.windows].sort((a, b) => a.zIndex - b.zIndex), [state.windows])
  const primarySelectedIcon = selectedIconIds[0]
  const keyboardAnchorIcon = primarySelectedIcon ?? selectedIcon ?? desktopIconDefs[0]?.id

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
    const interval = window.setInterval(() => setClock(formatClock(new Date())), 1000)
    return () => window.clearInterval(interval)
  }, [])

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

  function lineUpIcons() {
    const targets = selectedIconIds.length ? selectedIconIds : allIconDefs.map((icon) => icon.id)
    const orderedTargets = [...targets].sort((a, b) => {
      const posA = iconPositions[a] ?? { x: 10, y: 12 }
      const posB = iconPositions[b] ?? { x: 10, y: 12 }
      return posA.y - posB.y || posA.x - posB.x
    })
    const desktopHeight = Math.max(160, window.innerHeight - 33)
    const rowsPerColumn = Math.max(1, Math.floor((desktopHeight - 24) / (desktopIconHeight + desktopIconGapY)))
    orderedTargets.forEach((id, index) => {
      const column = Math.floor(index / rowsPerColumn)
      const row = index % rowsPerColumn
      moveDesktopIcon(id, {
        x: 10 + column * (desktopIconWidth + desktopIconGapX),
        y: 12 + row * (desktopIconHeight + desktopIconGapY),
      })
    })
    setContextMenu(null)
  }

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
        closeWindow(activeWindow.instanceId)
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
    closeWindow,
    focusWindow,
    findNextDesktopIcon,
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
      className={`os-shell ${state.bootMode === 'safe' ? 'safe-mode' : ''}`}
      onPointerDown={() => {
        setStartMenuOpen(false)
        setContextMenu(null)
      }}
    >
      <div
        ref={desktopRef}
        className={`desktop ${refreshingDesktop ? 'is-refreshing' : ''}`}
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
        {state.bootMode === 'safe' && <div className="safe-mode-banner">Safe Mode</div>}
        <div className="desktop-grid">
          {allIconDefs.map((iconDef) => (
            <DesktopIcon
              key={iconDef.id}
              iconDef={iconDef}
              position={iconPositions[iconDef.id] ?? { x: 10, y: 12 }}
              selected={selectedIconIds.includes(iconDef.id)}
              deletable={iconDef.id.startsWith('fs:')}
              highlighted={recycleHover && iconDef.id === 'recycleBin'}
              onSelect={(extend) => selectDesktopIcon(iconDef.id, extend)}
              onOpen={() => openApp(iconDef.appId, iconDef.payload)}
              onMove={moveDesktopIcon}
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
              onClose={closeWindow}
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
            openApp={openApp}
            onRefresh={refreshDesktop}
            onArrangeIcons={() => {
              arrangeDesktopIcons()
              setContextMenu(null)
            }}
            onLineUpIcons={lineUpIcons}
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
      />
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
    case 'bootDeviceMenu':
      return <BootDeviceQuickMenu />
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
