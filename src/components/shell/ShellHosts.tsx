import { useEffect, useRef, useState } from 'react'
import type { OsNotification } from '../../types'
import { useOs } from '../../os/useOs'

type MouseTrailPoint = {
  id: number
  x: number
  y: number
  opacity: number
}

const TRAIL_MAX = 7
const TRAIL_THROTTLE_MS = 24
const TRAIL_CLEAR_MS = 140

export function MouseTrails() {
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

export function MessageBoxHost() {
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

function NotificationBalloon({
  note,
  onDismiss,
}: Readonly<{ note: OsNotification; onDismiss: (id: string) => void }>) {
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
        x
      </button>
      <strong>{note.title}</strong>
      <span>{note.body}</span>
    </div>
  )
}

export function NotificationHost() {
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
