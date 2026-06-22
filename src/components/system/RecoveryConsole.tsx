import { useCallback, useEffect, useRef, useState } from 'react'
import { useOs } from '../../os/useOs'
import {
  missingSystemFilePackages,
  missingSystemFiles,
  recoveryInstallDurationMs,
  restoreSystemFiles,
} from '../../os/recovery'

const recoveryOptions = [
  { id: 1, label: 'Scan for missing system files' },
  { id: 2, label: 'Restore missing system files' },
  { id: 3, label: 'Verify protected system files' },
  { id: 4, label: 'Display disk information' },
  { id: 5, label: 'Restart Windows 98' },
] as const

const RECOVERY_SCAN_MS = 120000
const RECOVERY_BAR_WIDTH = 30
const RECOVERY_TICK_MS = 250
const RECOVERY_SCAN_FILES = [
  'C:\\WINDOWS\\SYSTEM32\\KERNEL32.DLL',
  'C:\\WINDOWS\\SYSTEM32\\USER32.DLL',
  'C:\\WINDOWS\\SYSTEM32\\GDI32.DLL',
  'C:\\WINDOWS\\SYSTEM32\\SHELL32.DLL',
  'C:\\WINDOWS\\SYSTEM32\\ADVAPI32.DLL',
  'C:\\WINDOWS\\SYSTEM32\\COMCTL32.DLL',
  'C:\\WINDOWS\\SYSTEM32\\OLE32.DLL',
  'C:\\WINDOWS\\SYSTEM32\\WININET.DLL',
  'C:\\WINDOWS\\SYSTEM32\\VMM32.VXD',
  'C:\\WINDOWS\\SYSTEM32\\KRNL386.EXE',
  'C:\\WINDOWS\\SYSTEM32\\USER.EXE',
  'C:\\WINDOWS\\SYSTEM32\\DISPLAY.DRV',
  'C:\\WINDOWS\\EXPLORER.EXE',
  'C:\\WINDOWS\\WIN.COM',
  'C:\\WINDOWS\\COMMAND.COM',
  'C:\\WINDOWS\\SYSTEM.INI',
  'C:\\WINDOWS\\WIN.INI',
  'C:\\IO.SYS',
  'C:\\MSDOS.SYS',
]

const RECOVERY_INSTALL_VERSION = '4.10.1998'
const RECOVERY_SPINNER = ['|', '/', '-', '\\']
const RECOVERY_FINAL_PACKAGE_LINES = 4

function recoveryBar(pct: number): string {
  const filled = Math.max(0, Math.min(RECOVERY_BAR_WIDTH, Math.round((pct / 100) * RECOVERY_BAR_WIDTH)))
  return `[${'#'.repeat(filled)}${'.'.repeat(RECOVERY_BAR_WIDTH - filled)}]`
}

function formatPct(pct: number): string {
  return `${String(pct).padStart(3, ' ')}%`
}

function packageName(path: string): string {
  return (path.split('\\').pop() ?? path).toLowerCase()
}

function installLine(path: string): string {
  return `+ ${packageName(path)}@${RECOVERY_INSTALL_VERSION}`
}

function compactInstallLines(packagePaths: string[]): string[] {
  if (packagePaths.length <= RECOVERY_FINAL_PACKAGE_LINES) {
    return packagePaths.map(installLine)
  }
  return [
    `... ${packagePaths.length - RECOVERY_FINAL_PACKAGE_LINES} additional package(s) installed`,
    ...packagePaths.slice(-RECOVERY_FINAL_PACKAGE_LINES).map(installLine),
  ]
}

export function RecoveryConsole() {
  const { state, fsOps, restart, playSound } = useOs()
  const [choice, setChoice] = useState(1)
  const [output, setOutput] = useState<string[]>([
    'Windows did not load correctly.',
    'Use Restore missing system files to reinstall protected components.',
  ])
  const [scanning, setScanning] = useState(false)
  const missing = missingSystemFiles(state.fs)
  const choiceRef = useRef(choice)
  const scanTimer = useRef<number | null>(null)
  const outputRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    choiceRef.current = choice
  }, [choice])

  const stopScan = useCallback(() => {
    if (scanTimer.current !== null) {
      window.clearInterval(scanTimer.current)
      scanTimer.current = null
    }
  }, [])

  useEffect(() => () => stopScan(), [stopScan])

  useEffect(() => {
    const node = outputRef.current
    if (!node) return
    node.scrollTop = node.scrollHeight
  }, [output])

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

  const runSweep = useCallback(
    (durationMs: number, onFrame: (pct: number, elapsed: number) => void, onDone: () => void) => {
      stopScan()
      setScanning(true)
      const startedAt = Date.now()
      const tick = () => {
        const elapsed = Math.min(durationMs, Date.now() - startedAt)
        if (elapsed >= durationMs) {
          stopScan()
          setScanning(false)
          onDone()
          return
        }
        onFrame(Math.floor((elapsed / durationMs) * 100), elapsed)
      }
      tick()
      scanTimer.current = window.setInterval(tick, RECOVERY_TICK_MS)
    },
    [stopScan],
  )

  const runScan = useCallback(
    (header: string, label: string, resultLines: string[]) => {
      runSweep(
        RECOVERY_SCAN_MS,
        (pct, elapsed) => {
          const fileIndex =
            Math.floor((elapsed / RECOVERY_SCAN_MS) * RECOVERY_SCAN_FILES.length) % RECOVERY_SCAN_FILES.length
          setOutput([header, '', `${recoveryBar(pct)} ${formatPct(pct)}`, `${label} ${RECOVERY_SCAN_FILES[fileIndex]}`])
        },
        () => setOutput([header, '', `${recoveryBar(100)} ${formatPct(100)}`, '', ...resultLines]),
      )
    },
    [runSweep],
  )

  const runRestore = useCallback(
    (header: string, packagePaths: string[], summary: string[], onDone: () => void) => {
      const head = [header, '', 'Resolving system components...', '']
      const durationMs = recoveryInstallDurationMs(packagePaths.length)
      const durationSeconds = Math.round(durationMs / 1000)
      const completedLines = (count: number) => packagePaths.slice(0, count).map(installLine)
      let spin = 0
      runSweep(
        durationMs,
        (pct, elapsed) => {
          const installed = Math.min(packagePaths.length, Math.floor((elapsed / durationMs) * packagePaths.length))
          const activePackage = packagePaths[Math.min(installed, Math.max(0, packagePaths.length - 1))]
          spin = (spin + 1) % RECOVERY_SPINNER.length
          setOutput([
            ...head,
            ...completedLines(installed),
            '',
            `${RECOVERY_SPINNER[spin]} ${recoveryBar(pct)} ${formatPct(pct)}  reinstalling ${
              activePackage ? packageName(activePackage) : 'protected-cache'
            }`,
          ])
        },
        () => {
          setOutput([
            ...head,
            ...compactInstallLines(packagePaths),
            '',
            `${recoveryBar(100)} ${formatPct(100)}`,
            '',
            `added ${packagePaths.length} package(s) from RB000.CAB in ${durationSeconds}s`,
            ...summary,
          ])
          onDone()
        },
      )
    },
    [runSweep],
  )

  function runChoice(id: number) {
    if (scanning) return

    if (id === 1) {
      runScan(
        'Scanning C:\\WINDOWS for required system files...',
        'Checking',
        missing.length
          ? [...missing.map((path) => `MISSING   ${path}`), '', `${missing.length} item(s) must be restored before Windows can start.`]
          : ['No missing system files were found.', 'Windows should start normally.'],
      )
      return
    }

    if (id === 2) {
      if (!missing.length) {
        reveal(['Nothing to restore. All required system files are present.'])
        return
      }
      const packagePaths = missingSystemFilePackages(state.fs)
      const result = restoreSystemFiles(state.fs)
      runRestore(
        'Restoring system files from registry backup RB000.CAB...',
        packagePaths,
        [
          `${packagePaths.length} file package(s) reinstalled; ${result.restored.length - packagePaths.length} folder item(s) rebuilt.`,
          `${result.restored.length} protected item(s) restored successfully.`,
          'Press Esc or choose Restart Windows 98 to boot normally.',
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

    if (id === 4) {
      reveal([
        'Current fixed disk drive: 1',
        '',
        'Partition   Status   Type      Volume Label   Mbytes   System   Usage',
        ' C: 1          A      PRI DOS   PORTFOLIO       2047    FAT16     100%',
        '',
        'Total fixed disk space is 2047 Mbytes (1 Mbyte = 1048576 bytes)',
      ])
      return
    }

    restart('normal', { bootProfile: 'warm' })
  }

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault()
        restart('normal', { bootProfile: 'warm' })
        return
      }
      if (event.key >= '1' && event.key <= String(recoveryOptions.length)) {
        const next = Number(event.key)
        choiceRef.current = next
        setChoice(next)
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
  }, [scanning, state.fs, restart])

  return (
    <main className="recovery-menu-screen" aria-label="Windows 98 recovery menu">
      <section className="recovery-menu-panel">
        <p className="recovery-menu-title">Microsoft Windows 98 Recovery Menu</p>
        <p className="recovery-menu-status">
          System status: {missing.length ? `${missing.length} protected item(s) missing` : 'ready to boot'}
        </p>
        <ol className="recovery-menu-options">
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
        <p className="recovery-menu-choice">
          Enter a choice: {choice}
          {!scanning && <span aria-hidden="true" />}
        </p>
        <div ref={outputRef} className="recovery-menu-output" role="log" aria-live="polite">
          {output.map((line, index) => (
            <RecoveryLine key={`${index}-${line}`} text={line} />
          ))}
          {scanning && <span className="recovery-scan-cursor" aria-hidden="true" />}
        </div>
        <footer className="recovery-menu-footer">
          F5=Safe Mode&nbsp;&nbsp;Shift+F5=Command Prompt&nbsp;&nbsp;Esc=Restart&nbsp;&nbsp;Enter=Run
        </footer>
      </section>
    </main>
  )
}

function RecoveryLine({ text }: { text: string }) {
  if (text.startsWith('+ ')) {
    return <div className="recovery-line recovery-add">{text}</div>
  }
  const match = /^(MISSING|CORRUPT|RESTORED|OK|FOUND)\s{2,}(.*)$/.exec(text)
  if (match) {
    const status = match[1]
    const bad = status === 'MISSING' || status === 'CORRUPT'
    return (
      <div className="recovery-line">
        <span className={`recovery-status ${bad ? 'recovery-status-bad' : 'recovery-status-good'}`}>{status}</span>
        {match[2]}
      </div>
    )
  }
  return <div className="recovery-line">{text || ' '}</div>
}
