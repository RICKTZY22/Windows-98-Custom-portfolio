import { useCallback, useEffect, useRef, useState } from 'react'
import { useOs } from '../../os/useOs'
import { missingSystemFiles, restoreSystemFiles } from '../../os/recovery'
import { osCreditLine, osProductName } from '../../data/system'

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
const RECOVERY_TICK_MS = 250
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

function formatPct(pct: number): string {
  return `${String(pct).padStart(3, ' ')}%`
}

// Restore reinstalls protected components with an npm/pnpm vibe: each shows as a
// `+ name@version` line. 4.10.1998 is the real Windows 98 build number.
const RECOVERY_INSTALL_VERSION = '4.10.1998'
const RECOVERY_SPINNER = ['|', '/', '-', '\\']
const RECOVERY_INSTALL_PACKAGES = RECOVERY_SCAN_FILES.map((path) => (path.split('\\').pop() ?? path).toLowerCase())
const RECOVERY_INSTALL_SECONDS = Math.round(RECOVERY_SCAN_MS / 1000)

export function RecoveryConsole() {
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

  // Drive a RECOVERY_SCAN_MS progress sweep, anchored to Date.now so it's immune to
  // interval drift: onFrame(pct, elapsed) renders each step; onDone() renders the
  // finished state and runs any side effects (e.g. the filesystem repair).
  const runSweep = useCallback(
    (onFrame: (pct: number, elapsed: number) => void, onDone: () => void) => {
      stopScan()
      setScanning(true)
      const startedAt = Date.now()
      const tick = () => {
        const elapsed = Math.min(RECOVERY_SCAN_MS, Date.now() - startedAt)
        if (elapsed >= RECOVERY_SCAN_MS) {
          stopScan()
          setScanning(false)
          onDone()
          return
        }
        onFrame(Math.floor((elapsed / RECOVERY_SCAN_MS) * 100), elapsed)
      }
      tick()
      scanTimer.current = window.setInterval(tick, RECOVERY_TICK_MS)
    },
    [stopScan],
  )

  // Scan / Verify: a progress bar fills while system file names tick past, then the
  // result lines are revealed at 100%. label is the in-progress verb (Checking/Verifying).
  const runScan = useCallback(
    (header: string, label: string, resultLines: string[]) => {
      runSweep(
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

  // Restore (option 2) plays like an npm/pnpm reinstall: a spinner + progress bar
  // sweep while protected components reinstall one by one (green `+ pkg@ver` lines
  // accumulating), then the real filesystem repair is applied at 100% via onDone.
  const runRestore = useCallback(
    (header: string, summary: string[], onDone: () => void) => {
      const packages = RECOVERY_INSTALL_PACKAGES
      const head = [header, '', 'Resolving system components...', '']
      const installLine = (count: number) => packages.slice(0, count).map((p) => `+ ${p}@${RECOVERY_INSTALL_VERSION}`)
      let spin = 0
      runSweep(
        (pct, elapsed) => {
          const installed = Math.min(packages.length, Math.floor((elapsed / RECOVERY_SCAN_MS) * packages.length) + 1)
          spin = (spin + 1) % RECOVERY_SPINNER.length
          setOutput([
            ...head,
            ...installLine(installed),
            '',
            `${RECOVERY_SPINNER[spin]} ${recoveryBar(pct)} ${formatPct(pct)}  reinstalling ${packages[installed - 1]}`,
          ])
        },
        () => {
          setOutput([
            ...head,
            ...installLine(packages.length),
            '',
            `${recoveryBar(100)} ${formatPct(100)}`,
            '',
            `added ${packages.length} packages from RB000.CAB in ${RECOVERY_INSTALL_SECONDS}s`,
            ...summary,
          ])
          onDone()
        },
      )
    },
    [runSweep],
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
