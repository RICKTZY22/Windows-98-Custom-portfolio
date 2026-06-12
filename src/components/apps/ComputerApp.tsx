import { useMemo, useState } from 'react'
import { getNode, getParentPath, isPathWithin, listDirectory, normalizePath } from '../../data/filesystem'
import { win98Icons } from '../../data/icons'
import type { AppId, FileSystemNode, WindowPayload } from '../../types'

type ComputerAppProps = {
  path?: string
  openApp: (appId: AppId, payload?: WindowPayload) => void
  deletedPaths: Set<string>
  onDeleteNode: (node: FileSystemNode) => void
}

function formatSize(node: FileSystemNode) {
  if (node.kind === 'folder') {
    return ''
  }
  return `${node.size ?? 0} bytes`
}

function isDeletedPath(path: string, deletedPaths: Set<string>) {
  return [...deletedPaths].some((deletedPath) => isPathWithin(path, deletedPath))
}

export function ComputerApp({ path = 'C:\\', openApp, deletedPaths, onDeleteNode }: ComputerAppProps) {
  const [currentPath, setCurrentPath] = useState(() => normalizePath(path))
  const [address, setAddress] = useState(() => normalizePath(path))
  const [selectedPath, setSelectedPath] = useState<string>()

  const currentPathDeleted = isDeletedPath(currentPath, deletedPaths)
  const currentNode = currentPathDeleted ? undefined : getNode(currentPath)
  const items = useMemo(
    () => (currentPathDeleted ? [] : listDirectory(currentPath).filter((node) => !isDeletedPath(node.path, deletedPaths))),
    [currentPath, currentPathDeleted, deletedPaths],
  )
  const selectedNode = selectedPath && !isDeletedPath(selectedPath, deletedPaths) ? getNode(selectedPath) : undefined

  function navigate(nextPath: string) {
    const normalized = normalizePath(nextPath)
    const node = getNode(normalized)
    if (node?.kind === 'folder' && !isDeletedPath(normalized, deletedPaths)) {
      setCurrentPath(normalized)
      setAddress(normalized)
      setSelectedPath(undefined)
    }
  }

  function openNode(node: FileSystemNode) {
    if (node.kind === 'folder') {
      navigate(node.path)
      return
    }
    if (node.appId === 'projectDetails') {
      openApp('projectDetails', { projectId: node.content })
      return
    }
    if (node.appId === 'controlPanel') {
      openApp('controlPanel', { controlPanelSection: node.content as WindowPayload['controlPanelSection'] })
      return
    }
    if (node.appId) {
      openApp(
        node.appId,
        node.fileType === 'Application' ? { path: getParentPath(node.path) } : { filePath: node.path, path: getParentPath(node.path) },
      )
      return
    }
    openApp('notepad', { filePath: node.path, path: getParentPath(node.path) })
  }

  function deleteSelected() {
    if (!selectedNode) {
      return
    }
    onDeleteNode(selectedNode)
    setSelectedPath(undefined)
  }

  return (
    <div className="app-content computer-app file-manager-app">
      <ul className="os-menu-bar" role="menubar">
        <li>File</li>
        <li>Edit</li>
        <li>View</li>
        <li>Go</li>
        <li>Favorites</li>
        <li>Help</li>
      </ul>
      <div className="toolbar file-manager-toolbar">
        <button type="button" onClick={() => navigate(getParentPath(currentPath))}>
          Up
        </button>
        <button type="button" onClick={() => navigate('C:\\')}>
          C:\
        </button>
        <button type="button" onClick={() => navigate('C:\\Windows\\System32')}>
          System32
        </button>
        <button type="button" onClick={() => selectedNode && openNode(selectedNode)} disabled={!selectedNode}>
          Open
        </button>
        <button type="button" onClick={deleteSelected} disabled={!selectedNode}>
          Delete
        </button>
        <form
          className="address-form"
          onSubmit={(event) => {
            event.preventDefault()
            navigate(address)
          }}
        >
          <label htmlFor="address">Address</label>
          <input id="address" value={address} onChange={(event) => setAddress(event.target.value)} />
        </form>
      </div>
      <div className="file-manager-layout">
        <ul className="tree-view file-tree">
          <li>
            <details open>
              <summary>Desktop</summary>
              <ul>
                <li>
                  <button type="button" className="tree-button" onClick={() => navigate('C:\\')}>
                    <img src={win98Icons.hardDrive} alt="" />
                    Portfolio (C:)
                  </button>
                </li>
                <li>
                  <button type="button" className="tree-button" onClick={() => navigate('C:\\My Documents')}>
                    <img src={win98Icons.projects} alt="" />
                    My Documents
                  </button>
                </li>
                <li>
                  <button type="button" className="tree-button" onClick={() => navigate('C:\\My Pictures')}>
                    <img src={win98Icons.folder} alt="" />
                    My Pictures
                  </button>
                </li>
                <li>
                  <button type="button" className="tree-button" onClick={() => navigate('C:\\Program Files')}>
                    <img src={win98Icons.programGroup} alt="" />
                    Program Files
                  </button>
                </li>
                <li>
                  <button type="button" className="tree-button" onClick={() => navigate('C:\\Windows\\System32')}>
                    <img src={win98Icons.adminTools} alt="" />
                    System32
                  </button>
                </li>
                <li>
                  <button type="button" className="tree-button" onClick={() => navigate('C:\\Network')}>
                    <img src={win98Icons.network} alt="" />
                    Network
                  </button>
                </li>
              </ul>
            </details>
          </li>
        </ul>
        <div className="sunken-panel file-list rich-file-list">
          <div className="file-header">
            <span>Name</span>
            <span>Type</span>
            <span>Size</span>
            <span>Modified</span>
          </div>
          {items.map((node) => (
            <button
              className={`file-row file-manager-row ${selectedPath === node.path ? 'selected' : ''}`}
              key={node.path}
              type="button"
              aria-pressed={selectedPath === node.path}
              onClick={() => setSelectedPath(node.path)}
              onDoubleClick={() => openNode(node)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault()
                  openNode(node)
                }
                if (event.key === 'Delete') {
                  event.preventDefault()
                  setSelectedPath(node.path)
                  onDeleteNode(node)
                }
              }}
            >
              <span className="file-name-cell">
                <img src={win98Icons[node.icon]} alt="" />
                {node.name}
              </span>
              <span>{node.kind === 'folder' ? 'File Folder' : node.fileType ?? 'File'}</span>
              <span>{formatSize(node)}</span>
              <span>{node.modified}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="status-bar">
        <p className="status-bar-field">{selectedNode ? `Selected: ${selectedNode.name}` : currentNode?.name ?? currentPath}</p>
        <p className="status-bar-field">{items.length} object(s)</p>
      </div>
    </div>
  )
}
