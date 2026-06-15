import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import type { DesktopIconDef, Point } from '../types'
import { win98Icons } from '../data/icons'

type DesktopIconProps = {
  iconDef: DesktopIconDef
  position: Point
  selected: boolean
  onSelect: (extend?: boolean) => void
  onOpen: () => void
  onMove: (id: string, position: Point) => void
}

type DragState = {
  pointerId: number
  startX: number
  startY: number
  startPosition: Point
  moved: boolean
}

const dragThreshold = 4

export function DesktopIcon({ iconDef, position, selected, onSelect, onOpen, onMove }: DesktopIconProps) {
  const dragRef = useRef<DragState | null>(null)
  const frameRef = useRef<number | null>(null)
  const pendingPositionRef = useRef<Point | null>(null)
  const suppressClickRef = useRef(false)
  const [isDragging, setIsDragging] = useState(false)

  useEffect(() => {
    function flushPendingPosition() {
      if (!pendingPositionRef.current) {
        return
      }
      onMove(iconDef.id, pendingPositionRef.current)
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
  }, [iconDef.id, onMove])

  function startDrag(event: ReactPointerEvent<HTMLButtonElement>) {
    if (event.button !== 0) {
      return
    }

    if (!event.ctrlKey && !event.shiftKey) {
      onSelect(false)
    }
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
      data-desktop-icon-id={iconDef.id}
      style={{ transform: `translate3d(${position.x}px, ${position.y}px, 0)` }}
      aria-label={`${iconDef.label}. Press Enter or double-click to open.`}
      onPointerDown={startDrag}
      onClick={(event) => {
        if (suppressClickRef.current) {
          suppressClickRef.current = false
          event.preventDefault()
          return
        }
        onSelect(event.ctrlKey || event.shiftKey)
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
      <img src={win98Icons[iconDef.icon]} alt="" />
      <span>{iconDef.label}</span>
    </button>
  )
}
