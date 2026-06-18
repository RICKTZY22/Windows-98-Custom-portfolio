import './ExplorerApp.css'
import { useEffect, useMemo, useRef, useState, type MouseEvent as ReactMouseEvent } from 'react'
import { win98Icons } from '../../data/icons'
import type { AppProps, FsNode } from '../../types'
import { useOs } from '../../os/useOs'
import {
  baseName,
  extensionOf,
  formatSize,
  getNode,
  isProtectedPath,
  joinPath,
  listDirectory,
  normalizePath,
  parentPath,
  uniqueChildName,
} from '../../os/filesystem'

type ViewMode = 'largeIcons' | 'smallIcons' | 'list' | 'details' | 'thumbnails'
type SortKey = 'name' | 'type' | 'size' | 'modified'
type ContextMenuState = { x: number; y: number; targetPath: string | null }

const VIEW_MODES: Array<{ id: ViewMode; label: string }> = [
  { id: 'largeIcons', label: 'Large Icons' },
  { id: 'smallIcons', label: 'Small Icons' },
  { id: 'list', label: 'List' },
  { id: 'details', label: 'Details' },
  { id: 'thumbnails', label: 'Thumbnails' },
]

const IMAGE_NAME_RE = /\.(bmp|png|jpe?g|gif)$/i

/** Image files with a data URL can show a real thumbnail instead of a generic icon. */
function isThumbnailable(node: FsNode): boolean {
  return node.kind === 'file' && Boolean(node.dataUrl) && IMAGE_NAME_RE.test(node.name)
}

const quickPaths = [
  ['C:\\', 'Portfolio (C:)'],
  ['C:\\My Documents', 'My Documents'],
  ['C:\\My Pictures', 'My Pictures'],
  ['C:\\My Videos', 'My Videos'],
  ['C:\\Projects', 'Projects'],
  ['C:\\Program Files', 'Program Files'],
  ['C:\\Windows', 'Windows'],
  ['C:\\Network', 'Network'],
] as const

function nodeSize(node: FsNode): string {
  return node.kind === 'folder' ? '' : formatSize(node.size)
}

function sortNodes(nodes: FsNode[], key: SortKey): FsNode[] {
  return [...nodes].sort((a, b) => {
    if (a.kind !== b.kind) return a.kind === 'folder' ? -1 : 1
    switch (key) {
      case 'type':
        return a.fileType.localeCompare(b.fileType) || a.name.localeCompare(b.name)
      case 'size':
        return a.size - b.size || a.name.localeCompare(b.name)
      case 'modified':
        return a.modified.localeCompare(b.modified) || a.name.localeCompare(b.name)
      case 'name':
      default:
        return a.name.localeCompare(b.name)
    }
  })
}

export function ExplorerApp({ windowId, payload }: AppProps) {
  const { state, openNode, setWindowTitle, fsOps, setClipboard, showMessageBox } = useOs()
  const [currentPath, setCurrentPath] = useState(() => normalizePath(payload?.path ?? 'C:\\'))
  const [address, setAddress] = useState(currentPath)
  const [selectedPaths, setSelectedPaths] = useState<string[]>([])
  const [anchorPath, setAnchorPath] = useState<string>()
  const [viewMode, setViewMode] = useState<ViewMode>('details')
  const [sortKey, setSortKey] = useState<SortKey>('name')
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null)
  const [renamingPath, setRenamingPath] = useState<string>()
  const [renameValue, setRenameValue] = useState('')
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setWindowTitle(windowId, currentPath === 'C:\\' ? 'My Computer' : `Exploring - ${currentPath}`)
  }, [currentPath, setWindowTitle, windowId])

  const currentNode = getNode(state.fs, currentPath)
  const items = useMemo(() => sortNodes(listDirectory(state.fs, currentPath), sortKey), [currentPath, sortKey, state.fs])
  // The "primary" item (last clicked) drives single-target actions and the info panel.
  const selectedPath = selectedPaths[selectedPaths.length - 1]
  const selectedNode = selectedPath ? getNode(state.fs, selectedPath) : undefined
  const selectedNodes = selectedPaths.map((path) => getNode(state.fs, path)).filter((node): node is FsNode => Boolean(node))
  const protectedHere = isProtectedPath(currentPath)

  function selectSingle(path: string) {
    setSelectedPaths([path])
    setAnchorPath(path)
  }

  function clearSelection() {
    setSelectedPaths([])
    setAnchorPath(undefined)
  }

  function selectAll() {
    const paths = items.map((node) => node.path)
    setSelectedPaths(paths)
    setAnchorPath(paths[0])
  }

  // Windows-style click selection: plain = single, Ctrl = toggle, Shift = range from anchor.
  function selectOnClick(path: string, event: { ctrlKey: boolean; metaKey: boolean; shiftKey: boolean }) {
    if (event.shiftKey && anchorPath) {
      const from = items.findIndex((node) => node.path === anchorPath)
      const to = items.findIndex((node) => node.path === path)
      if (from !== -1 && to !== -1) {
        const [lo, hi] = from < to ? [from, to] : [to, from]
        setSelectedPaths(items.slice(lo, hi + 1).map((node) => node.path))
        return
      }
    }
    if (event.ctrlKey || event.metaKey) {
      setSelectedPaths((prev) => (prev.includes(path) ? prev.filter((p) => p !== path) : [...prev, path]))
      setAnchorPath(path)
      return
    }
    selectSingle(path)
  }

  function showError(message: string) {
    showMessageBox({ title: 'Windows Explorer', message, icon: 'error', buttons: ['ok'] })
  }

  function deleteSelection() {
    const targets = selectedNodes
    if (!targets.length) return
    if (targets.length === 1) {
      confirmDelete(targets[0])
      return
    }
    showMessageBox({
      title: 'Confirm Multiple File Delete',
      message: `Are you sure you want to send these ${targets.length} items to the Recycle Bin?`,
      icon: 'question',
      buttons: ['yes', 'no'],
      onResult: (button) => {
        if (button !== 'yes') return
        for (const node of targets) {
          const error = fsOps.deleteNode(node.path, { skipConfirm: true })
          if (error) {
            showError(error)
            break
          }
        }
        clearSelection()
      },
    })
  }

  function navigate(path: string) {
    const normalized = normalizePath(path)
    const node = getNode(state.fs, normalized)
    if (!node || node.kind !== 'folder') {
      showError(`Cannot find '${path}'. Make sure the path or Internet address is correct.`)
      return
    }
    setCurrentPath(node.path)
    setAddress(node.path)
    clearSelection()
    setContextMenu(null)
    setRenamingPath(undefined)
  }

  function openExplorerNode(path: string) {
    const node = getNode(state.fs, path)
    if (node?.kind === 'folder') {
      navigate(node.path)
      return
    }
    openNode(path)
  }

  function confirmDelete(node: FsNode) {
    const isSystem = Boolean(node.attributes?.system) || isProtectedPath(node.path)
    showMessageBox({
      title: isSystem ? 'Confirm System File Delete' : 'Confirm File Delete',
      message: isSystem
        ? `'${node.name}' is a Windows system file. Deleting it may make Windows unusable. Delete it anyway?`
        : `Are you sure you want to send '${node.name}' to the Recycle Bin?`,
      icon: isSystem ? 'warning' : 'question',
      buttons: ['yes', 'no'],
      onResult: (button) => {
        if (button !== 'yes') return
        const error = fsOps.deleteNode(node.path, { skipConfirm: true })
        if (error) showError(error)
        setSelectedPaths((prev) => prev.filter((p) => p !== node.path))
      },
    })
  }

  function showProperties(node: FsNode) {
    const attributes = [
      node.attributes?.readOnly ? 'Read-only' : null,
      node.attributes?.hidden ? 'Hidden' : null,
      node.attributes?.system ? 'System' : null,
    ]
      .filter(Boolean)
      .join(', ')
    showMessageBox({
      title: `${node.name} Properties`,
      message: `Type: ${node.fileType}
Location: ${parentPath(node.path)}
Size: ${
        node.kind === 'folder' ? `${listDirectory(state.fs, node.path).length} item(s)` : `${formatSize(node.size)} (${node.size.toLocaleString()} bytes)`
      }`,
      detail: `Modified: ${node.modified}${attributes ? ` - Attributes: ${attributes}` : ''}`,
      icon: 'info',
      buttons: ['ok'],
    })
  }

  function startRename(node: FsNode) {
    if (isProtectedPath(node.path)) {
      showError('Access is denied. The file is being used by Windows.')
      return
    }
    setRenamingPath(node.path)
    setRenameValue(node.name)
    setContextMenu(null)
  }

  function commitRename() {
    if (!renamingPath) return
    const node = getNode(state.fs, renamingPath)
    const typed = renameValue.trim()
    setRenamingPath(undefined)
    if (!node || !typed) return
    // Keep the original extension if the user dropped it while renaming a file —
    // otherwise the file loses its app association and won't open ("not a valid
    // Win32 application"). Folders are renamed verbatim.
    const originalExt = node.kind === 'file' ? extensionOf(node.name) : ''
    const next = originalExt && !extensionOf(typed) ? `${typed}.${originalExt}` : typed
    if (next === node.name) return
    const error = fsOps.renameNode(node.path, next)
    if (error) showError(error)
    else selectSingle(joinPath(parentPath(node.path), next))
  }

  function createNew(kind: 'folder' | 'file' | 'document') {
    if (protectedHere) {
      showError('Access is denied. Windows folders are protected.')
      return
    }
    const desired =
      kind === 'folder' ? 'New Folder' : kind === 'document' ? 'New WordPad Document.doc' : 'New Text Document.txt'
    const name = uniqueChildName(state.fs, currentPath, desired)
    const error = kind === 'folder' ? fsOps.createFolder(currentPath, name) : fsOps.createFile(currentPath, name, { content: '' })
    if (error) {
      showError(error)
      return
    }
    const createdPath = joinPath(currentPath, name)
    selectSingle(createdPath)
    setRenamingPath(createdPath)
    setRenameValue(name)
    setContextMenu(null)
  }

  function pasteClipboard() {
    if (!state.clipboard) return
    const error =
      state.clipboard.mode === 'copy'
        ? fsOps.copyNode(state.clipboard.path, currentPath)
        : fsOps.moveNode(state.clipboard.path, currentPath)
    setContextMenu(null)
    if (error) {
      showError(error)
      return
    }
    if (state.clipboard.mode === 'cut') {
      setClipboard(null)
    }
  }

  function openContextMenu(event: ReactMouseEvent, targetPath: string | null) {
    event.preventDefault()
    event.stopPropagation()
    const rect = rootRef.current?.getBoundingClientRect()
    if (!rect) return
    if (targetPath && !selectedPaths.includes(targetPath)) selectSingle(targetPath)
    const menuWidth = 190
    const menuHeight = targetPath ? 234 : 194
    setContextMenu({
      x: Math.max(2, Math.min(event.clientX - rect.left, rect.width - menuWidth - 2)),
      y: Math.max(2, Math.min(event.clientY - rect.top, rect.height - menuHeight - 2)),
      targetPath,
    })
  }

  const contextNode = contextMenu?.targetPath ? getNode(state.fs, contextMenu.targetPath) : undefined

  return (
    <div
      ref={rootRef}
      className="app-content computer-app file-manager-app"
      onPointerDown={() => setContextMenu(null)}
    >
      <ul className="os-menu-bar" role="menubar">
        <li>File</li>
        <li>Edit</li>
        <li>View</li>
        <li>Go</li>
        <li>Favorites</li>
        <li>Help</li>
      </ul>
      <div className="toolbar file-manager-toolbar">
        <button type="button" onClick={() => navigate(parentPath(currentPath))}>
          Up
        </button>
        <button type="button" onClick={openSelectedButton} disabled={!selectedNode}>
          Open
        </button>
        <button
          type="button"
          onClick={() => selectedNode && setClipboard({ mode: 'copy', path: selectedNode.path })}
          disabled={!selectedNode}
        >
          Copy
        </button>
        <button
          type="button"
          onClick={() => selectedNode && setClipboard({ mode: 'cut', path: selectedNode.path })}
          disabled={!selectedNode}
        >
          Cut
        </button>
        <button type="button" onClick={pasteClipboard} disabled={!state.clipboard}>
          Paste
        </button>
        <button type="button" onClick={deleteSelection} disabled={!selectedNode}>
          Delete
        </button>
        <button type="button" onClick={() => createNew('folder')} disabled={protectedHere}>
          New Folder
        </button>
        <button type="button" onClick={() => createNew('file')} disabled={protectedHere}>
          New Text
        </button>
        <button type="button" onClick={() => createNew('document')} disabled={protectedHere}>
          New Doc
        </button>
        <select
          className="file-view-select"
          value={viewMode}
          onChange={(event) => setViewMode(event.target.value as ViewMode)}
          aria-label="View mode"
        >
          {VIEW_MODES.map((mode) => (
            <option key={mode.id} value={mode.id}>
              {mode.label}
            </option>
          ))}
        </select>
        <form
          className="address-form"
          onSubmit={(event) => {
            event.preventDefault()
            navigate(address)
          }}
        >
          <label htmlFor={`address-${windowId}`}>Address</label>
          <input id={`address-${windowId}`} value={address} onChange={(event) => setAddress(event.target.value)} />
        </form>
      </div>
      <div className="file-manager-layout">
        <ul className="tree-view file-tree">
          <li>
            <details open>
              <summary>Desktop</summary>
              <ul>
                {quickPaths.map(([path, label]) => (
                  <li key={path}>
                    <button type="button" className="tree-button" onClick={() => navigate(path)}>
                      <img src={win98Icons[getNode(state.fs, path)?.icon ?? 'folder']} alt="" />
                      {label}
                    </button>
                  </li>
                ))}
              </ul>
            </details>
          </li>
        </ul>
        <div className="file-webinfo">
          <div className="file-webinfo-header">{currentNode?.name ?? currentPath}</div>
          <div className="file-webinfo-body">
            {selectedNodes.length > 1 ? (
              <>
                <img className="file-webinfo-icon" src={win98Icons.folderOpen} alt="" />
                <p className="file-webinfo-name">{selectedNodes.length} items selected</p>
                <p className="file-webinfo-detail">
                  {formatSize(selectedNodes.reduce((sum, node) => sum + (node.kind === 'file' ? node.size : 0), 0)) ||
                    '0 KB'}
                </p>
              </>
            ) : selectedNode ? (
              <>
                {isThumbnailable(selectedNode) ? (
                  <img className="file-webinfo-thumb" src={selectedNode.dataUrl} alt="" />
                ) : (
                  <img className="file-webinfo-icon" src={win98Icons[selectedNode.icon]} alt="" />
                )}
                <p className="file-webinfo-name">{selectedNode.name}</p>
                <p className="file-webinfo-detail">{selectedNode.fileType}</p>
                {selectedNode.kind === 'file' && (
                  <p className="file-webinfo-detail">{formatSize(selectedNode.size) || `${selectedNode.size} bytes`}</p>
                )}
                <p className="file-webinfo-detail">Modified: {selectedNode.modified}</p>
              </>
            ) : (
              <>
                <img className="file-webinfo-icon" src={win98Icons[currentNode?.icon ?? 'folder']} alt="" />
                <p className="file-webinfo-detail">{items.length} object(s)</p>
                <p className="file-webinfo-blurb">Select an item to view its description.</p>
              </>
            )}
          </div>
        </div>
        <div
          className={`sunken-panel rich-file-list view-${viewMode}`}
          tabIndex={0}
          onContextMenu={(event) => openContextMenu(event, null)}
          onKeyDown={(event) => {
            if (renamingPath) return
            // Selection-wide shortcuts live on the pane so they work whether a row or
            // the empty list area has focus (rows still handle Enter/F2/Backspace).
            if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'a') {
              event.preventDefault()
              selectAll()
            } else if (event.key === 'Delete') {
              event.preventDefault()
              deleteSelection()
            }
          }}
        >
          {viewMode === 'details' && (
            <div className="file-header">
              <button type="button" onClick={() => setSortKey('name')}>Name</button>
              <button type="button" onClick={() => setSortKey('type')}>Type</button>
              <button type="button" onClick={() => setSortKey('size')}>Size</button>
              <button type="button" onClick={() => setSortKey('modified')}>Modified</button>
            </div>
          )}
          <div className="file-list-body">
          {items.map((node) => (
            <div
              className={`file-row file-manager-row ${selectedPaths.includes(node.path) ? 'selected' : ''}`}
              key={node.path}
              role="button"
              tabIndex={0}
              aria-pressed={selectedPaths.includes(node.path)}
              onClick={(event) => selectOnClick(node.path, event)}
              onDoubleClick={() => openExplorerNode(node.path)}
              onContextMenu={(event) => openContextMenu(event, node.path)}
              onKeyDown={(event) => {
                if (renamingPath === node.path) return
                // Ctrl+A and Delete are handled by the list pane (so they also work when
                // the empty area is focused); let them bubble up instead of duplicating.
                if (event.key === 'Enter') {
                  event.preventDefault()
                  openExplorerNode(node.path)
                }
                if (event.key === 'F2') {
                  event.preventDefault()
                  startRename(node)
                }
                if (event.key === 'Backspace') {
                  event.preventDefault()
                  navigate(parentPath(currentPath))
                }
              }}
            >
              <span className="file-name-cell">
                {viewMode === 'thumbnails' && isThumbnailable(node) ? (
                  <img className="file-thumb-img" src={node.dataUrl} alt="" />
                ) : (
                  <img src={win98Icons[node.icon]} alt="" />
                )}
                {renamingPath === node.path ? (
                  <input
                    className="rename-input"
                    value={renameValue}
                    autoFocus
                    onFocus={(event) => event.target.select()}
                    onChange={(event) => setRenameValue(event.target.value)}
                    onClick={(event) => event.stopPropagation()}
                    onDoubleClick={(event) => event.stopPropagation()}
                    onBlur={commitRename}
                    onKeyDown={(event) => {
                      event.stopPropagation()
                      if (event.key === 'Enter') {
                        event.preventDefault()
                        commitRename()
                      }
                      if (event.key === 'Escape') {
                        event.preventDefault()
                        setRenamingPath(undefined)
                      }
                    }}
                  />
                ) : (
                  node.name
                )}
              </span>
              <span>{node.fileType}</span>
              <span>{nodeSize(node)}</span>
              <span>{node.modified}</span>
            </div>
          ))}
          {items.length === 0 && <p className="file-list-empty">This folder is empty.</p>}
          </div>
        </div>
      </div>
      {contextMenu && (
        <ul
          className="desktop-context-menu explorer-context-menu"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          role="menu"
          onPointerDown={(event) => event.stopPropagation()}
        >
          {contextNode ? (
            <>
              <li>
                <button type="button" className="context-default" onClick={() => { setContextMenu(null); openExplorerNode(contextNode.path) }}>
                  Open
                </button>
              </li>
              <li className="context-separator" aria-hidden="true"></li>
              <li>
                <button type="button" onClick={() => { setClipboard({ mode: 'cut', path: contextNode.path }); setContextMenu(null) }}>
                  Cut
                </button>
              </li>
              <li>
                <button type="button" onClick={() => { setClipboard({ mode: 'copy', path: contextNode.path }); setContextMenu(null) }}>
                  Copy
                </button>
              </li>
              <li className="context-separator" aria-hidden="true"></li>
              <li>
                <button type="button" onClick={() => { setContextMenu(null); confirmDelete(contextNode) }}>
                  Delete
                </button>
              </li>
              <li>
                <button type="button" onClick={() => startRename(contextNode)}>
                  Rename
                </button>
              </li>
              <li className="context-separator" aria-hidden="true"></li>
              <li>
                <button type="button" onClick={() => { setContextMenu(null); showProperties(contextNode) }}>
                  Properties
                </button>
              </li>
            </>
          ) : (
            <>
              <li>
                <button type="button" onClick={() => createNew('folder')} disabled={protectedHere}>
                  New Folder
                </button>
              </li>
              <li>
                <button type="button" onClick={() => createNew('file')} disabled={protectedHere}>
                  New Text Document
                </button>
              </li>
              <li>
                <button type="button" onClick={() => createNew('document')} disabled={protectedHere}>
                  New WordPad Document
                </button>
              </li>
              <li className="context-separator" aria-hidden="true"></li>
              <li>
                <button type="button" onClick={pasteClipboard} disabled={!state.clipboard}>
                  Paste
                </button>
              </li>
              <li>
                <button type="button" onClick={() => setContextMenu(null)}>
                  Refresh
                </button>
              </li>
              <li className="context-separator" aria-hidden="true"></li>
              <li>
                <button
                  type="button"
                  onClick={() => {
                    setContextMenu(null)
                    if (currentNode) showProperties(currentNode)
                  }}
                >
                  Properties
                </button>
              </li>
            </>
          )}
        </ul>
      )}
      <div className="status-bar">
        <p className="status-bar-field">
          {selectedNodes.length > 1
            ? `${selectedNodes.length} items selected`
            : selectedNode
              ? `Selected: ${selectedNode.name}`
              : currentNode?.name ?? currentPath}
        </p>
        <p className="status-bar-field">{items.length} object(s)</p>
        <p className="status-bar-field">{state.clipboard ? `${state.clipboard.mode}: ${baseName(state.clipboard.path)}` : 'Ready'}</p>
      </div>
    </div>
  )

  function openSelectedButton() {
    if (selectedNode) {
      openExplorerNode(selectedNode.path)
    }
  }
}
