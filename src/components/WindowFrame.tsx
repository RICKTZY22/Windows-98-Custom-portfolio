import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react'
import { win98Icons } from '../data/icons'
import type { WindowRect, WindowState } from '../types'

type WindowFrameProps = {
  window: WindowState
  active: boolean
  children: ReactNode
  onFocus: (instanceId: string) => void
  onClose: (instanceId: string) => void
  onMinimize: (instanceId: string) => void
  onToggleMaximize: (instanceId: string) => void
  onMove: (instanceId: string, rect: WindowRect) => void
}

type DragState = {
  pointerId: number
  offsetX: number
  offsetY: number
}

type ResizeDirection = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw'

type ResizeState = {
  pointerId: number
  direction: ResizeDirection
  startX: number
  startY: number
  startRect: WindowRect
}

const taskbarHeight = 34
const minWindowWidth = 280
const minWindowHeight = 220

function clampWindow(rect: WindowRect): WindowRect {
  const viewportWidth = window.innerWidth
  const viewportHeight = window.innerHeight - taskbarHeight
  const width = Math.min(Math.max(minWindowWidth, rect.width), Math.max(minWindowWidth, viewportWidth - 16))
  const height = Math.min(Math.max(minWindowHeight, rect.height), Math.max(minWindowHeight, viewportHeight - 16))
  return {
    width,
    height,
    x: Math.max(8, Math.min(rect.x, viewportWidth - width - 8)),
    y: Math.max(8, Math.min(rect.y, viewportHeight - height - 8)),
  }
}

function resizeWindowRect(resize: ResizeState, clientX: number, clientY: number): WindowRect {
  const dx = clientX - resize.startX
  const dy = clientY - resize.startY
  const next = { ...resize.startRect }

  if (resize.direction.includes('e')) {
    next.width = resize.startRect.width + dx
  }
  if (resize.direction.includes('s')) {
    next.height = resize.startRect.height + dy
  }
  if (resize.direction.includes('w')) {
    next.width = resize.startRect.width - dx
    next.x = resize.startRect.x + dx
    if (next.width < minWindowWidth) {
      next.x = resize.startRect.x + resize.startRect.width - minWindowWidth
      next.width = minWindowWidth
    }
  }
  if (resize.direction.includes('n')) {
    next.height = resize.startRect.height - dy
    next.y = resize.startRect.y + dy
    if (next.height < minWindowHeight) {
      next.y = resize.startRect.y + resize.startRect.height - minWindowHeight
      next.height = minWindowHeight
    }
  }

  return clampWindow(next)
}

export function WindowFrame({
  window: windowState,
  active,
  children,
  onFocus,
  onClose,
  onMinimize,
  onToggleMaximize,
  onMove,
}: WindowFrameProps) {
  const dragRef = useRef<DragState | null>(null)
  const resizeRef = useRef<ResizeState | null>(null)
  const frameRef = useRef<number | null>(null)
  const pendingRectRef = useRef<WindowRect | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isResizing, setIsResizing] = useState(false)

  useEffect(() => {
    function handlePointerMove(event: PointerEvent) {
      const drag = dragRef.current
      const resize = resizeRef.current
      if (windowState.maximized) {
        return
      }

      if (drag && drag.pointerId === event.pointerId) {
        pendingRectRef.current = clampWindow({
          x: event.clientX - drag.offsetX,
          y: event.clientY - drag.offsetY,
          width: windowState.width,
          height: windowState.height,
        })
      } else if (resize && resize.pointerId === event.pointerId) {
        pendingRectRef.current = resizeWindowRect(resize, event.clientX, event.clientY)
      } else {
        return
      }

      if (frameRef.current === null) {
        frameRef.current = window.requestAnimationFrame(() => {
          frameRef.current = null
          if (pendingRectRef.current) {
            onMove(windowState.instanceId, pendingRectRef.current)
          }
        })
      }
    }

    function handlePointerUp(event: PointerEvent) {
      if (dragRef.current?.pointerId === event.pointerId) {
        dragRef.current = null
        pendingRectRef.current = null
        setIsDragging(false)
      }
      if (resizeRef.current?.pointerId === event.pointerId) {
        resizeRef.current = null
        pendingRectRef.current = null
        setIsResizing(false)
      }
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
  }, [onMove, windowState])

  const style = windowState.maximized
    ? { zIndex: windowState.zIndex }
    : {
        width: windowState.width,
        height: windowState.height,
        zIndex: windowState.zIndex,
        transform: `translate3d(${windowState.x}px, ${windowState.y}px, 0)`,
      }

  const className = [
    'window',
    'win-window',
    active ? 'is-active' : '',
    windowState.maximized ? 'is-maximized' : '',
    isDragging ? 'is-dragging' : '',
    isResizing ? 'is-resizing' : '',
  ]
    .filter(Boolean)
    .join(' ')

  function startDrag(event: ReactPointerEvent<HTMLDivElement>) {
    if (windowState.maximized || event.button !== 0) {
      return
    }
    onFocus(windowState.instanceId)
    setIsDragging(true)
    dragRef.current = {
      pointerId: event.pointerId,
      offsetX: event.clientX - windowState.x,
      offsetY: event.clientY - windowState.y,
    }
  }

  function startResize(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.button !== 0) {
      return
    }
    const direction = event.currentTarget.dataset.direction as ResizeDirection | undefined
    if (!direction) {
      return
    }
    event.stopPropagation()
    onFocus(windowState.instanceId)
    setIsResizing(true)
    resizeRef.current = {
      pointerId: event.pointerId,
      direction,
      startX: event.clientX,
      startY: event.clientY,
      startRect: {
        x: windowState.x,
        y: windowState.y,
        width: windowState.width,
        height: windowState.height,
      },
    }
  }

  return (
    <section
      className={className}
      style={style}
      aria-label={windowState.title}
      onPointerDown={() => onFocus(windowState.instanceId)}
    >
      <div
        className={`title-bar ${active ? '' : 'inactive'}`}
        onDoubleClick={() => onToggleMaximize(windowState.instanceId)}
        onPointerDown={startDrag}
      >
        <div className="title-bar-text">
          <img src={win98Icons[windowState.icon]} alt="" />
          <span>{windowState.title}</span>
        </div>
        <div className="title-bar-controls" onPointerDown={(event) => event.stopPropagation()}>
          <button aria-label="Minimize" type="button" onClick={() => onMinimize(windowState.instanceId)} />
          <button
            aria-label={windowState.maximized ? 'Restore' : 'Maximize'}
            type="button"
            onClick={() => onToggleMaximize(windowState.instanceId)}
          />
          <button aria-label="Close" type="button" onClick={() => onClose(windowState.instanceId)} />
        </div>
      </div>
      <div className="window-body app-window-body">{children}</div>
      {!windowState.maximized &&
        (['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'] as ResizeDirection[]).map((direction) => (
          <div
            key={direction}
            className={`resize-handle resize-${direction}`}
            data-direction={direction}
            onPointerDown={startResize}
            aria-hidden="true"
          />
        ))}
    </section>
  )
}
