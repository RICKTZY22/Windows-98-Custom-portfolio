import { win98Icons } from '../../data/icons'
import type { DeletedFileEntry } from '../../types'

type RecycleBinAppProps = {
  deletedItems: DeletedFileEntry[]
  onRestore: (path: string) => void
}

export function RecycleBinApp({ deletedItems, onRestore }: RecycleBinAppProps) {
  if (deletedItems.length > 0) {
    return (
      <div className="app-content recycle-app recycle-list-app">
        <ul className="os-menu-bar" role="menubar">
          <li>File</li>
          <li>Edit</li>
          <li>View</li>
          <li>Help</li>
        </ul>
        <div className="sunken-panel recycle-list">
          {deletedItems.map((item) => (
            <div className="recycle-row" key={item.path}>
              <span className="file-name-cell">
                <img src={win98Icons[item.icon]} alt="" />
                {item.name}
              </span>
              <span>{item.fileType ?? (item.kind === 'folder' ? 'File Folder' : 'File')}</span>
              <span>{item.deletedAt}</span>
              <button type="button" onClick={() => onRestore(item.path)}>
                Restore
              </button>
            </div>
          ))}
        </div>
        <div className="status-bar">
          <p className="status-bar-field">{deletedItems.length} object(s)</p>
          <p className="status-bar-field">Deleted items are simulated</p>
        </div>
      </div>
    )
  }

  return (
    <div className="app-content recycle-app">
      <div className="empty-bin">
        <img src={win98Icons.recycleBin} alt="" />
        <h2>Recycle Bin is empty.</h2>
        <p>No deleted projects. The good stuff is still on the desktop.</p>
      </div>
    </div>
  )
}
