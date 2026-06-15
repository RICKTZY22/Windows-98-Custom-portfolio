import { win98Icons } from '../data/icons'
import type { AppId, WindowPayload } from '../types'

type DesktopContextMenuProps = {
  x: number
  y: number
  openApp: (appId: AppId, payload?: WindowPayload) => void
  onRefresh: () => void
  onArrangeIcons: () => void
  onLineUpIcons: () => void
}

export function DesktopContextMenu({
  x,
  y,
  openApp,
  onRefresh,
  onArrangeIcons,
  onLineUpIcons,
}: DesktopContextMenuProps) {
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
            <li><button type="button">Large Icons</button></li>
            <li><button type="button" onClick={onArrangeIcons}>Auto Arrange</button></li>
            <li><button type="button" onClick={onLineUpIcons}>Align to Grid</button></li>
          </ul>
        </li>
        <li><button type="button" onClick={onArrangeIcons}>Arrange Icons</button></li>
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
