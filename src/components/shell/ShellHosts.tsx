import { useEffect, useRef, useState } from 'react'
import type { MessageBoxButton, MessageBoxRequest, OsNotification } from '../../types'
import { win98Icons } from '../../data/icons'
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

const MESSAGE_ICON_GLYPHS: Record<MessageBoxRequest['icon'], string> = {
  error: 'x',
  warning: '!',
  info: 'i',
  question: '?',
}

const MESSAGE_BUTTON_LABELS: Record<MessageBoxButton, string> = {
  ok: 'OK',
  cancel: 'Cancel',
  yes: 'Yes',
  no: 'No',
  retry: 'Retry',
  abort: 'Abort',
}

function closeButtonFor(buttons: readonly MessageBoxButton[]): MessageBoxButton {
  if (buttons.includes('cancel')) return 'cancel'
  if (buttons.includes('no')) return 'no'
  if (buttons.includes('ok')) return 'ok'
  return buttons[0] ?? 'ok'
}

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
        <section
          key={box.id}
          className="window message-box"
          role="alertdialog"
          aria-label={box.title}
          aria-modal="true"
        >
          <div className="title-bar">
            <div className="title-bar-text">{box.title}</div>
            <div className="title-bar-controls">
              <button
                type="button"
                aria-label="Close"
                onClick={() => dismissMessageBox(box.id, closeButtonFor(box.buttons))}
              />
            </div>
          </div>
          <div className="window-body message-box-body">
            <div className="message-box-copy">
              <span className={`message-icon message-icon-${box.icon}`} aria-hidden="true">
                {MESSAGE_ICON_GLYPHS[box.icon]}
              </span>
              <div>
                <p>{box.message}</p>
                {box.detail && <p className="message-detail">{box.detail}</p>}
                {box.errorCode && <p className="message-code">Code: {box.errorCode}</p>}
              </div>
            </div>
            <div className="button-row run-buttons">
              {box.buttons.map((button) => (
                <button key={button} type="button" onClick={() => dismissMessageBox(box.id, button)}>
                  {MESSAGE_BUTTON_LABELS[button]}
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
  onAction,
}: Readonly<{ note: OsNotification; onDismiss: (id: string) => void; onAction: (note: OsNotification) => void }>) {
  useEffect(() => {
    const timer = window.setTimeout(() => onDismiss(note.id), 6500)
    return () => window.clearTimeout(timer)
  }, [note.id, onDismiss])
  const icon = note.icon ?? (note.kind === 'success' ? 'windowsSmall' : note.kind === 'warning' ? 'help' : note.kind === 'error' ? 'sysFile' : 'adminTools')
  return (
    <div className={`tray-balloon tray-balloon-${note.kind}`} role="status">
      <button
        type="button"
        className="tray-balloon-close"
        aria-label="Dismiss"
        onClick={() => onDismiss(note.id)}
      >
        x
      </button>
      <img className="tray-balloon-icon" src={win98Icons[icon]} alt="" />
      <div className="tray-balloon-copy">
        <strong>
          {note.title}
          {note.count > 1 ? <em> x{note.count}</em> : null}
        </strong>
        <span>{note.body}</span>
        {note.action && (
          <button type="button" className="tray-balloon-action" onClick={() => onAction(note)}>
            {note.action.label}
          </button>
        )}
      </div>
    </div>
  )
}

export function NotificationHost() {
  const { state, dismissNotification, openApp } = useOs()
  if (!state.notifications.length) return null
  function runAction(note: OsNotification) {
    if (!note.action) return
    openApp(note.action.appId, note.action.payload)
    dismissNotification(note.id)
  }
  return (
    <div className="tray-balloon-layer" aria-live="polite">
      {state.notifications.map((note) => (
        <NotificationBalloon key={note.id} note={note} onDismiss={dismissNotification} onAction={runAction} />
      ))}
    </div>
  )
}
