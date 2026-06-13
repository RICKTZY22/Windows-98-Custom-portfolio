import { win98Icons } from '../../data/icons'
import { useOs } from '../../os/useOs'

export function RecycleBinApp() {
  const { state, fsOps, showMessageBox } = useOs()
  const entries = state.fs.recycle

  function restore(entryId: string) {
    const error = fsOps.restoreEntry(entryId)
    if (error) {
      showMessageBox({ title: 'Recycle Bin', message: error, icon: 'error', buttons: ['ok'] })
    }
  }

  function confirmEmpty() {
    showMessageBox({
      title: 'Confirm File Delete',
      message: `Are you sure you want to permanently delete these ${entries.length} item(s)?`,
      detail:
        'After the Recycle Bin is emptied, these virtual files are removed from browser storage and cannot be restored from the Recycle Bin.',
      icon: 'warning',
      buttons: ['yes', 'no'],
      onResult: (button) => {
        if (button === 'yes') {
          fsOps.emptyRecycleBin()
        }
      },
    })
  }

  if (entries.length > 0) {
    return (
      <div className="app-content recycle-app recycle-list-app">
        <ul className="os-menu-bar" role="menubar">
          <li>File</li>
          <li>Edit</li>
          <li>View</li>
          <li>Help</li>
        </ul>
        <div className="toolbar">
          <button type="button" onClick={confirmEmpty}>
            Empty Recycle Bin
          </button>
        </div>
        <div className="sunken-panel recycle-list">
          {entries.map((item) => (
            <div className="recycle-row" key={item.id}>
              <span className="file-name-cell">
                <img src={win98Icons[item.icon]} alt="" />
                {item.name}
              </span>
              <span>{item.fileType}</span>
              <span>{item.deletedAt}</span>
              <button type="button" onClick={() => restore(item.id)}>
                Restore
              </button>
            </div>
          ))}
        </div>
        <div className="status-bar">
          <p className="status-bar-field">{entries.length} object(s)</p>
          <p className="status-bar-field">Items are recoverable until the bin is emptied</p>
        </div>
      </div>
    )
  }

  return (
    <div className="app-content recycle-app">
      <div className="empty-bin">
        <img src={win98Icons.recycleBin} alt="" />
        <h2>Recycle Bin is empty.</h2>
        <p>No deleted files.</p>
      </div>
    </div>
  )
}
