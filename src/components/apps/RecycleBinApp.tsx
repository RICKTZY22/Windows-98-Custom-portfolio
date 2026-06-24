import './RecycleBinApp.css'
import { useMemo, useState } from 'react'
import { win98Icons } from '../../data/icons'
import { formatSize, parentPath } from '../../os/filesystem'
import { useOs } from '../../os/useOs'

function entrySize(entry: { nodes: Record<string, { kind: string; size: number }> }): number {
  return Object.values(entry.nodes).reduce((sum, node) => sum + (node.kind === 'file' ? node.size : 0), 0)
}

export function RecycleBinApp() {
  const { state, fsOps, showMessageBox } = useOs()
  const entries = state.fs.recycle
  const [selectedId, setSelectedId] = useState<string>()
  const selectedEntry = entries.find((entry) => entry.id === selectedId) ?? entries[0]
  const totalSize = useMemo(() => entries.reduce((sum, entry) => sum + entrySize(entry), 0), [entries])

  function restore(entryId: string) {
    const error = fsOps.restoreEntry(entryId)
    if (error) {
      showMessageBox({ title: 'Recycle Bin', message: error, icon: 'error', buttons: ['ok'] })
    }
  }

  function restoreSelected() {
    if (selectedEntry) restore(selectedEntry.id)
  }

  function showSelectedProperties() {
    if (!selectedEntry) return
    showMessageBox({
      title: `${selectedEntry.name} Properties`,
      message: `Type: ${selectedEntry.fileType}
Original location: ${parentPath(selectedEntry.rootPath)}
Size: ${formatSize(entrySize(selectedEntry)) || '0 bytes'}`,
      detail: `Deleted: ${selectedEntry.deletedAt}${selectedEntry.critical ? ' - System item' : ''}`,
      icon: 'info',
      buttons: ['ok'],
    })
  }

  function confirmEmpty() {
    if (!entries.length) return
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

  return (
    <div className="app-content recycle-app">
      <ul className="os-menu-bar" role="menubar">
        <li>File</li>
        <li>Edit</li>
        <li>View</li>
        <li>Help</li>
      </ul>

      <div className="recycle-commandbar" role="toolbar" aria-label="Recycle Bin commands">
        <button type="button" className="recycle-command-button" onClick={restoreSelected} disabled={!selectedEntry}>
          <img src={win98Icons.folderOpen} alt="" />
          <span>Restore</span>
        </button>
        <div className="recycle-command-separator" aria-hidden="true"></div>
        <button type="button" className="recycle-command-button" onClick={confirmEmpty} disabled={!entries.length}>
          <img src={win98Icons.recycleBin} alt="" />
          <span>Empty Bin</span>
        </button>
        <button type="button" className="recycle-command-button" onClick={showSelectedProperties} disabled={!selectedEntry}>
          <img src={win98Icons.help} alt="" />
          <span>Properties</span>
        </button>
        <div className="recycle-view-chip" aria-hidden="true">
          <span>Details</span>
          <span>Views</span>
        </div>
      </div>

      <div className="recycle-layout">
        <aside className="recycle-webinfo">
          <div className="recycle-webinfo-header">Recycle Bin</div>
          <div className="recycle-webinfo-body">
            <img className="recycle-webinfo-icon" src={win98Icons.recycleBin} alt="" />
            <p className="recycle-webinfo-name">
              {entries.length ? `${entries.length} deleted item(s)` : 'Recycle Bin is empty'}
            </p>
            <p className="recycle-webinfo-detail">{formatSize(totalSize) || '0 bytes'}</p>
            {selectedEntry ? (
              <div className="recycle-selected-card">
                <span>{selectedEntry.name}</span>
                <span>{selectedEntry.fileType}</span>
                <span>{parentPath(selectedEntry.rootPath)}</span>
              </div>
            ) : (
              <p className="recycle-webinfo-blurb">No deleted files.</p>
            )}
          </div>
        </aside>

        <div className="sunken-panel recycle-list" role="grid" aria-label="Deleted files">
          <div className="recycle-row recycle-header" role="row">
            <span>Name</span>
            <span>Original Location</span>
            <span>Type</span>
            <span>Date Deleted</span>
            <span>Size</span>
          </div>
          <div className="recycle-list-body">
            {entries.map((item) => (
              <div
                className={`recycle-row ${selectedEntry?.id === item.id ? 'selected' : ''}`}
                key={item.id}
                role="row"
                tabIndex={0}
                onClick={() => setSelectedId(item.id)}
                onDoubleClick={() => restore(item.id)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') restore(item.id)
                }}
              >
                <span className="file-name-cell">
                  <img src={win98Icons[item.icon]} alt="" />
                  {item.name}
                </span>
                <span title={parentPath(item.rootPath)}>{parentPath(item.rootPath)}</span>
                <span>{item.fileType}</span>
                <span>{item.deletedAt}</span>
                <span>{formatSize(entrySize(item)) || '0 bytes'}</span>
              </div>
            ))}
            {entries.length === 0 && (
              <div className="recycle-empty-panel">
                <img src={win98Icons.recycleBin} alt="" />
                <h2>Recycle Bin is empty.</h2>
                <p>No deleted files.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="status-bar">
        <p className="status-bar-field">{entries.length} object(s)</p>
        <p className="status-bar-field">{formatSize(totalSize) || '0 bytes'}</p>
        <p className="status-bar-field">{selectedEntry ? `Selected: ${selectedEntry.name}` : 'Ready'}</p>
      </div>
    </div>
  )
}
