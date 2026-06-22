import './AntivirusApp.css'
import { useEffect, useMemo, useRef, useState } from 'react'
import { win98Icons } from '../../data/icons'
import type { AppProps, FsNode } from '../../types'
import { useOs } from '../../os/useOs'

type ScanPhase = 'idle' | 'scanning' | 'complete' | 'stopped'

const MIN_SCAN_MS = 3 * 60 * 1000
const MAX_SCAN_MS = 5 * 60 * 1000
const SCAN_TICK_MS = 650

const scanSteps = [
  'Loading signature database AV98.DAT',
  'Checking startup files',
  'Scanning Windows system folder',
  'Inspecting document macros',
  'Checking browser cache',
  'Scanning shortcuts and program groups',
  'Verifying portfolio project files',
  'Checking boot configuration',
]

function formatDuration(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000))
  const minutes = Math.floor(total / 60)
  const seconds = total % 60
  return `${minutes}:${String(seconds).padStart(2, '0')}`
}

function scanDuration(): number {
  return MIN_SCAN_MS + Math.floor(Math.random() * (MAX_SCAN_MS - MIN_SCAN_MS + 1))
}

function nodeWeight(node: FsNode): number {
  if (node.kind === 'folder') return 1
  return Math.max(1, Math.ceil(node.size / 4096))
}

export function AntivirusApp({ windowId }: AppProps) {
  const { state, playSound, setWindowTitle } = useOs()
  const [phase, setPhase] = useState<ScanPhase>('idle')
  const [progress, setProgress] = useState(0)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [durationMs, setDurationMs] = useState(() => scanDuration())
  const [elapsedMs, setElapsedMs] = useState(0)
  const [logLines, setLogLines] = useState<string[]>([
    'Antivirus 98 ready.',
    'Definitions loaded from C:\\Program Files\\Antivirus 98\\AV98.DAT',
    'Real file modifications: disabled',
  ])
  const startedAtRef = useRef(0)
  const durationRef = useRef(durationMs)

  const targets = useMemo(
    () =>
      Object.values(state.fs.nodes)
        .sort((a, b) => a.path.localeCompare(b.path))
        .flatMap((node) => Array.from({ length: nodeWeight(node) }, () => node.path)),
    [state.fs.nodes],
  )

  const currentPath = targets[Math.min(currentIndex, Math.max(0, targets.length - 1))] ?? 'C:\\'
  const scannedCount = phase === 'complete' ? targets.length : Math.min(targets.length, currentIndex + 1)
  const remainingMs = phase === 'scanning' ? Math.max(0, durationMs - elapsedMs) : durationMs
  const step = scanSteps[currentIndex % scanSteps.length]

  useEffect(() => {
    setWindowTitle(windowId, phase === 'scanning' ? 'Antivirus 98 - Scanning' : 'Antivirus 98')
  }, [phase, setWindowTitle, windowId])

  useEffect(() => {
    if (phase !== 'scanning') return
    const timer = window.setInterval(() => {
      const elapsed = Date.now() - startedAtRef.current
      const pct = Math.min(100, Math.floor((elapsed / durationRef.current) * 100))
      const nextIndex = Math.min(targets.length - 1, Math.floor((pct / 100) * targets.length))

      setElapsedMs(elapsed)
      setProgress(pct)
      setCurrentIndex(nextIndex)
      setLogLines((current) => {
        const path = targets[nextIndex] ?? 'C:\\'
        const next = [...current, `${formatDuration(elapsed)}  ${scanSteps[nextIndex % scanSteps.length]}: ${path}`]
        return next.slice(-9)
      })

      if (pct >= 100) {
        window.clearInterval(timer)
        setPhase('complete')
        setElapsedMs(durationRef.current)
        setProgress(100)
        setCurrentIndex(Math.max(0, targets.length - 1))
        setLogLines((current) => [
          ...current.slice(-7),
          'Scan complete.',
          'No active threats found. System is clean.',
        ])
        playSound('ding')
      }
    }, SCAN_TICK_MS)

    return () => window.clearInterval(timer)
  }, [phase, playSound, targets])

  function startScan() {
    const nextDuration = scanDuration()
    durationRef.current = nextDuration
    startedAtRef.current = Date.now()
    setDurationMs(nextDuration)
    setElapsedMs(0)
    setProgress(0)
    setCurrentIndex(0)
    setPhase('scanning')
    setLogLines([
      'Full system scan started.',
      `Estimated duration: ${formatDuration(nextDuration)}`,
      'Scope: virtual C: drive only',
    ])
    playSound('launch')
  }

  function stopScan() {
    setPhase('stopped')
    setLogLines((current) => [...current.slice(-7), 'Scan stopped by user.', 'No real files were modified.'])
    playSound('restore')
  }

  function cleanSystem() {
    setPhase('idle')
    setProgress(0)
    setCurrentIndex(0)
    setElapsedMs(0)
    setLogLines([
      'Cleanup complete.',
      'Quarantine is empty.',
      'No real files, downloads, or network traffic were touched.',
    ])
    playSound('ding')
  }

  return (
    <div className="app-content antivirus-app">
      <ul className="os-menu-bar" role="menubar">
        <li>File</li>
        <li>Scan</li>
        <li>Tools</li>
        <li>Help</li>
      </ul>

      <div className="antivirus-banner">
        <img src={win98Icons.sysFile} alt="" />
        <div>
          <h2>Antivirus 98</h2>
          <p>Fictional scanner for this browser OS. It only reads the virtual filesystem state.</p>
        </div>
      </div>

      <div className="antivirus-grid">
        <section className="sunken-panel antivirus-sidebar">
          <button type="button" className={phase === 'scanning' ? 'selected' : ''} disabled={phase === 'scanning'}>
            <img src={win98Icons.search} alt="" />
            <span>
              <strong>Full System Scan</strong>
              <small>3-5 minutes</small>
            </span>
          </button>
          <button type="button" disabled>
            <img src={win98Icons.folder} alt="" />
            <span>
              <strong>Custom Folder Scan</strong>
              <small>Coming soon</small>
            </span>
          </button>
          <button type="button" disabled>
            <img src={win98Icons.recycleBin} alt="" />
            <span>
              <strong>Quarantine</strong>
              <small>0 item(s)</small>
            </span>
          </button>
        </section>

        <section className="antivirus-main">
          <fieldset>
            <legend>Scan Status</legend>
            <div className="antivirus-status-grid">
              <span>Status: <b>{phase === 'scanning' ? 'Scanning' : phase === 'complete' ? 'Complete' : phase === 'stopped' ? 'Stopped' : 'Ready'}</b></span>
              <span>Threats found: <b>0</b></span>
              <span>Files scanned: <b>{scannedCount}</b> / {targets.length}</span>
              <span>Quarantined: <b>0</b></span>
              <span>Elapsed: <b>{formatDuration(elapsedMs)}</b></span>
              <span>Remaining: <b>{phase === 'scanning' ? formatDuration(remainingMs) : '--:--'}</b></span>
            </div>
          </fieldset>

          <fieldset>
            <legend>Current Operation</legend>
            <p className="antivirus-current-step">{phase === 'scanning' ? step : 'Waiting for scan.'}</p>
            <p className="antivirus-current-path">{phase === 'scanning' ? currentPath : 'C:\\'}</p>
            <div className="antivirus-progress" aria-label={`${progress}% complete`}>
              <span style={{ width: `${progress}%` }} />
            </div>
            <p className="antivirus-progress-label">{progress}% complete</p>
          </fieldset>

          <div className="sunken-panel antivirus-log">
            <pre>{logLines.join('\n')}</pre>
          </div>
        </section>
      </div>

      <div className="button-row run-buttons antivirus-actions">
        <button type="button" className="default" onClick={startScan} disabled={phase === 'scanning'}>
          Start Scan
        </button>
        <button type="button" onClick={stopScan} disabled={phase !== 'scanning'}>
          Stop
        </button>
        <button type="button" onClick={cleanSystem}>
          Clean System
        </button>
      </div>

      <div className="status-bar">
        <p className="status-bar-field">
          Real files changed: 0 | Real network packets: 0 | Downloads created: 0
        </p>
        <p className="status-bar-field">{phase === 'scanning' ? 'Scanning virtual C:' : 'Idle'}</p>
      </div>
    </div>
  )
}
