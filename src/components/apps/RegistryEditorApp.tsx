import { useMemo, useState } from 'react'
import type { DriverType } from '../../types'
import { createRegistrySnapshot, flattenRegistryKeys, type RegistryKey } from '../../data/registry'
import { useOs } from '../../os/useOs'
import { driverStatusLabel } from '../../os/systemHealth'
import './RegistryEditorApp.css'

const driverTypes: readonly DriverType[] = ['network', 'audio', 'video', 'input', 'storage']

type RegistryTreeNodeProps = Readonly<{
  node: RegistryKey
  depth: number
  expanded: ReadonlySet<string>
  selectedPath: string
  onSelect: (path: string) => void
  onToggle: (path: string) => void
}>

function RegistryTreeNode({ node, depth, expanded, selectedPath, onSelect, onToggle }: RegistryTreeNodeProps) {
  const hasChildren = Boolean(node.children?.length)
  const isExpanded = expanded.has(node.path)
  const isSelected = selectedPath === node.path

  return (
    <li>
      <div className={`registry-tree-row ${isSelected ? 'selected' : ''}`} style={{ paddingLeft: 4 + depth * 14 }}>
        <button
          type="button"
          className="registry-toggle"
          disabled={!hasChildren}
          aria-label={hasChildren ? `${isExpanded ? 'Collapse' : 'Expand'} ${node.name}` : undefined}
          onClick={(event) => {
            event.stopPropagation()
            onToggle(node.path)
          }}
        >
          {hasChildren ? (isExpanded ? '-' : '+') : ''}
        </button>
        <button type="button" className="registry-key-button" onClick={() => onSelect(node.path)}>
          <span className="registry-folder-icon" aria-hidden="true"></span>
          {node.name}
        </button>
      </div>
      {hasChildren && isExpanded && (
        <ul>
          {node.children?.map((child) => (
            <RegistryTreeNode
              key={child.path}
              node={child}
              depth={depth + 1}
              expanded={expanded}
              selectedPath={selectedPath}
              onSelect={onSelect}
              onToggle={onToggle}
            />
          ))}
        </ul>
      )}
    </li>
  )
}

export function RegistryEditorApp() {
  const { state, showMessageBox } = useOs()
  const roots = useMemo(() => {
    const driverStatus = driverTypes.reduce(
      (map, type) => ({ ...map, [type]: driverStatusLabel(state.fs, type) }),
      {} as Record<DriverType, string>,
    )
    return createRegistrySnapshot({
      themeId: state.themeId,
      wallpaperId: state.wallpaperId,
      wallpaperMode: state.wallpaperMode,
      cursorScheme: state.cursorScheme,
      audioEnabled: state.audio.enabled,
      audioMuted: state.audio.muted,
      audioVolume: state.audio.volume,
      networkConnected: state.network.connected,
      ipAddress: state.network.ipAddress,
      quickPost: state.bios.quickPost,
      bootOrder: state.bios.bootOrder.join(', '),
      driverStatus,
    })
  }, [
    state.audio.enabled,
    state.audio.muted,
    state.audio.volume,
    state.bios.bootOrder,
    state.bios.quickPost,
    state.cursorScheme,
    state.fs,
    state.network.connected,
    state.network.ipAddress,
    state.themeId,
    state.wallpaperId,
    state.wallpaperMode,
  ])
  const allKeys = useMemo(() => flattenRegistryKeys(roots), [roots])
  const [selectedPath, setSelectedPath] = useState(roots[0]?.path ?? 'HKEY_CLASSES_ROOT')
  const [expanded, setExpanded] = useState<Set<string>>(
    () => new Set(['HKEY_CLASSES_ROOT', 'HKEY_CURRENT_USER', 'HKEY_LOCAL_MACHINE']),
  )
  const selectedKey = allKeys.find((item) => item.path === selectedPath) ?? roots[0]

  function toggleKey(path: string) {
    setExpanded((current) => {
      const next = new Set(current)
      if (next.has(path)) {
        next.delete(path)
      } else {
        next.add(path)
      }
      return next
    })
  }

  function showReadOnlyNotice() {
    showMessageBox({
      title: 'Registry Editor',
      message: 'Registry editing is read-only in this portfolio OS.',
      detail:
        'This is a browser-only educational snapshot. It does not read, write, export, or modify any real Windows registry.',
      icon: 'info',
      buttons: ['ok'],
    })
  }

  return (
    <div className="app-content registry-app">
      <ul className="os-menu-bar">
        {['Registry', 'Edit', 'View', 'Favorites', 'Help'].map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
      <div className="toolbar registry-toolbar" role="toolbar" aria-label="Registry Editor toolbar">
        <button type="button" onClick={showReadOnlyNotice}>
          Import...
        </button>
        <button type="button" onClick={showReadOnlyNotice}>
          Export...
        </button>
        <span className="toolbar-separator" aria-hidden="true"></span>
        <button type="button" onClick={showReadOnlyNotice}>
          New Key
        </button>
        <button type="button" onClick={showReadOnlyNotice}>
          Edit Value
        </button>
        <button type="button" onClick={showReadOnlyNotice}>
          Delete
        </button>
      </div>
      <div className="registry-readonly-banner">
        Safe mode: read-only simulated registry for portfolio education.
      </div>
      <div className="registry-body">
        <div className="sunken-panel registry-tree" role="tree" aria-label="Registry keys">
          <ul>
            {roots.map((root) => (
              <RegistryTreeNode
                key={root.path}
                node={root}
                depth={0}
                expanded={expanded}
                selectedPath={selectedKey?.path ?? selectedPath}
                onSelect={setSelectedPath}
                onToggle={toggleKey}
              />
            ))}
          </ul>
        </div>
        <div className="sunken-panel registry-values">
          <div className="registry-values-header">
            <span>Name</span>
            <span>Type</span>
            <span>Data</span>
          </div>
          {selectedKey?.values.map((value) => (
            <button
              type="button"
              key={`${selectedKey.path}:${value.name}`}
              className="registry-value-row"
              onDoubleClick={showReadOnlyNotice}
            >
              <span>{value.name}</span>
              <span>{value.type}</span>
              <span>{value.data}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="status-bar registry-status">
        <span>{selectedKey?.path ?? selectedPath}</span>
        <span>{selectedKey?.values.length ?? 0} value(s)</span>
      </div>
    </div>
  )
}
