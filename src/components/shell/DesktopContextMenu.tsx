import { win98Icons } from '../../data/icons'
import type { AppId, WindowPayload } from '../../types'

export type DesktopArrangeMode = 'name' | 'type' | 'modified'

type DesktopContextMenuProps = {
  x: number
  y: number
  openApp: (appId: AppId, payload?: WindowPayload) => void
  arrangeMode: DesktopArrangeMode
  autoArrange: boolean
  onRefresh: () => void
  onArrangeIcons: () => void
  onArrangeBy: (mode: DesktopArrangeMode) => void
  onToggleAutoArrange: () => void
  onLineUpIcons: () => void
}

export function DesktopContextMenu({
  x,
  y,
  openApp,
  arrangeMode,
  autoArrange,
  onRefresh,
  onArrangeIcons,
  onArrangeBy,
  onToggleAutoArrange,
  onLineUpIcons,
}: DesktopContextMenuProps) {
  const checked = (value: boolean) => <span className="context-check">{value ? '*' : ''}</span>

  return (
    <nav
      className="desktop-context-menu"
      style={{ left: x, top: y }}
      aria-label="Desktop context menu"
      onPointerDown={(event) => event.stopPropagation()}
    >
      <ul>
        <li className="context-row has-submenu" tabIndex={0}>
          <span>View</span>
          <span className="submenu-arrow">&gt;</span>
          <ul className="context-submenu">
            <li><button type="button">{checked(true)} Large Icons</button></li>
            <li><button type="button" onClick={onToggleAutoArrange}>{checked(autoArrange)} Auto Arrange</button></li>
            <li><button type="button" onClick={onLineUpIcons}>Align to Grid</button></li>
          </ul>
        </li>
        <li className="context-row has-submenu" tabIndex={0}>
          <span>Arrange Icons By</span>
          <span className="submenu-arrow">&gt;</span>
          <ul className="context-submenu">
            <li><button type="button" onClick={() => onArrangeBy('name')}>{checked(arrangeMode === 'name')} Name</button></li>
            <li><button type="button" onClick={() => onArrangeBy('type')}>{checked(arrangeMode === 'type')} Type</button></li>
            <li><button type="button" onClick={() => onArrangeBy('modified')}>{checked(arrangeMode === 'modified')} Modified</button></li>
          </ul>
        </li>
        <li><button type="button" onClick={onArrangeIcons}>Auto Arrange Now</button></li>
        <li><button type="button" onClick={onLineUpIcons}>Line Up Icons</button></li>
        <li><button type="button" onClick={onRefresh}>Refresh</button></li>
        <li className="context-separator" aria-hidden="true"></li>
        <li>
          <button type="button" onClick={() => openApp('explorer', { path: 'C:\\' })}>
            <img src={win98Icons.computer} alt="" />
            Open My Computer
          </button>
        </li>
        <li>
          <button type="button" onClick={() => openApp('notepad')}>
            <img src={win98Icons.notepad} alt="" />
            New Text Document
          </button>
        </li>
        <li className="context-separator" aria-hidden="true"></li>
        <li>
          <button type="button" onClick={() => openApp('controlPanel', { controlPanelSection: 'display' })}>
            <img src={win98Icons.desktop} alt="" />
            Properties
          </button>
        </li>
      </ul>
    </nav>
  )
}
