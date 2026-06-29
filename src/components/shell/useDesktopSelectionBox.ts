import { useCallback, useEffect, useState, type PointerEvent as ReactPointerEvent, type RefObject } from 'react'
import type { DesktopIconDef, Point } from '../../types'
import { intersectsIcon, normalizeRect, type SelectionBox } from './desktopModel'

type UseDesktopSelectionBoxOptions = {
  desktopRef: RefObject<HTMLDivElement | null>
  icons: DesktopIconDef[]
  iconPositions: Record<string, Point>
  onSelectionChange: (ids: string[]) => void
}

export function useDesktopSelectionBox({
  desktopRef,
  icons,
  iconPositions,
  onSelectionChange,
}: UseDesktopSelectionBoxOptions): {
  selectionBox: SelectionBox | null
  startSelectionBox: (event: ReactPointerEvent<HTMLElement>) => void
  desktopPoint: (clientX: number, clientY: number) => Point
} {
  const [selectionBox, setSelectionBox] = useState<SelectionBox | null>(null)

  const desktopPoint = useCallback(
    (clientX: number, clientY: number): Point => {
      const rect = desktopRef.current?.getBoundingClientRect()
      return { x: clientX - (rect?.left ?? 0), y: clientY - (rect?.top ?? 0) }
    },
    [desktopRef],
  )

  const selectedIdsForBox = useCallback(
    (box: SelectionBox): string[] => {
      const rect = normalizeRect(box)
      return icons
        .filter((icon) => intersectsIcon(rect, iconPositions[icon.id] ?? { x: 10, y: 12 }))
        .map((icon) => icon.id)
    },
    [icons, iconPositions],
  )

  const startSelectionBox = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      const point = desktopPoint(event.clientX, event.clientY)
      setSelectionBox({
        pointerId: event.pointerId,
        startX: point.x,
        startY: point.y,
        currentX: point.x,
        currentY: point.y,
        moved: false,
      })
    },
    [desktopPoint],
  )

  useEffect(() => {
    if (!selectionBox) return
    const activeBox: SelectionBox = selectionBox

    function handlePointerMove(event: PointerEvent) {
      if (event.pointerId !== activeBox.pointerId) return
      const point = desktopPoint(event.clientX, event.clientY)
      const moved =
        activeBox.moved ||
        Math.abs(point.x - activeBox.startX) > 4 ||
        Math.abs(point.y - activeBox.startY) > 4
      const nextBox: SelectionBox = { ...activeBox, currentX: point.x, currentY: point.y, moved }
      setSelectionBox(nextBox)
      if (moved) {
        onSelectionChange(selectedIdsForBox(nextBox))
      }
    }

    function handlePointerUp(event: PointerEvent) {
      if (event.pointerId !== activeBox.pointerId) return
      const point = desktopPoint(event.clientX, event.clientY)
      const moved =
        activeBox.moved ||
        Math.abs(point.x - activeBox.startX) > 4 ||
        Math.abs(point.y - activeBox.startY) > 4
      if (!moved) {
        onSelectionChange([])
      }
      setSelectionBox(null)
    }

    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerUp)
    window.addEventListener('pointercancel', handlePointerUp)
    return () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
      window.removeEventListener('pointercancel', handlePointerUp)
    }
  }, [desktopPoint, onSelectionChange, selectedIdsForBox, selectionBox])

  return { selectionBox, startSelectionBox, desktopPoint }
}
