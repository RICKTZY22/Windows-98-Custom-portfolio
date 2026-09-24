import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
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
  // Per-box drag offset, so a dialog can be dragged by its title bar like a real
  // Win98 message box (they are centered until moved).
  const [offsets, setOffsets] = useState<Record<string, { x: number; y: number }>>({})
  const dragRef = useRef<{ id: string; startX: number; startY: number; baseX: number; baseY: number } | null>(null)

  useEffect(() => {
    function onMove(event: PointerEvent) {
      const drag = dragRef.current
      if (!drag) return
      setOffsets((current) => ({
        ...current,
        [drag.id]: { x: drag.baseX + (event.clientX - drag.startX), y: drag.baseY + (event.clientY - drag.startY) },
      }))
    }
    function onUp() {
      dragRef.current = null
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
    }
  }, [])

  // Only one dialog is ever on screen: the queue shows its first box, and
  // dismissing it reveals the next (e.g. deleting several driver files pops the
  // errors one by one). A suppressed duplicate shakes the visible one instead.
  const box = state.messageBoxes[0]
  if (!box) return null
  return (
    <div className="message-box-layer" role="presentation">
      <MessageBoxCard
        key={box.id}
        box={box}
        offset={offsets[box.id] ?? { x: 0, y: 0 }}
        onTitlePointerDown={(event) => {
          if (event.button !== 0) return
          const base = offsets[box.id] ?? { x: 0, y: 0 }
          dragRef.current = { id: box.id, startX: event.clientX, startY: event.clientY, baseX: base.x, baseY: base.y }
        }}
        onButton={(button) => dismissMessageBox(box.id, button)}
      />
    </div>
  )
}

function MessageBoxCard({
  box,
  offset,
  onTitlePointerDown,
  onButton,
}: Readonly<{
  box: MessageBoxRequest
  offset: { x: number; y: number }
  onTitlePointerDown: (event: ReactPointerEvent<HTMLDivElement>) => void
  onButton: (button: MessageBoxButton) => void
}>) {
  const sectionRef = useRef<HTMLElement | null>(null)
  useEffect(() => {
    // shakeNonce is undefined on a fresh box and only bumps when a duplicate is
    // suppressed, so the dialog nudges instead of stacking. Restart the CSS
    // animation imperatively (remove class, force reflow, re-add) each bump.
    if (!box.shakeNonce) return
    const el = sectionRef.current
    if (!el) return
    el.classList.remove('is-shaking')
    void el.offsetWidth
    el.classList.add('is-shaking')
  }, [box.shakeNonce])

  return (
    <section
      ref={sectionRef}
      className="window message-box"
      role="alertdialog"
      aria-label={box.title}
      aria-modal="true"
      style={{ marginLeft: offset.x, marginTop: offset.y }}
    >
      <div className="title-bar" onPointerDown={onTitlePointerDown}>
        <div className="title-bar-text">{box.title}</div>
        <div className="title-bar-controls">
          <button type="button" aria-label="Close" onClick={() => onButton(closeButtonFor(box.buttons))} />
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
            <button key={button} type="button" onClick={() => onButton(button)}>
              {MESSAGE_BUTTON_LABELS[button]}
            </button>
          ))}
        </div>
      </div>
    </section>
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
