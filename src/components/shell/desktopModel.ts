import { desktopIconDefs } from '../../data/apps'
import type { DesktopIconDef, FsNode, Point } from '../../types'
import { openTargetFor } from '../../os/filesystem'
import type { DesktopArrangeMode } from './DesktopContextMenu'

export const desktopIconWidth = 88
export const desktopIconHeight = 80
export const desktopIconGapX = 8
export const desktopIconGapY = 12
export const desktopShellIntroMs = 5_000

export type SelectionBox = {
  pointerId: number
  startX: number
  startY: number
  currentX: number
  currentY: number
  moved: boolean
}

export function normalizeRect(box: Pick<SelectionBox, 'startX' | 'startY' | 'currentX' | 'currentY'>) {
  const left = Math.min(box.startX, box.currentX)
  const top = Math.min(box.startY, box.currentY)
  const right = Math.max(box.startX, box.currentX)
  const bottom = Math.max(box.startY, box.currentY)
  return { left, top, right, bottom, width: right - left, height: bottom - top }
}

export function intersectsIcon(rect: ReturnType<typeof normalizeRect>, pos: Point): boolean {
  return (
    rect.left <= pos.x + desktopIconWidth &&
    rect.right >= pos.x &&
    rect.top <= pos.y + desktopIconHeight &&
    rect.bottom >= pos.y
  )
}

export function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  if (target.isContentEditable) return true
  return Boolean(target.closest('input, textarea, select, [contenteditable="true"]'))
}

export function fallbackIconPosition(index: number): Point {
  return gridPositionForIndex(index)
}

export function gridPositionForIndex(index: number): Point {
  const viewportHeight = typeof window === 'undefined' ? 768 : window.innerHeight
  const desktopHeight = Math.max(160, viewportHeight - 33)
  const rowsPerColumn = Math.max(1, Math.floor((desktopHeight - 24) / (desktopIconHeight + desktopIconGapY)))
  const column = Math.floor(index / rowsPerColumn)
  const row = index % rowsPerColumn
  return {
    x: 10 + column * (desktopIconWidth + desktopIconGapX),
    y: 12 + row * (desktopIconHeight + desktopIconGapY),
  }
}

export function desktopIconNode(iconId: string, fsNodes: Record<string, FsNode>): FsNode | undefined {
  return iconId.startsWith('fs:') ? fsNodes[iconId.slice(3)] : undefined
}

export function desktopIconTooltip(iconDef: DesktopIconDef, fsNodes: Record<string, FsNode>): string {
  const node = desktopIconNode(iconDef.id, fsNodes)
  if (!node) {
    return `${iconDef.label}\nDouble-click to open.`
  }
  const targetLabel = node.appPayload?.filePath ?? node.appPayload?.path ?? node.appId ?? 'portfolio item'
  return `${iconDef.label}\nShortcut\nTarget: ${targetLabel}\nModified: ${node.modified}`
}

export function sortDesktopIconDefs(
  icons: DesktopIconDef[],
  mode: DesktopArrangeMode,
  fsNodes: Record<string, FsNode>,
): DesktopIconDef[] {
  return [...icons].sort((a, b) => {
    if (mode === 'type') {
      const typeA = desktopIconNode(a.id, fsNodes)?.fileType ?? a.appId
      const typeB = desktopIconNode(b.id, fsNodes)?.fileType ?? b.appId
      return typeA.localeCompare(typeB) || a.label.localeCompare(b.label)
    }
    if (mode === 'modified') {
      const modifiedA = desktopIconNode(a.id, fsNodes)?.modified ?? ''
      const modifiedB = desktopIconNode(b.id, fsNodes)?.modified ?? ''
      return modifiedB.localeCompare(modifiedA) || a.label.localeCompare(b.label)
    }
    return a.label.localeCompare(b.label)
  })
}

export function fsNodeToIconDef(node: FsNode): DesktopIconDef | null {
  const target = openTargetFor(node)
  if (!target) return null
  return {
    id: `fs:${node.path}`,
    label: node.name.replace(/\.lnk$/i, ''),
    icon: node.icon,
    appId: target.appId,
    payload: target.payload,
  }
}

export const builtInDesktopIconFallbackId = desktopIconDefs[0]?.id ?? 'myComputer'
