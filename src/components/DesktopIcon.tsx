import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import type { AppDefinition, AppId, DesktopIconPosition } from '../types'
import { win98Icons } from '../data/icons'

type DesktopIconProps = {
  app: AppDefinition
  position: DesktopIconPosition
  selected: boolean
  onSelect: () => void
  onOpen: () => void
  onMove: (appId: AppId, position: DesktopIconPosition) => void
}

type DragState = {
  pointerId: number
  startX: number
  startY: number
  startPosition: DesktopIconPosition
  moved: boolean
}

const dragThreshold = 4

export function DesktopIcon({ app, position, selected, onSelect, onOpen, onMove }: DesktopIconProps) {
  const dragRef = useRef<DragState | null>(null)
  const frameRef = useRef<number | null>(null)
  const pendingPositionRef = useRef<DesktopIconPosition | null>(null)
  const suppressClickRef = useRef(false)
  const [isDragging, setIsDragging] = useState(false)

  useEffect(() => {
    function flushPendingPosition() {
      if (!pendingPositionRef.current) {
        return
      }
      onMove(app.id, pendingPositionRef.current)
    }

    function handlePointerMove(event: PointerEvent) {
      const drag = dragRef.current
      if (!drag || drag.pointerId !== event.pointerId) {
        return
      }

      const deltaX = event.clientX - drag.startX
      const deltaY = event.clientY - drag.startY
      if (!drag.moved && Math.abs(deltaX) < dragThreshold && Math.abs(deltaY) < dragThreshold) {
        return
      }

      drag.moved = true
      setIsDragging(true)
      pendingPositionRef.current = {
        x: drag.startPosition.x + deltaX,
        y: drag.startPosition.y + deltaY,
      }

      if (frameRef.current === null) {
        frameRef.current = window.requestAnimationFrame(() => {
          frameRef.current = null
          flushPendingPosition()
        })
      }
    }

    function handlePointerUp(event: PointerEvent) {
      const drag = dragRef.current
      if (!drag || drag.pointerId !== event.pointerId) {
        return
      }

      if (drag.moved) {
        suppressClickRef.current = true
        if (frameRef.current !== null) {
          window.cancelAnimationFrame(frameRef.current)
          frameRef.current = null
        }
        flushPendingPosition()
      }

      dragRef.current = null
      pendingPositionRef.current = null
      setIsDragging(false)
    }

    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerUp)
    window.addEventListener('pointercancel', handlePointerUp)

    return () => {
      if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current)
      }
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
      window.removeEventListener('pointercancel', handlePointerUp)
    }
  }, [app.id, onMove])

  function startDrag(event: ReactPointerEvent<HTMLButtonElement>) {
    if (event.button !== 0) {
      return
    }

    onSelect()
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startPosition: position,
      moved: false,
    }
  }

  return (
    <button
      className={`desktop-icon ${selected ? 'selected' : ''} ${isDragging ? 'is-dragging' : ''}`}
      type="button"
      style={{ transform: `translate3d(${position.x}px, ${position.y}px, 0)` }}
      aria-label={`${app.title}. Press Enter or double-click to open.`}
      onPointerDown={startDrag}
      onClick={(event) => {
        if (suppressClickRef.current) {
          suppressClickRef.current = false
          event.preventDefault()
          return
        }
        onSelect()
        if (event.detail >= 2) {
          onOpen()
        }
      }}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onOpen()
        }
      }}
    >
      <img src={win98Icons[app.icon]} alt="" />
      <span>{app.title}</span>
    </button>
  )
}
