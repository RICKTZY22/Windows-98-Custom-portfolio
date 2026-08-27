import './SetupSafetyApp.css'
import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { AppProps } from '../../types'
import { useOs } from '../../os/useOs'

type Dialog = { id: number; x: number; y: number; title: string; message: string }

const DIALOG_TITLES = ['Runtime Error', 'Application Error', 'Portfolio OS Warning', 'System Notice', 'Windows']
const DIALOG_MESSAGES = [
  'A simulated runtime error occurred inside TESTDONTOUCH.EXE.',
  'The portfolio OS blocked an unsafe dialog loop.',
  'No real files, downloads, or host system settings were changed.',
  'The close request failed because the sandbox is demonstrating repeated popups.',
  'System resources are low inside the simulation.',
  'Restart or Recovery returns the desktop to a clean state.',
]

const SETUP_LINES = [
  'C:\\MY DOCUMENTS\\PRIVATE> testdontouch.exe',
  'Portfolio Setup Utility 4.10.1998',
  '[SIMULATING OS LAG] Allocating 4 MB buffer per popup thread...',
  'Checking package manifest...',
  'Extracting desktop component...',
  'Registering USER32 dialog hooks...',
  'Updating setup state...',
]

const CRASH_DIALOGS = 32
const DIALOG_W = 340
const DIALOG_H = 150

function rand<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)]
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
  const [deletedFileCount, setDeletedFileCount] = useState(120)

  const simulatedRamMb = 64 + dialogs.length * 4
  const displayedProgress = dialogs.length ? Math.min(96, 58 + Math.round((dialogs.length / CRASH_DIALOGS) * 38)) : progress
  const seq = useRef(0)
  const crashed = useRef(false)
  const crashTimer = useRef<number | null>(null)

  useEffect(() => {
    setWindowTitle(windowId, 'testdontouch.exe - Running')
  }, [setWindowTitle, windowId])

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
          })
        }
        return next
      })
    },
    [],
  )

  const handleDismissAndRespawn = useCallback(
    (id: number) => {
      // 1. Remove clicked dialog immediately
      setDialogs((current) => current.filter((d) => d.id !== id))
      playSound('error')
      setIsLagging(true)

      // 2. Wait 2 seconds, then spawn 2 new dialogs back!
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
      setDeletedFileCount((prev) => prev + Math.floor(Math.random() * 320 + 150))
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
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && event.shiftKey) {
        event.preventDefault()
        scheduleCrash(0)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [scheduleCrash])

  return (
    <>
      <div className={`setup-safety-app ${isLagging ? 'is-lagging' : ''}`}>
        {isLagging && (
          <div className="setup-lag-banner" aria-live="polite">
            ⚠️ [SIMULATED OS LAG] High CPU Load: USER32.DLL thread delayed...
          </div>
        )}
        <div className="setup-safety-header">
          <span className="setup-safety-icon" aria-hidden="true">
            !
          </span>
          <div className="setup-safety-header-text">
            <h2>Portfolio Setup Wizard</h2>
            <p>Installing optional desktop component. Please wait...</p>
          </div>
          <button
            type="button"
            className="setup-safety-bypass-btn"
            onClick={() => scheduleCrash(0)}
            title="Bypass simulation test and view safety lesson (Shift+Esc)"
          >
            Safety Bypass
          </button>
        </div>

        <div className="setup-safety-console" aria-live="polite">
          {SETUP_LINES.slice(0, lineCount).map((line) => (
            <div key={line}>{line}</div>
          ))}
          {dialogs.length > 0 && <div className="setup-safety-warn">Warning: unexpected dialog recursion (+4 MB per popup).</div>}
          {showDeletionModal && (
            <div className="setup-safety-critical">
              CRITICAL: [SIMULATION] Purging virtual path C:\WINDOWS\SYSTEM32...
            </div>
          )}
        </div>

        <div className="setup-safety-meter" aria-label={`Setup progress ${displayedProgress}%`}>
          <div style={{ width: `${displayedProgress}%` }} />
        </div>

        <div className="setup-safety-status">
          <span>Running testdontouch.exe</span>
          <span>{dialogs.length ? `${dialogs.length} dialog(s)` : 'Preparing'}</span>
          <span>Simulated RAM: {simulatedRamMb} MB</span>
        </div>
      </div>

      {createPortal(
        <div className="setup-dialog-layer" aria-live="assertive">
          {showDeletionModal && (
            <div className="simulated-deletion-modal" role="dialog" aria-label="Deleting C:\ Files">
              <div className="setup-spam-titlebar deletion-titlebar">
                <span>Deleting C:\WINDOWS\SYSTEM32\...</span>
              </div>
              <div className="simulated-deletion-body">
                <div className="simulated-flying-icon" aria-hidden="true">
                  📄 ➔ 📁
                </div>
                <div className="simulated-deletion-info">
                  <p>
                    <strong>Deleting file:</strong>
                  </p>
                  <code>C:\WINDOWS\SYSTEM32\kernel32.dll</code>
                  <p className="simulated-deletion-count">
                    Deleted {deletedFileCount} of 4,820 files (Simulation Sandbox Test)
                  </p>
                </div>
              </div>
              <div className="simulated-deletion-meter">
                <div style={{ width: `${deletionProgress}%` }} />
              </div>
              <div className="simulated-deletion-note">
                Educational simulation only - No host files affected.
              </div>
            </div>
          )}

          {dialogs.map((dialog) => (
            <div
              className="setup-spam-dialog"
              key={dialog.id}
              style={{ left: `${Math.round(dialog.x)}px`, top: `${Math.round(dialog.y)}px`, zIndex: 20 + dialog.id }}
            >
              <div className="setup-spam-titlebar">
                <span>{dialog.title}</span>
                <button type="button" aria-label="Close" onClick={() => handleDismissAndRespawn(dialog.id)}>
                  x
                </button>
              </div>
              <div className="setup-spam-body">
                <span className="setup-spam-icon" aria-hidden="true">
                  x
                </span>
                <p>{dialog.message}</p>
              </div>
              <div className="setup-spam-actions">
                <button type="button" onClick={() => handleDismissAndRespawn(dialog.id)}>
                  OK
                </button>
              </div>
            </div>
          ))}
        </div>,
        document.body,
      )}
    </>
  )
}

