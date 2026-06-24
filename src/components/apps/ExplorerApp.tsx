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
type SortDirection = 'asc' | 'desc'
type MenuName = 'file' | 'edit' | 'view' | 'go' | 'favorites' | 'help'
type ContextMenuState = { x: number; y: number; targetPath: string | null }
type NavigateOptions = { skipHistory?: boolean }

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

function compareNodes(a: FsNode, b: FsNode, key: SortKey): number {
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
}

function sortNodes(nodes: FsNode[], key: SortKey, direction: SortDirection): FsNode[] {
  return [...nodes].sort((a, b) => {
    if (a.kind !== b.kind) return a.kind === 'folder' ? -1 : 1
    return compareNodes(a, b, key) * (direction === 'asc' ? 1 : -1)
  })
}

function nodeAttributes(node: FsNode): string[] {
  return [
    node.attributes?.system ? 'System' : null,
    node.attributes?.readOnly ? 'Read-only' : null,
    node.attributes?.hidden ? 'Hidden' : null,
  ].filter((item): item is string => Boolean(item))
}

function nodeTooltip(node: FsNode): string {
  const attributes = nodeAttributes(node)
  return [
    node.name,
    `Type: ${node.fileType}`,
    node.kind === 'folder' ? 'Folder' : `Size: ${formatSize(node.size) || `${node.size} bytes`}`,
    `Modified: ${node.modified}`,
    attributes.length ? `Attributes: ${attributes.join(', ')}` : null,
  ]
    .filter((line): line is string => Boolean(line))
    .join('\n')
}

export function ExplorerApp({ windowId, payload }: AppProps) {
  const { state, openNode, setWindowTitle, fsOps, setClipboard, showMessageBox } = useOs()
  const [currentPath, setCurrentPath] = useState(() => normalizePath(payload?.path ?? 'C:\\'))
  const [address, setAddress] = useState(currentPath)
  const [backStack, setBackStack] = useState<string[]>([])
  const [forwardStack, setForwardStack] = useState<string[]>([])
  const [selectedPaths, setSelectedPaths] = useState<string[]>([])
  const [anchorPath, setAnchorPath] = useState<string>()
  const [viewMode, setViewMode] = useState<ViewMode>('details')
  const [sortKey, setSortKey] = useState<SortKey>('name')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')
  const [activeMenu, setActiveMenu] = useState<MenuName | null>(null)
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null)
  const [renamingPath, setRenamingPath] = useState<string>()
  const [renameValue, setRenameValue] = useState('')
  // Passcode folders the user has unlocked this window session, plus the live
  // input for the lock prompt. Unlock is intentionally per-window: closing the
  // Explorer re-locks the folder.
  const [unlockedPaths, setUnlockedPaths] = useState<Set<string>>(() => new Set())
  const [passcodeInput, setPasscodeInput] = useState('')
  const [passcodeError, setPasscodeError] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setWindowTitle(windowId, currentPath === 'C:\\' ? 'My Computer' : `Exploring - ${currentPath}`)
  }, [currentPath, setWindowTitle, windowId])

  const currentNode = getNode(state.fs, currentPath)
  const requiredPasscode = currentNode?.attributes?.passcode
  const locked = Boolean(requiredPasscode) && !unlockedPaths.has(currentPath)
  const items = useMemo(
    () => sortNodes(listDirectory(state.fs, currentPath), sortKey, sortDirection),
    [currentPath, sortDirection, sortKey, state.fs],
  )
  const atRoot = currentPath === 'C:\\'
  const folderStats = useMemo(() => {
    const folders = items.filter((node) => node.kind === 'folder').length
    const files = items.length - folders
    const size = items.reduce((sum, node) => sum + (node.kind === 'file' ? node.size : 0), 0)
    return { files, folders, size }
  }, [items])

  function submitPasscode() {
    if (passcodeInput === requiredPasscode) {
      setUnlockedPaths((prev) => new Set(prev).add(currentPath))
      setPasscodeInput('')
      setPasscodeError(false)
    } else {
      setPasscodeError(true)
      setPasscodeInput('')
    }
  }
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

  function runMenuAction(action?: () => void) {
    setActiveMenu(null)
    setContextMenu(null)
    action?.()
  }

  function changeSort(key: SortKey) {
    if (sortKey === key) {
      setSortDirection((direction) => (direction === 'asc' ? 'desc' : 'asc'))
      return
    }
    setSortKey(key)
    setSortDirection('asc')
  }

  function sortLabel(key: SortKey): string {
    if (sortKey !== key) return ''
    return sortDirection === 'asc' ? ' ▲' : ' ▼'
  }

  function showExplorerHelp() {
    showMessageBox({
      title: 'Windows Explorer Help',
      message: 'Use the toolbar, menus, or right-click menu to manage simulated portfolio files.',
      detail:
        'Tip: Ctrl+A selects all items, F2 renames the selected item, Delete moves items to the Recycle Bin, and Backspace goes up one folder.',
      icon: 'info',
      buttons: ['ok'],
    })
  }

  function deleteSelection() {
    const targets = selectedNodes
    if (!targets.length) return
    if (targets.length === 1) {
      confirmDelete(targets[0])
      return
    }
    const hasSystem = targets.some((node) => Boolean(node.attributes?.system) || isProtectedPath(node.path))
    showMessageBox({
      title: hasSystem ? 'Confirm System File Delete' : 'Confirm Multiple File Delete',
      message: hasSystem
        ? `Some of these ${targets.length} items are Windows system files. Deleting them may make Windows unusable. Delete them anyway?`
        : `Are you sure you want to send these ${targets.length} items to the Recycle Bin?`,
      icon: hasSystem ? 'warning' : 'question',
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

  function navigate(path: string, options: NavigateOptions = {}) {
    const normalized = normalizePath(path)
    const node = getNode(state.fs, normalized)
    if (!node || node.kind !== 'folder') {
      showError(`Cannot find '${path}'. Make sure the path or Internet address is correct.`)
      return
    }
    if (node.path === currentPath) {
      setAddress(node.path)
      clearSelection()
      setContextMenu(null)
      setRenamingPath(undefined)
      return
    }
    if (!options.skipHistory) {
      setBackStack((prev) => [...prev, currentPath].slice(-50))
      setForwardStack([])
    }
    setCurrentPath(node.path)
    setAddress(node.path)
    clearSelection()
    setContextMenu(null)
    setActiveMenu(null)
    setRenamingPath(undefined)
    // Drop any half-typed code / error so the prompt is fresh at the new folder.
    setPasscodeInput('')
    setPasscodeError(false)
  }

  function goBack() {
    const previous = backStack[backStack.length - 1]
    if (!previous) return
    setBackStack((prev) => prev.slice(0, -1))
    setForwardStack((prev) => [currentPath, ...prev].slice(0, 50))
    navigate(previous, { skipHistory: true })
  }

  function goForward() {
    const next = forwardStack[0]
    if (!next) return
    setForwardStack((prev) => prev.slice(1))
    setBackStack((prev) => [...prev, currentPath].slice(-50))
    navigate(next, { skipHistory: true })
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

  function sendToDesktop(node: FsNode) {
    setContextMenu(null)
    const error = fsOps.createDesktopShortcut(node.path)
    if (error) showError(error)
  }

  function startRename(node: FsNode) {
    if (isProtectedPath(node.path)) {
      showError('Access is denied. The file is being used by Windows.')
      return
    }
    setRenamingPath(node.path)
    setRenameValue(node.name)
    setContextMenu(null)
    setActiveMenu(null)
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
    setActiveMenu(null)
    if (targetPath && !selectedPaths.includes(targetPath)) selectSingle(targetPath)
    const menuWidth = 190
    const menuHeight = targetPath ? 260 : 194
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
      onPointerDown={() => {
        setContextMenu(null)
        setActiveMenu(null)
      }}
    >
      <ul className="os-menu-bar" role="menubar">
        <li>
          <button
            type="button"
            className={`explorer-menu-trigger ${activeMenu === 'file' ? 'open' : ''}`}
            onPointerDown={(event) => event.stopPropagation()}
            onClick={() => setActiveMenu(activeMenu === 'file' ? null : 'file')}
          >
            File
          </button>
          {activeMenu === 'file' && (
            <ul className="desktop-context-menu explorer-menu-dropdown" role="menu" onPointerDown={(event) => event.stopPropagation()}>
              <li>
                <button type="button" className="context-default" disabled={!selectedNode} onClick={() => runMenuAction(openSelectedButton)}>
                  Open
                </button>
              </li>
              <li className="context-separator" aria-hidden="true"></li>
              <li>
                <button type="button" disabled={protectedHere} onClick={() => runMenuAction(() => createNew('folder'))}>
                  New Folder
                </button>
              </li>
              <li>
                <button type="button" disabled={protectedHere} onClick={() => runMenuAction(() => createNew('file'))}>
                  New Text Document
                </button>
              </li>
              <li>
                <button type="button" disabled={protectedHere} onClick={() => runMenuAction(() => createNew('document'))}>
                  New WordPad Document
                </button>
              </li>
              <li className="context-separator" aria-hidden="true"></li>
              <li>
                <button type="button" disabled={!selectedNode} onClick={() => runMenuAction(deleteSelection)}>
                  Delete
                </button>
              </li>
              <li>
                <button type="button" disabled={!selectedNode} onClick={() => selectedNode && runMenuAction(() => startRename(selectedNode))}>
                  Rename
                </button>
              </li>
              <li>
                <button type="button" disabled={!selectedNode} onClick={() => selectedNode && runMenuAction(() => showProperties(selectedNode))}>
                  Properties
                </button>
              </li>
            </ul>
          )}
        </li>
        <li>
          <button
            type="button"
            className={`explorer-menu-trigger ${activeMenu === 'edit' ? 'open' : ''}`}
            onPointerDown={(event) => event.stopPropagation()}
            onClick={() => setActiveMenu(activeMenu === 'edit' ? null : 'edit')}
          >
            Edit
          </button>
          {activeMenu === 'edit' && (
            <ul className="desktop-context-menu explorer-menu-dropdown" role="menu" onPointerDown={(event) => event.stopPropagation()}>
              <li>
                <button type="button" disabled={!selectedNode} onClick={() => selectedNode && runMenuAction(() => setClipboard({ mode: 'cut', path: selectedNode.path }))}>
                  Cut
                </button>
              </li>
              <li>
                <button type="button" disabled={!selectedNode} onClick={() => selectedNode && runMenuAction(() => setClipboard({ mode: 'copy', path: selectedNode.path }))}>
                  Copy
                </button>
              </li>
              <li>
                <button type="button" disabled={!state.clipboard} onClick={() => runMenuAction(pasteClipboard)}>
                  Paste
                </button>
              </li>
              <li className="context-separator" aria-hidden="true"></li>
              <li>
                <button type="button" disabled={!items.length || locked} onClick={() => runMenuAction(selectAll)}>
                  Select All
                </button>
              </li>
            </ul>
          )}
        </li>
        <li>
          <button
            type="button"
            className={`explorer-menu-trigger ${activeMenu === 'view' ? 'open' : ''}`}
            onPointerDown={(event) => event.stopPropagation()}
            onClick={() => setActiveMenu(activeMenu === 'view' ? null : 'view')}
          >
            View
          </button>
          {activeMenu === 'view' && (
            <ul className="desktop-context-menu explorer-menu-dropdown" role="menu" onPointerDown={(event) => event.stopPropagation()}>
              {VIEW_MODES.map((mode) => (
                <li key={mode.id}>
                  <button type="button" onClick={() => runMenuAction(() => setViewMode(mode.id))}>
                    <span className="menu-check">{viewMode === mode.id ? '*' : ''}</span>
                    {mode.label}
                  </button>
                </li>
              ))}
              <li className="context-separator" aria-hidden="true"></li>
              <li>
                <button type="button" onClick={() => runMenuAction(() => changeSort('name'))}>
                  Sort by Name{sortLabel('name')}
                </button>
              </li>
              <li>
                <button type="button" onClick={() => runMenuAction(() => changeSort('type'))}>
                  Sort by Type{sortLabel('type')}
                </button>
              </li>
              <li>
                <button type="button" onClick={() => runMenuAction(() => changeSort('size'))}>
                  Sort by Size{sortLabel('size')}
                </button>
              </li>
              <li>
                <button type="button" onClick={() => runMenuAction(() => changeSort('modified'))}>
                  Sort by Modified{sortLabel('modified')}
                </button>
              </li>
            </ul>
          )}
        </li>
        <li>
          <button
            type="button"
            className={`explorer-menu-trigger ${activeMenu === 'go' ? 'open' : ''}`}
            onPointerDown={(event) => event.stopPropagation()}
            onClick={() => setActiveMenu(activeMenu === 'go' ? null : 'go')}
          >
            Go
          </button>
          {activeMenu === 'go' && (
            <ul className="desktop-context-menu explorer-menu-dropdown" role="menu" onPointerDown={(event) => event.stopPropagation()}>
              <li>
                <button type="button" disabled={!backStack.length} onClick={() => runMenuAction(goBack)}>
                  Back
                </button>
              </li>
              <li>
                <button type="button" disabled={!forwardStack.length} onClick={() => runMenuAction(goForward)}>
                  Forward
                </button>
              </li>
              <li>
                <button type="button" disabled={atRoot} onClick={() => runMenuAction(() => navigate(parentPath(currentPath)))}>
                  Up One Level
                </button>
              </li>
              <li className="context-separator" aria-hidden="true"></li>
              <li>
                <button type="button" onClick={() => runMenuAction(() => navigate('C:\\'))}>
                  My Computer
                </button>
              </li>
            </ul>
          )}
        </li>
        <li>
          <button
            type="button"
            className={`explorer-menu-trigger ${activeMenu === 'favorites' ? 'open' : ''}`}
            onPointerDown={(event) => event.stopPropagation()}
            onClick={() => setActiveMenu(activeMenu === 'favorites' ? null : 'favorites')}
          >
            Favorites
          </button>
          {activeMenu === 'favorites' && (
            <ul className="desktop-context-menu explorer-menu-dropdown explorer-menu-dropdown-wide" role="menu" onPointerDown={(event) => event.stopPropagation()}>
              {quickPaths.map(([path, label]) => (
                <li key={path}>
                  <button type="button" onClick={() => runMenuAction(() => navigate(path))}>
                    {label}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </li>
        <li>
          <button
            type="button"
            className={`explorer-menu-trigger ${activeMenu === 'help' ? 'open' : ''}`}
            onPointerDown={(event) => event.stopPropagation()}
            onClick={() => setActiveMenu(activeMenu === 'help' ? null : 'help')}
          >
            Help
          </button>
          {activeMenu === 'help' && (
            <ul className="desktop-context-menu explorer-menu-dropdown" role="menu" onPointerDown={(event) => event.stopPropagation()}>
              <li>
                <button type="button" onClick={() => runMenuAction(showExplorerHelp)}>
                  Explorer Help
                </button>
              </li>
              <li>
                <button type="button" disabled={!currentNode} onClick={() => currentNode && runMenuAction(() => showProperties(currentNode))}>
                  About This Folder
                </button>
              </li>
            </ul>
          )}
        </li>
      </ul>
      <div className="file-manager-commandbar" role="toolbar" aria-label="File Manager commands">
        <button type="button" className="file-command-button" onClick={goBack} disabled={!backStack.length} title="Back">
          <span className="file-command-icon file-command-arrow" aria-hidden="true">&lt;</span>
          <span>Back</span>
        </button>
        <button
          type="button"
          className="file-command-button"
          onClick={goForward}
          disabled={!forwardStack.length}
          title="Forward"
        >
          <span className="file-command-icon file-command-arrow" aria-hidden="true">&gt;</span>
          <span>Forward</span>
        </button>
        <button
          type="button"
          className="file-command-button"
          onClick={() => navigate(parentPath(currentPath))}
          disabled={atRoot}
          title="Up one level"
        >
          <span className="file-command-icon file-command-arrow" aria-hidden="true">^</span>
          <span>Up</span>
        </button>
        <button type="button" className="file-command-button" onClick={openSelectedButton} disabled={!selectedNode} title="Open">
          <img className="file-command-icon" src={win98Icons.folderOpen} alt="" />
          <span>Open</span>
        </button>
        <div className="file-command-separator" aria-hidden="true"></div>
        <button
          type="button"
          className="file-command-button"
          onClick={() => selectedNode && setClipboard({ mode: 'cut', path: selectedNode.path })}
          disabled={!selectedNode}
          title="Cut"
        >
          <span className="file-command-icon file-command-cut" aria-hidden="true">X</span>
          <span>Cut</span>
        </button>
        <button
          type="button"
          className="file-command-button"
          onClick={() => selectedNode && setClipboard({ mode: 'copy', path: selectedNode.path })}
          disabled={!selectedNode}
          title="Copy"
        >
          <img className="file-command-icon" src={win98Icons.textFile} alt="" />
          <span>Copy</span>
        </button>
        <button type="button" className="file-command-button" onClick={pasteClipboard} disabled={!state.clipboard} title="Paste">
          <img className="file-command-icon" src={win98Icons.notepad} alt="" />
          <span>Paste</span>
        </button>
        <button type="button" className="file-command-button" onClick={deleteSelection} disabled={!selectedNode} title="Delete">
          <img className="file-command-icon" src={win98Icons.recycleBin} alt="" />
          <span>Delete</span>
        </button>
        <div className="file-command-separator" aria-hidden="true"></div>
        <button
          type="button"
          className="file-command-button"
          onClick={() => createNew('folder')}
          disabled={protectedHere}
          title="New Folder"
        >
          <img className="file-command-icon" src={win98Icons.folder} alt="" />
          <span>New Folder</span>
        </button>
        <button
          type="button"
          className="file-command-button"
          onClick={() => createNew('file')}
          disabled={protectedHere}
          title="New Text"
        >
          <img className="file-command-icon" src={win98Icons.textFile} alt="" />
          <span>New Text</span>
        </button>
        <button
          type="button"
          className="file-command-button"
          onClick={() => createNew('document')}
          disabled={protectedHere}
          title="New Doc"
        >
          <img className="file-command-icon" src={win98Icons.wordpad} alt="" />
          <span>New Doc</span>
        </button>
        <button
          type="button"
          className="file-command-button"
          onClick={() => selectedNode && showProperties(selectedNode)}
          disabled={!selectedNode}
          title="Properties"
        >
          <img className="file-command-icon" src={win98Icons.help} alt="" />
          <span>Properties</span>
        </button>
        <label className="file-view-picker">
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
          <span>Views</span>
        </label>
      </div>
      <form
        className="file-manager-addressbar"
        onSubmit={(event) => {
          event.preventDefault()
          navigate(address)
        }}
      >
        <label htmlFor={`address-${windowId}`}>Address</label>
        <div className="file-address-input-wrap">
          <img src={win98Icons[currentNode?.icon ?? 'folder']} alt="" />
          <input id={`address-${windowId}`} value={address} onChange={(event) => setAddress(event.target.value)} />
        </div>
      </form>
      <div className="file-manager-layout">
        <section className="file-tree-shell" aria-label="Folders">
          <div className="file-tree-title">Folders</div>
          <ul className="tree-view file-tree">
            <li>
              <details open>
                <summary>Desktop</summary>
                <ul>
                  {quickPaths.map(([path, label]) => (
                    <li key={path}>
                      <button
                        type="button"
                        className={`tree-button ${currentPath === path ? 'is-current' : ''}`}
                        onClick={() => navigate(path)}
                      >
                        <img src={win98Icons[getNode(state.fs, path)?.icon ?? 'folder']} alt="" />
                        {label}
                      </button>
                    </li>
                  ))}
                </ul>
              </details>
            </li>
          </ul>
        </section>
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
            ) : locked ? (
              <>
                <img className="file-webinfo-icon" src={win98Icons[currentNode?.icon ?? 'folder']} alt="" />
                <p className="file-webinfo-detail">Locked</p>
                <p className="file-webinfo-blurb">Enter the passcode to view this folder.</p>
              </>
            ) : (
              <>
                <img className="file-webinfo-icon" src={win98Icons[currentNode?.icon ?? 'folder']} alt="" />
                <p className="file-webinfo-detail">{items.length} object(s)</p>
                <p className="file-webinfo-detail">
                  {folderStats.folders} folder(s), {folderStats.files} file(s)
                </p>
                <p className="file-webinfo-detail">{formatSize(folderStats.size) || '0 KB'} used by files</p>
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
          {locked ? (
            <div className="folder-lock">
              <img className="folder-lock-icon" src={win98Icons.folder} alt="" />
              <p className="folder-lock-title">
                <span className="folder-lock-glyph" aria-hidden="true">[locked]</span>
                {' '}
                {currentNode?.name} is protected
              </p>
              <form
                className="folder-lock-form"
                onSubmit={(event) => {
                  event.preventDefault()
                  submitPasscode()
                }}
              >
                <label className="folder-lock-label">
                  Passcode:
                  <input
                    className="folder-lock-input"
                    type="password"
                    inputMode="numeric"
                    autoFocus
                    value={passcodeInput}
                    onChange={(event) => {
                      setPasscodeInput(event.target.value)
                      setPasscodeError(false)
                    }}
                  />
                </label>
                <div className="folder-lock-actions">
                  <button type="submit">OK</button>
                  <button type="button" onClick={() => navigate(parentPath(currentPath))}>
                    Back
                  </button>
                </div>
                {passcodeError && <p className="folder-lock-error">Incorrect passcode. Please try again.</p>}
              </form>
            </div>
          ) : (
            <>
          {viewMode === 'details' && (
            <div className="file-header">
              <button
                type="button"
                aria-sort={sortKey === 'name' ? (sortDirection === 'asc' ? 'ascending' : 'descending') : undefined}
                onClick={() => changeSort('name')}
              >
                Name{sortLabel('name')}
              </button>
              <button
                type="button"
                aria-sort={sortKey === 'type' ? (sortDirection === 'asc' ? 'ascending' : 'descending') : undefined}
                onClick={() => changeSort('type')}
              >
                Type{sortLabel('type')}
              </button>
              <button
                type="button"
                aria-sort={sortKey === 'size' ? (sortDirection === 'asc' ? 'ascending' : 'descending') : undefined}
                onClick={() => changeSort('size')}
              >
                Size{sortLabel('size')}
              </button>
              <button
                type="button"
                aria-sort={sortKey === 'modified' ? (sortDirection === 'asc' ? 'ascending' : 'descending') : undefined}
                onClick={() => changeSort('modified')}
              >
                Modified{sortLabel('modified')}
              </button>
            </div>
          )}
          <div className="file-list-body">
          {items.map((node) => (
            <div
              className={`file-row file-manager-row ${selectedPaths.includes(node.path) ? 'selected' : ''} ${node.attributes?.hidden ? 'is-hidden' : ''}`}
              key={node.path}
              role="button"
              tabIndex={0}
              aria-pressed={selectedPaths.includes(node.path)}
              title={nodeTooltip(node)}
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
                  <>
                    <span className="file-display-name">{node.name}</span>
                    {nodeAttributes(node).length > 0 && (
                      <span className="file-attribute-badges" aria-label={`Attributes: ${nodeAttributes(node).join(', ')}`}>
                        {node.attributes?.system && <span>S</span>}
                        {node.attributes?.readOnly && <span>R</span>}
                        {node.attributes?.hidden && <span>H</span>}
                      </span>
                    )}
                  </>
                )}
              </span>
              <span>{node.fileType}</span>
              <span>{nodeSize(node)}</span>
              <span>{node.modified}</span>
            </div>
          ))}
          {items.length === 0 && <p className="file-list-empty">This folder is empty.</p>}
          </div>
            </>
          )}
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
              <li>
                <button type="button" onClick={() => sendToDesktop(contextNode)}>
                  Send to Desktop
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
              ? `Selected: ${selectedNode.name}${nodeAttributes(selectedNode).length ? ` (${nodeAttributes(selectedNode).join(', ')})` : ''}`
              : currentNode?.name ?? currentPath}
        </p>
        <p className="status-bar-field">
          {items.length} object(s), {formatSize(folderStats.size) || '0 KB'}
        </p>
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
