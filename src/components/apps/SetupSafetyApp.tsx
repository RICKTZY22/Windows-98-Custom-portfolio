import './SetupSafetyApp.css'
import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { AppProps } from '../../types'
import { useOs } from '../../os/useOs'

type Dialog = { id: number; x: number; y: number; title: string; message: string; showDetails?: boolean }

const DIALOG_TITLES = [
  'Illegal Operation',
  'testdontouch',
  'Explorer',
  'KERNEL32',
  'Rundll32',
  'Spool32',
  'System Error',
]

const DIALOG_MESSAGES = [
  'TESTDONTOUCH has caused an error in KERNEL32.DLL. TESTDONTOUCH will now be closed.',
  'EXPLORER has caused an invalid page fault in module EXPLORER.EXE at 015f:00401f31.',
  'An exception 0E has occurred at 0028:C0011E36 in VXD VMM(01) + 00010E36.',
  'The system is dangerously low on resources. Windows cannot allocate memory for new tasks.',
  'General Protection Fault in module GDI.EXE at 0001:240F.',
  'A required .DLL file, USER32.DLL, was not found or is corrupted.',
  'Sharing violation reading drive C:. Abort, Retry, Fail?',
  'This program has performed an illegal operation and will be shut down.',
]

const SETUP_LINES = [
  'C:\\MY DOCUMENTS\\PRIVATE> testdontouch.exe',
  'Microsoft(R) Windows 98 Setup Utility 4.10.1998',
  'Scanning system registry and verifying FAT32 structure...',
  'Decompressing CAB archive: WIN98_24.CAB...',
  'Extracting system component: USER32.DLL...',
  'Registering OLE server components in SYSTEM.DAT...',
  'WARNING: Stack segment exhaustion in KERNEL32.DLL',
  'ERROR: General Protection Fault at 015F:BFF7A388',
  'CRITICAL: Unrecoverable page fault in module USER.EXE',
  'FATAL: Sector allocation table write failure on drive C:',
]

const DELETING_FILES = [
  'C:\\WINDOWS\\SYSTEM\\KERNEL32.DLL',
  'C:\\WINDOWS\\SYSTEM\\USER32.DLL',
  'C:\\WINDOWS\\SYSTEM\\GDI32.DLL',
  'C:\\WINDOWS\\SYSTEM\\SHELL32.DLL',
  'C:\\WINDOWS\\SYSTEM\\VMM32.VXD',
  'C:\\WINDOWS\\SYSTEM.DAT',
  'C:\\WINDOWS\\USER.DAT',
  'C:\\WINDOWS\\COMMAND.COM',
  'C:\\IO.SYS',
]

const CRASH_DIALOGS = 32
const DIALOG_W = 340
const DIALOG_H = 150

function rand<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)]
}

function getRegisterDump(title: string) {
  return `${title.toUpperCase()} caused an invalid page fault in
module KERNEL32.DLL at 015f:bff7a388.
Registers:
EAX=00000000 CS=015f EIP=bff7a388 EFLGS=00000246
EBX=00550000 SS=0167 ESP=0063fbf0 EBP=0063fc28
ECX=c144e540 DS=0167 ESI=81615f2c FS=10af
EDX=0001859c ES=0167 EDI=00000000 GS=0000
Bytes at CS:EIP:
55 8b ec 83 ec 0c 53 56 57 8b 7d 08 85 ff 74 38
Stack dump:
0063fc28 bff7a412 00000000 81615f2c 00000000`
}

function spreadDialogPoint(index: number): { x: number; y: number } {
  const usableWidth = window.innerWidth
  const usableHeight = window.innerHeight - 80

  const quadrant = index % 4
  let baseX = 30
  let baseY = 30

  if (quadrant === 1) {
    baseX = Math.max(30, usableWidth - DIALOG_W - 50)
  } else if (quadrant === 2) {
    baseY = Math.max(30, usableHeight - DIALOG_H - 70)
  } else if (quadrant === 3) {
    baseX = Math.max(30, usableWidth - DIALOG_W - 50)
    baseY = Math.max(30, usableHeight - DIALOG_H - 70)
  }

  const step = Math.floor(index / 4)
  const offsetX = (step * 45) % Math.max(120, usableWidth - DIALOG_W - 140)
  const offsetY = (step * 35) % Math.max(100, usableHeight - DIALOG_H - 140)

  const x = Math.max(10, Math.min(usableWidth - DIALOG_W - 10, baseX + (quadrant % 2 === 0 ? offsetX : -offsetX)))
  const y = Math.max(10, Math.min(usableHeight - DIALOG_H - 40, baseY + (quadrant < 2 ? offsetY : -offsetY)))

  return { x, y }
}

export function SetupSafetyApp({ windowId }: AppProps) {
  const { playSound, setWindowTitle, triggerSafetyTrainingCrash } = useOs()
  const [dialogs, setDialogs] = useState<Dialog[]>([])
  const [lineCount, setLineCount] = useState(1)
  const [progress, setProgress] = useState(0)
  const [isLagging, setIsLagging] = useState(true)
  const [showDeletionModal, setShowDeletionModal] = useState(false)
  const [deletionProgress, setDeletionProgress] = useState(0)
  const [deletingFileIndex, setDeletingFileIndex] = useState(0)

  const systemResourcesFree = Math.max(2, 78 - dialogs.length * 6)
  const gdiFree = Math.max(1, 52 - dialogs.length * 4)
  const displayedProgress = dialogs.length ? Math.min(96, 58 + Math.round((dialogs.length / CRASH_DIALOGS) * 38)) : progress
  const seq = useRef(0)
  const crashed = useRef(false)
  const crashTimer = useRef<number | null>(null)

  const isNotResponding = dialogs.length >= 6

  useEffect(() => {
    if (isNotResponding) {
      setWindowTitle(windowId, 'Windows 98 Setup Wizard (Not Responding)')
    } else {
      setWindowTitle(windowId, 'Windows 98 Setup Wizard')
    }
  }, [setWindowTitle, windowId, isNotResponding])

  const scheduleCrash = useCallback(
    (delayMs = 900) => {
      if (crashed.current || crashTimer.current !== null) return
      crashed.current = true
      setProgress(100)
      crashTimer.current = window.setTimeout(() => {
        triggerSafetyTrainingCrash()
      }, delayMs)
    },
    [triggerSafetyTrainingCrash],
  )

  const growDialogsTo = useCallback(
    (targetCount: number) => {
      setDialogs((current) => {
        if (crashed.current) return current
        const target = Math.min(CRASH_DIALOGS, Math.max(1, targetCount))
        if (current.length >= target) return current
        const next = [...current]
        while (next.length < target) {
          seq.current += 1
          const position = spreadDialogPoint(next.length)
          next.push({
            id: seq.current,
            x: position.x,
            y: position.y,
            title: rand(DIALOG_TITLES),
            message: rand(DIALOG_MESSAGES),
            showDetails: false,
          })
        }
        return next
      })
    },
    [],
  )

  const toggleDetails = useCallback((id: number) => {
    setDialogs((current) =>
      current.map((d) => (d.id === id ? { ...d, showDetails: !d.showDetails } : d)),
    )
  }, [])

  const handleDismissAndRespawn = useCallback(
    (id: number) => {
      // 1. Remove clicked dialog immediately
      setDialogs((current) => current.filter((d) => d.id !== id))
      playSound('error')
      setIsLagging(true)

      // 2. Wait 2 seconds (relief pause), then spawn 2 new dialogs back!
      window.setTimeout(() => {
        if (crashed.current) return
        setIsLagging(true)
        playSound('error')
        setDialogs((current) => {
          if (crashed.current) return current
          const next = [...current]
          const target = Math.min(CRASH_DIALOGS, current.length + 2)
          while (next.length < target) {
            seq.current += 1
            const position = spreadDialogPoint(next.length)
            next.push({
              id: seq.current,
              x: position.x,
              y: position.y,
              title: rand(DIALOG_TITLES),
              message: rand(DIALOG_MESSAGES),
              showDetails: false,
            })
          }
          return next
        })
        window.setTimeout(() => setIsLagging(false), 900)
      }, 2000)
    },
    [playSound],
  )

  useEffect(() => {
    playSound('error')
    const setupTimer = window.setInterval(() => {
      setLineCount((current) => Math.min(SETUP_LINES.length, current + 1))
      setProgress((current) => Math.min(96, current + 11))
    }, 420)
    const lagTimer = window.setTimeout(() => {
      setIsLagging(false)
    }, 1400)
    const firstDialog = window.setTimeout(() => {
      setProgress(64)
      growDialogsTo(2)
      playSound('error')
    }, 1250)
    return () => {
      window.clearInterval(setupTimer)
      window.clearTimeout(lagTimer)
      window.clearTimeout(firstDialog)
    }
  }, [growDialogsTo, playSound])

  useEffect(() => {
    if (!dialogs.length) return
    let modalTimer: number | undefined
    if (dialogs.length >= 10 && !showDeletionModal) {
      modalTimer = window.setTimeout(() => setShowDeletionModal(true), 0)
    }
    if (dialogs.length >= CRASH_DIALOGS) {
      scheduleCrash(1400)
    }
    return () => {
      if (modalTimer !== undefined) {
        window.clearTimeout(modalTimer)
      }
    }
  }, [dialogs.length, scheduleCrash, showDeletionModal])

  // Animated realistic simulated deletion progress
  useEffect(() => {
    if (!showDeletionModal) return
    const interval = window.setInterval(() => {
      setDeletionProgress((prev) => {
        const next = Math.min(100, prev + 8)
        if (next >= 100) {
          scheduleCrash(800)
        }
        return next
      })
      setDeletingFileIndex((prev) => (prev + 1) % DELETING_FILES.length)
    }, 280)
    return () => window.clearInterval(interval)
  }, [scheduleCrash, showDeletionModal])

  useEffect(
    () => () => {
      if (crashTimer.current !== null) {
        window.clearTimeout(crashTimer.current)
      }
    },
    [],
  )

  useEffect(() => {
    function handleCloseAttempt() {
      setIsLagging(true)
      playSound('error')
      growDialogsTo(dialogs.length + 2)
      window.setTimeout(() => setIsLagging(false), 800)
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && event.shiftKey) {
        event.preventDefault()
        scheduleCrash(0)
      }
    }
    window.addEventListener('setup-safety-close-attempt', handleCloseAttempt)
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('setup-safety-close-attempt', handleCloseAttempt)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [dialogs.length, growDialogsTo, playSound, scheduleCrash])

  return (
    <>
      <div className={`setup-safety-app ${isLagging ? 'is-lagging' : ''}`}>
        <div className="setup-safety-header">
          <span className="setup-safety-icon" aria-hidden="true">
            !
          </span>
          <div className="setup-safety-header-text">
            <h2>Windows 98 Setup Wizard {isNotResponding ? '(Not Responding)' : ''}</h2>
            <p>Installing Windows components. Please wait...</p>
          </div>
        </div>

        <div className="setup-safety-console" aria-live="polite">
          {SETUP_LINES.slice(0, lineCount).map((line) => (
            <div key={line}>{line}</div>
          ))}
          {dialogs.length > 0 && <div className="setup-safety-warn">Warning: System resources critically low ({systemResourcesFree}% free).</div>}
          {showDeletionModal && (
            <div className="setup-safety-critical">
              FATAL: File system structure unrecoverable on drive C:
            </div>
          )}
        </div>

        <div className="setup-safety-meter" aria-label={`Setup progress ${displayedProgress}%`}>
          <div style={{ width: `${displayedProgress}%` }} />
        </div>

        <div className="setup-safety-status">
          <span>{isNotResponding ? 'Status: Not Responding' : 'Copying files...'}</span>
          <span>System Resources: {systemResourcesFree}% free</span>
          <span>GDI: {gdiFree}% free</span>
        </div>
      </div>

      {createPortal(
        <div className={`setup-dialog-layer ${isLagging ? 'is-lagging' : ''}`} aria-live="assertive">
          {dialogs.length >= 8 && (
            <div className="setup-ghost-trails" aria-hidden="true">
              {dialogs.slice(0, 10).map((dialog, idx) => (
                <div
                  key={`ghost-${dialog.id}`}
                  className="setup-ghost-frame"
                  style={{
                    left: `${Math.round(dialog.x - 12)}px`,
                    top: `${Math.round(dialog.y - 12)}px`,
                    zIndex: 10 + idx,
                  }}
                >
                  <div className="setup-ghost-titlebar" />
                </div>
              ))}
            </div>
          )}

          {showDeletionModal && (
            <div className="simulated-deletion-modal" role="dialog" aria-label="Deleting...">
              <div className="setup-spam-titlebar deletion-titlebar">
                <span>Deleting...</span>
              </div>
              <div className="simulated-deletion-body">
                <div className="simulated-flying-animation" aria-hidden="true">
                  <span className="flying-folder-src">📁</span>
                  <span className="flying-paper-sheet">📄</span>
                  <span className="flying-folder-dest">🗑️</span>
                </div>
                <div className="simulated-deletion-info">
                  <p className="deletion-file-name">
                    <strong>Deleting:</strong> <code>{DELETING_FILES[deletingFileIndex]}</code>
                  </p>
                  <p className="deletion-file-dest">
                    From 'SYSTEM' to 'Recycle Bin'
                  </p>
                  <p className="deletion-time-est">
                    Estimated time remaining: Calculating...
                  </p>
                </div>
              </div>
              <div className="simulated-deletion-meter">
                <div style={{ width: `${deletionProgress}%` }} />
              </div>
              <div className="simulated-deletion-actions">
                <button type="button" disabled className="deletion-cancel-btn">
                  Cancel
                </button>
              </div>
            </div>
          )}

          {dialogs.map((dialog) => (
            <div
              className={`setup-spam-dialog ${dialog.showDetails ? 'has-details' : ''}`}
              key={dialog.id}
              style={{ left: `${Math.round(dialog.x)}px`, top: `${Math.round(dialog.y)}px`, zIndex: 20 + dialog.id }}
            >
              <div className="setup-spam-titlebar">
                <span>{dialog.title}</span>
                <button type="button" aria-label="Close" onClick={() => handleDismissAndRespawn(dialog.id)}>
                  ✕
                </button>
              </div>
              <div className="setup-spam-body">
                <span className="setup-spam-icon" aria-hidden="true">
                  ✕
                </span>
                <div className="setup-spam-text">
                  <p>{dialog.message}</p>
                </div>
              </div>
              <div className="setup-spam-actions">
                <button type="button" onClick={() => handleDismissAndRespawn(dialog.id)}>
                  Close
                </button>
                <button type="button" onClick={() => toggleDetails(dialog.id)}>
                  {dialog.showDetails ? '<< Details' : 'Details >>'}
                </button>
              </div>
              {dialog.showDetails && (
                <div className="setup-spam-details-pane">
                  <pre>{getRegisterDump(dialog.title)}</pre>
                </div>
              )}
            </div>
          ))}
        </div>,
        document.body,
      )}
    </>
  )
}

