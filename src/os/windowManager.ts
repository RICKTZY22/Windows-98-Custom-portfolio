import type { AppId, FsState, IconKey, Point, WindowPayload, WindowRect, WindowState } from '../types'
import { appDefinitions, desktopIconDefs } from '../data/apps'
import { portfolioData } from '../data/portfolioData'
import { controlPanelSections } from '../data/system'
import { baseName, getNode, normalizePath } from './filesystem'
import { requiredDriverMissing } from './systemHealth'

const TASKBAR_HEIGHT = 33
const ICON_W = 88
const ICON_H = 84
const ICON_GAP_X = 8
const ICON_GAP_Y = 12

function viewportSize(): { width: number; height: number } {
  if (typeof window === 'undefined') {
    return { width: 1024, height: 768 }
  }
  return { width: window.innerWidth, height: window.innerHeight }
}

export function clampRect(rect: WindowRect, offset: number): WindowRect {
  const { width: vw, height: vh } = viewportSize()
  const width = Math.min(rect.width, vw - 20)
  const height = Math.min(rect.height, vh - 56)
  const maxX = Math.max(8, vw - width - 8)
  const maxY = Math.max(8, vh - height - 46)
  return {
    width,
    height,
    x: Math.max(8, Math.min(rect.x + offset, maxX)),
    y: Math.max(8, Math.min(rect.y + offset, maxY)),
  }
}

export function clampIconPosition(pos: Point): Point {
  const { width, height } = viewportSize()
  const desktopHeight = Math.max(160, height - TASKBAR_HEIGHT)
  return {
    x: Math.max(4, Math.min(pos.x, width - ICON_W - 4)),
    y: Math.max(4, Math.min(pos.y, desktopHeight - ICON_H - 4)),
  }
}

export function defaultDesktopIconPositions(): Record<string, Point> {
  const { width, height } = viewportSize()
  const desktopHeight = Math.max(160, height - TASKBAR_HEIGHT)
  const positions: Record<string, Point> = {}

  if (width <= 720) {
    const columns = Math.min(3, desktopIconDefs.length)
    const gridWidth = columns * ICON_W + (columns - 1) * ICON_GAP_X
    const startX = Math.max(8, Math.floor((width - gridWidth) / 2))
    desktopIconDefs.forEach((def, index) => {
      const column = index % columns
      const row = Math.floor(index / columns)
      positions[def.id] = clampIconPosition({
        x: startX + column * (ICON_W + ICON_GAP_X),
        y: 8 + row * (ICON_H + ICON_GAP_Y),
      })
    })
    return positions
  }

  const rowsPerColumn = Math.max(1, Math.floor((desktopHeight - 24) / (ICON_H + ICON_GAP_Y)))
  desktopIconDefs.forEach((def, index) => {
    const column = Math.floor(index / rowsPerColumn)
    const row = index % rowsPerColumn
    positions[def.id] = clampIconPosition({
      x: 10 + column * (ICON_W + ICON_GAP_X),
      y: 12 + row * (ICON_H + ICON_GAP_Y),
    })
  })
  return positions
}

let instanceCounter = 0

export function instanceIdFor(appId: AppId, payload?: WindowPayload): string {
  const singleton = appDefinitions[appId].singleton !== false
  if (appId === 'explorer') {
    return `explorer:${normalizePath(payload?.path ?? 'C:\\').toLowerCase()}`
  }
  if (appId === 'projectDetails' && payload?.projectId) {
    return `projectDetails:${payload.projectId}`
  }
  if (appId === 'notepad' && payload?.filePath) {
    return `notepad:${normalizePath(payload.filePath).toLowerCase()}`
  }
  if (appId === 'wordpad' && payload?.filePath) {
    return `wordpad:${normalizePath(payload.filePath).toLowerCase()}`
  }
  if (appId === 'imageViewer' && payload?.filePath) {
    return `imageViewer:${normalizePath(payload.filePath).toLowerCase()}`
  }
  if (appId === 'videoPlayer' && payload?.filePath) {
    return `videoPlayer:${normalizePath(payload.filePath).toLowerCase()}`
  }
  if (singleton) {
    return appId
  }
  instanceCounter += 1
  return `${appId}#${instanceCounter}`
}

export function titleFor(appId: AppId, fs: FsState, payload?: WindowPayload): string {
  const def = appDefinitions[appId]
  switch (appId) {
    case 'explorer': {
      const path = normalizePath(payload?.path ?? 'C:\\')
      if (path === 'C:\\') return 'My Computer'
      const node = getNode(fs, path)
      return `Exploring - ${node?.path ?? path}`
    }
    case 'notepad':
      return payload?.filePath ? `${baseName(payload.filePath)} - Notepad` : 'Untitled - Notepad'
    case 'wordpad':
      return payload?.filePath ? `${baseName(payload.filePath)} - WordPad` : 'Document - WordPad'
    case 'pdfViewer':
      return payload?.filePath ? `${baseName(payload.filePath)} - PDF Viewer` : def.title
    case 'paint':
      return payload?.filePath ? `${baseName(payload.filePath)} - Paint` : 'untitled - Paint'
    case 'imageViewer':
      return payload?.filePath ? `${baseName(payload.filePath)} - Imaging Preview` : def.title
    case 'mediaPlayer':
      return payload?.filePath ? `${baseName(payload.filePath)} - Media Player` : def.title
    case 'videoPlayer':
      return payload?.filePath ? `${baseName(payload.filePath)} - Video Player` : def.title
    case 'projectDetails':
      return portfolioData.projects.find((project) => project.id === payload?.projectId)?.name ?? def.title
    case 'controlPanel': {
      if (!payload?.controlPanelSection) return def.title
      const section = controlPanelSections.find((item) => item.id === payload.controlPanelSection)
      return section ? `${section.title} Properties` : def.title
    }
    case 'dosGame':
      return payload?.windowTitle ?? def.title
    default:
      return def.title
  }
}

export function iconFor(appId: AppId, payload?: WindowPayload): IconKey {
  if (appId === 'explorer') {
    const path = normalizePath(payload?.path ?? 'C:\\')
    return path === 'C:\\' ? appDefinitions.explorer.icon : 'folderOpen'
  }
  if (appId === 'dosGame' && payload?.url) {
    if (payload.url.includes('wolf')) return 'wolfenstein'
    if (payload.url.includes('doom')) return 'doom'
  }
  return appDefinitions[appId].icon
}

export function missingAppDependency(appId: AppId, fs: FsState): string | null {
  const dependencies = appDefinitions[appId].systemDependencies ?? []
  return dependencies.map(normalizePath).find((path) => !fs.nodes[path]) ?? null
}

export function missingAppDriverDependency(appId: AppId, fs: FsState) {
  return requiredDriverMissing(fs, appDefinitions[appId].driverDependencies)
}

export function nextActiveWindow(windows: WindowState[], excludeId?: string): string | undefined {
  return windows
    .filter((win) => win.instanceId !== excludeId && !win.minimized)
    .sort((a, b) => b.zIndex - a.zIndex)[0]?.instanceId
}
