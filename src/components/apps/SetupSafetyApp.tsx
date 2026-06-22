import './SetupSafetyApp.css'
import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { AppProps } from '../../types'
import { useOs } from '../../os/useOs'

type Dialog = { id: number; x: number; y: number; title: string; message: string }

const DIALOG_TITLES = ['Fatal Error', 'System Error', 'Warning', 'Error', 'Critical Error', 'Windows']
const DIALOG_MESSAGES = [
  'A fatal exception 0E has occurred in USER32.',
  'SETUP.EXE has performed an illegal operation and will be shut down.',
  'Cannot close SETUP.BAT: system resources are busy.',
  'The application failed to respond to the close request.',
  'Memory could not be read at address 0xC0DEDBAD.',
  'WIN.COM has stopped responding.',
  'System resources are dangerously low.',
  'The current task cannot be completed.',
]

const SETUP_LINES = [
  'C:\\WINDOWS\\COMMAND> setup.bat',
  'Portfolio Setup Utility 4.10.1998',
  'Checking package manifest...',
  'Extracting desktop component...',
  'Registering USER32 dialog hooks...',
  'Updating setup state...',
]

const CRASH_DIALOGS = 32
const DIALOG_W = 320
const DIALOG_H = 150

function rand<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)]
}

function randomDialogPoint(): { x: number; y: number } {
  const usableWidth = window.innerWidth
  const usableHeight = window.innerHeight - 36
  return {
    x: Math.random() * Math.max(10, usableWidth - DIALOG_W - 12) + 6,
    y: Math.random() * Math.max(10, usableHeight - DIALOG_H - 12) + 6,
  }
}

function distanceScore(point: { x: number; y: number }, dialogs: Dialog[]): number {
  if (!dialogs.length) return Number.POSITIVE_INFINITY
  const centerX = point.x + DIALOG_W / 2
  const centerY = point.y + DIALOG_H / 2
  return Math.min(
    ...dialogs.map((dialog) => {
      const dx = centerX - (dialog.x + DIALOG_W / 2)
      const dy = centerY - (dialog.y + DIALOG_H / 2)
      return dx * dx + dy * dy
    }),
  )
}

function dialogPosition(dialogs: Dialog[]): { x: number; y: number } {
  let best = randomDialogPoint()
  let bestScore = distanceScore(best, dialogs)
  for (let i = 0; i < 8; i += 1) {
    const candidate = randomDialogPoint()
    const score = distanceScore(candidate, dialogs)
    if (score > bestScore) {
      best = candidate
      bestScore = score
    }
  }
  return best
}

export function SetupSafetyApp({ windowId }: AppProps) {
  const { playSound, setWindowTitle, triggerSafetyTrainingCrash } = useOs()
  const [dialogs, setDialogs] = useState<Dialog[]>([])
  const [lineCount, setLineCount] = useState(1)
  const [progress, setProgress] = useState(0)
  const displayedProgress = dialogs.length ? Math.min(96, 58 + Math.round((dialogs.length / CRASH_DIALOGS) * 38)) : progress
  const seq = useRef(0)
  const crashed = useRef(false)
  const crashTimer = useRef<number | null>(null)

  useEffect(() => {
    setWindowTitle(windowId, 'setup.bat - Running')
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
          const position = dialogPosition(next)
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

  const intensify = useCallback(
    () => {
      const currentCount = dialogs.length
      growDialogsTo(currentCount ? currentCount * 2 : 1)
      playSound('warn')
    },
    [dialogs.length, growDialogsTo, playSound],
  )

  useEffect(() => {
    playSound('error')
    const setupTimer = window.setInterval(() => {
      setLineCount((current) => Math.min(SETUP_LINES.length, current + 1))
      setProgress((current) => Math.min(96, current + 11))
    }, 420)
    const firstDialog = window.setTimeout(() => {
      setProgress(64)
      growDialogsTo(1)
      playSound('error')
    }, 1250)
    return () => {
      window.clearInterval(setupTimer)
      window.clearTimeout(firstDialog)
    }
  }, [growDialogsTo, playSound])

  useEffect(() => {
    if (!dialogs.length) return
    if (dialogs.length >= CRASH_DIALOGS) {
      scheduleCrash(1400)
    }
  }, [dialogs.length, scheduleCrash])

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
      intensify()
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
  }, [intensify, scheduleCrash])

  return (
    <>
      <div className="setup-safety-app">
        <div className="setup-safety-header">
          <span className="setup-safety-icon" aria-hidden="true">
            !
          </span>
          <div>
            <h2>Portfolio Setup Wizard</h2>
            <p>Installing optional desktop component. Please wait...</p>
          </div>
        </div>

        <div className="setup-safety-console" aria-live="polite">
          {SETUP_LINES.slice(0, lineCount).map((line) => (
            <div key={line}>{line}</div>
          ))}
          {dialogs.length > 0 && <div className="setup-safety-warn">Warning: unexpected dialog recursion detected.</div>}
        </div>

        <div className="setup-safety-meter" aria-label={`Setup progress ${displayedProgress}%`}>
          <div style={{ width: `${displayedProgress}%` }} />
        </div>

        <div className="setup-safety-status">
          <span>Running setup.bat</span>
          <span>{dialogs.length ? `${dialogs.length} dialog(s)` : 'Preparing'}</span>
        </div>
      </div>

      {createPortal(
        <div className="setup-dialog-layer" aria-live="assertive">
          {dialogs.map((dialog) => (
            <div
              className="setup-spam-dialog"
              key={dialog.id}
              style={{ left: `${Math.round(dialog.x)}px`, top: `${Math.round(dialog.y)}px`, zIndex: 20 + dialog.id }}
            >
              <div className="setup-spam-titlebar">
                <span>{dialog.title}</span>
                <button type="button" aria-label="Close" onClick={intensify}>
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
                <button type="button" onClick={intensify}>
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
