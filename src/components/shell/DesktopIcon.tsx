import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import type { DesktopIconDef, Point } from '../../types'
import { win98Icons } from '../../data/icons'

type DesktopIconProps = {
  iconDef: DesktopIconDef
  position: Point
  selected: boolean
  // FS-backed shortcuts can be dragged onto the Recycle Bin to delete them; the
  // hardcoded system icons (My Computer, Recycle Bin itself, ...) cannot.
  deletable?: boolean
  // Highlights this icon as the active drop target (used for the Recycle Bin).
  highlighted?: boolean
  shortcut?: boolean
  tooltip?: string
  onSelect: (extend?: boolean) => void
  onOpen: () => void
  onMove: (id: string, position: Point) => void
  onRecycleHoverChange?: (hovering: boolean) => void
  onDropOnRecycle?: (id: string) => void
}

type DragState = {
  pointerId: number
  startX: number
  startY: number
  startPosition: Point
  moved: boolean
}

const dragThreshold = 4

/** True when the client point falls inside the Recycle Bin desktop icon. */
function pointerOverRecycleBin(clientX: number, clientY: number): boolean {
  const bin = document.querySelector('[data-desktop-icon-id="recycleBin"]')
  if (!bin) return false
  const rect = bin.getBoundingClientRect()
  return clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom
}

export function DesktopIcon({
  iconDef,
  position,
  selected,
  deletable = false,
  highlighted = false,
  shortcut = false,
  tooltip,
  onSelect,
  onOpen,
  onMove,
  onRecycleHoverChange,
  onDropOnRecycle,
}: DesktopIconProps) {
  const dragRef = useRef<DragState | null>(null)
  const frameRef = useRef<number | null>(null)
  const pendingPositionRef = useRef<Point | null>(null)
  const suppressClickRef = useRef(false)
  // Tracks whether the pointer is currently over the Recycle Bin during a drag,
  // so we report hover changes once and decide delete-vs-move on release.
  const overBinRef = useRef(false)
  const [isDragging, setIsDragging] = useState(false)

  useEffect(() => {
    function flushPendingPosition() {
      if (!pendingPositionRef.current) {
        return
      }
      onMove(iconDef.id, pendingPositionRef.current)
    }

    function setBinHover(over: boolean) {
      if (over === overBinRef.current) {
        return
      }
      overBinRef.current = over
      onRecycleHoverChange?.(over)
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

      if (deletable) {
        setBinHover(pointerOverRecycleBin(event.clientX, event.clientY))
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
        if (deletable && overBinRef.current) {
          // Dropped on the Recycle Bin: delete it instead of repositioning.
          onDropOnRecycle?.(iconDef.id)
        } else {
          flushPendingPosition()
        }
      }

      setBinHover(false)
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
  }, [iconDef.id, onMove, deletable, onRecycleHoverChange, onDropOnRecycle])

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
      className={`desktop-icon ${selected ? 'selected' : ''} ${isDragging ? 'is-dragging' : ''} ${highlighted ? 'drop-target' : ''} ${shortcut ? 'is-shortcut' : ''}`}
      type="button"
      data-desktop-icon-id={iconDef.id}
      style={{ transform: `translate3d(${position.x}px, ${position.y}px, 0)` }}
      aria-label={`${iconDef.label}. Press Enter or double-click to open.`}
      title={tooltip ?? `${iconDef.label}\nDouble-click to open.`}
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
          // Stop the desktop's window-level keydown handler from also firing for
          // this same key press; otherwise both open the app in one tick and the
          // stale-state dedupe in openApp can spawn two windows with one instanceId.
          event.stopPropagation()
          onOpen()
        }
      }}
    >
      <img src={win98Icons[iconDef.icon]} alt="" />
      <span>{iconDef.label}</span>
    </button>
  )
}
