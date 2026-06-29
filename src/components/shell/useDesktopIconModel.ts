import { useMemo } from 'react'
import { desktopIconDefs } from '../../data/apps'
import type { DesktopIconDef, FsNode, FsState, Point } from '../../types'
import { DESKTOP_FOLDER, getNode } from '../../os/filesystem'
import { fallbackIconPosition, fsNodeToIconDef } from './desktopModel'

export function useDesktopIconModel(
  fs: FsState,
  storedPositions: Record<string, Point>,
): {
  allIconDefs: DesktopIconDef[]
  iconPositions: Record<string, Point>
} {
  const fsDesktopIcons = useMemo<DesktopIconDef[]>(() => {
    const folder = getNode(fs, DESKTOP_FOLDER)
    if (!folder?.children) return []
    return folder.children
      .map((path) => fs.nodes[path])
      .filter((node): node is FsNode => Boolean(node))
      .map(fsNodeToIconDef)
      .filter((def): def is DesktopIconDef => Boolean(def))
  }, [fs])

  const allIconDefs = useMemo(() => [...desktopIconDefs, ...fsDesktopIcons], [fsDesktopIcons])

  const iconPositions = useMemo(() => {
    const map: Record<string, Point> = {}
    allIconDefs.forEach((def, index) => {
      map[def.id] = storedPositions[def.id] ?? fallbackIconPosition(index)
    })
    return map
  }, [allIconDefs, storedPositions])

  return { allIconDefs, iconPositions }
}
