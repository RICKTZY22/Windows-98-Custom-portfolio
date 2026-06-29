import type { DesktopIconDef, FsNode, Point } from '../../types'
import { DesktopIcon } from './DesktopIcon'
import { desktopIconTooltip, normalizeRect, type SelectionBox } from './desktopModel'

type DesktopIconLayerProps = {
  icons: DesktopIconDef[]
  iconPositions: Record<string, Point>
  fsNodes: Record<string, FsNode>
  selectedIconIds: string[]
  recycleHover: boolean
  selectionBox: SelectionBox | null
  autoArrange: boolean
  onSelectIcon: (id: string, extend?: boolean) => void
  onOpenIcon: (icon: DesktopIconDef) => void
  onMoveIcon: (id: string, position: Point) => void
  onRecycleHoverChange: (hovering: boolean) => void
  onDropOnRecycle: (id: string) => void
}

export function DesktopIconLayer({
  icons,
  iconPositions,
  fsNodes,
  selectedIconIds,
  recycleHover,
  selectionBox,
  autoArrange,
  onSelectIcon,
  onOpenIcon,
  onMoveIcon,
  onRecycleHoverChange,
  onDropOnRecycle,
}: DesktopIconLayerProps) {
  return (
    <>
      <div className="desktop-grid">
        {icons.map((iconDef) => (
          <DesktopIcon
            key={iconDef.id}
            iconDef={iconDef}
            position={iconPositions[iconDef.id] ?? { x: 10, y: 12 }}
            selected={selectedIconIds.includes(iconDef.id)}
            deletable={iconDef.id.startsWith('fs:')}
            highlighted={recycleHover && iconDef.id === 'recycleBin'}
            shortcut={iconDef.id.startsWith('fs:')}
            tooltip={desktopIconTooltip(iconDef, fsNodes)}
            onSelect={(extend) => onSelectIcon(iconDef.id, extend)}
            onOpen={() => onOpenIcon(iconDef)}
            onMove={(id, pos) => {
              if (!autoArrange) onMoveIcon(id, pos)
            }}
            onRecycleHoverChange={onRecycleHoverChange}
            onDropOnRecycle={onDropOnRecycle}
          />
        ))}
      </div>
      {selectionBox?.moved && (
        <div
          className="desktop-selection-box"
          style={{
            left: normalizeRect(selectionBox).left,
            top: normalizeRect(selectionBox).top,
            width: normalizeRect(selectionBox).width,
            height: normalizeRect(selectionBox).height,
          }}
          aria-hidden="true"
        />
      )}
    </>
  )
}
