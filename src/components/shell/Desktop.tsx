import { useCallback, useEffect, useRef, useState } from 'react'
import { getNode } from '../../os/filesystem'
import { videoDriverHealth } from '../../os/systemHealth'
import { useOs } from '../../os/useOs'
import { BootDisclaimer } from '../system/BootDisclaimer'
import { DesktopContextMenu, type DesktopArrangeMode } from './DesktopContextMenu'
import { DesktopIconLayer } from './DesktopIconLayer'
import { DesktopWindowLayer } from './DesktopWindowLayer'
import { MessageBoxHost, MouseTrails, NotificationHost } from './ShellHosts'
import { StartMenu } from './StartMenu'
import { Taskbar } from './Taskbar'
import {
  builtInDesktopIconFallbackId,
  desktopIconHeight,
  desktopIconWidth,
  desktopShellIntroMs,
  gridPositionForIndex,
  isEditableTarget,
  sortDesktopIconDefs,
} from './desktopModel'
import { useDesktopIconModel } from './useDesktopIconModel'
import { useDesktopSelectionBox } from './useDesktopSelectionBox'

export function Desktop() {
  const {
    state,
    openApp,
    closeWindow,
    minimizeWindow,
    focusWindow,
    toggleMaximize,
    moveWindow,
    setStartMenuOpen,
    moveDesktopIcon,
    restart,
    shutDown,
    enableAudio,
    setAudioMuted,
    setAudioVolume,
    fsOps,
    showMessageBox,
    completeDesktopShellIntro,
  } = useOs()
  const [selectedIcon, setSelectedIcon] = useState(builtInDesktopIconFallbackId)
  const [selectedIconIds, setSelectedIconIds] = useState<string[]>(() => [builtInDesktopIconFallbackId])
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null)
  const [arrangeMode, setArrangeMode] = useState<DesktopArrangeMode>('name')
  const [autoArrange, setAutoArrange] = useState(false)
  const [recycleHover, setRecycleHover] = useState(false)
  const [refreshingDesktop, setRefreshingDesktop] = useState(false)
  const [shellIntroActive, setShellIntroActive] = useState(true)
  const desktopRef = useRef<HTMLDivElement>(null)
  const { allIconDefs, iconPositions } = useDesktopIconModel(state.fs, state.desktopIcons)
  const { selectionBox, startSelectionBox } = useDesktopSelectionBox({
    desktopRef,
    icons: allIconDefs,
    iconPositions,
    onSelectionChange: setSelectedIconIds,
  })
  const primarySelectedIcon = selectedIconIds[0]
  const keyboardAnchorIcon = primarySelectedIcon ?? selectedIcon ?? builtInDesktopIconFallbackId
  const videoHealth = videoDriverHealth(state.fs)
  const displayDriverDegraded =
    state.bootMode !== 'safe' &&
    (videoHealth.level === 'degraded' || videoHealth.level === 'unstable' || videoHealth.level === 'critical')
  const displayDriverUnstable =
    state.bootMode !== 'safe' && (videoHealth.level === 'unstable' || videoHealth.level === 'critical')

  useEffect(() => {
    const delay = state.bootMode === 'safe' ? 300 : desktopShellIntroMs
    const timer = window.setTimeout(() => {
      setShellIntroActive(false)
      completeDesktopShellIntro()
    }, delay)
    return () => window.clearTimeout(timer)
  }, [completeDesktopShellIntro, state.bootMode])

  function focusDesktopIcon(id: string) {
    window.requestAnimationFrame(() => {
      const button = desktopRef.current?.querySelector<HTMLButtonElement>(`[data-desktop-icon-id="${id}"]`)
      button?.focus()
    })
  }

  function selectDesktopIcon(id: string, extend = false) {
    setSelectedIcon(id)
    setSelectedIconIds((current) => {
      if (!extend) return [id]
      return current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
    })
  }

  const handleCloseWindow = useCallback(
    (instanceId: string) => {
      const target = state.windows.find((item) => item.instanceId === instanceId)
      if (target?.appId === 'setupSafety') {
        focusWindow(instanceId)
        window.dispatchEvent(new Event('setup-safety-close-attempt'))
        return
      }
      closeWindow(instanceId)
    },
    [closeWindow, focusWindow, state.windows],
  )

  const findNextDesktopIcon = useCallback(
    (currentId: string, key: string): string => {
      const current = iconPositions[currentId] ?? { x: 10, y: 12 }
      const currentCenter = {
        x: current.x + desktopIconWidth / 2,
        y: current.y + desktopIconHeight / 2,
      }
      const scored = allIconDefs
        .filter((icon) => icon.id !== currentId)
        .map((icon) => {
          const pos = iconPositions[icon.id] ?? { x: 10, y: 12 }
          const center = { x: pos.x + desktopIconWidth / 2, y: pos.y + desktopIconHeight / 2 }
          return { id: icon.id, dx: center.x - currentCenter.x, dy: center.y - currentCenter.y }
        })
        .filter((item) => {
          if (key === 'ArrowRight') return item.dx > 0
          if (key === 'ArrowLeft') return item.dx < 0
          if (key === 'ArrowDown') return item.dy > 0
          return item.dy < 0
        })
        .sort((a, b) => {
          const primaryA = key === 'ArrowLeft' || key === 'ArrowRight' ? Math.abs(a.dx) : Math.abs(a.dy)
          const primaryB = key === 'ArrowLeft' || key === 'ArrowRight' ? Math.abs(b.dx) : Math.abs(b.dy)
          const secondaryA = key === 'ArrowLeft' || key === 'ArrowRight' ? Math.abs(a.dy) : Math.abs(a.dx)
          const secondaryB = key === 'ArrowLeft' || key === 'ArrowRight' ? Math.abs(b.dy) : Math.abs(b.dx)
          return primaryA - primaryB || secondaryA - secondaryB
        })
      return scored[0]?.id ?? currentId
    },
    [allIconDefs, iconPositions],
  )

  const handleDropOnRecycle = useCallback(
    (iconId: string) => {
      setRecycleHover(false)
      if (!iconId.startsWith('fs:')) return
      const path = iconId.slice(3)
      const node = getNode(state.fs, path)
      if (!node) return
      showMessageBox({
        title: 'Confirm File Delete',
        message: `Are you sure you want to send '${node.name.replace(/\.lnk$/i, '')}' to the Recycle Bin?`,
        icon: 'question',
        buttons: ['yes', 'no'],
        onResult: (button) => {
          if (button !== 'yes') return
          const error = fsOps.deleteNode(path, { skipConfirm: true })
          if (error) {
            showMessageBox({ title: 'Delete', message: error, icon: 'error', buttons: ['ok'] })
          }
        },
      })
    },
    [state.fs, fsOps, showMessageBox],
  )

  const applyDesktopIconLayout = useCallback(
    (iconIds: string[]) => {
      iconIds.forEach((id, index) => {
        moveDesktopIcon(id, gridPositionForIndex(index))
      })
    },
    [moveDesktopIcon],
  )

  function arrangeIconsBy(mode: DesktopArrangeMode) {
    setArrangeMode(mode)
    applyDesktopIconLayout(sortDesktopIconDefs(allIconDefs, mode, state.fs.nodes).map((icon) => icon.id))
    setContextMenu(null)
  }

  function toggleAutoArrange() {
    const next = !autoArrange
    setAutoArrange(next)
    if (next) {
      applyDesktopIconLayout(sortDesktopIconDefs(allIconDefs, arrangeMode, state.fs.nodes).map((icon) => icon.id))
    }
    setContextMenu(null)
  }

  function lineUpIcons() {
    const targets = selectedIconIds.length ? selectedIconIds : allIconDefs.map((icon) => icon.id)
    const orderedTargets = [...targets].sort((a, b) => {
      const posA = iconPositions[a] ?? { x: 10, y: 12 }
      const posB = iconPositions[b] ?? { x: 10, y: 12 }
      return posA.y - posB.y || posA.x - posB.x
    })
    orderedTargets.forEach((id, index) => {
      moveDesktopIcon(id, gridPositionForIndex(index))
    })
    setContextMenu(null)
  }

  useEffect(() => {
    if (!autoArrange) return
    applyDesktopIconLayout(sortDesktopIconDefs(allIconDefs, arrangeMode, state.fs.nodes).map((icon) => icon.id))
  }, [allIconDefs, applyDesktopIconLayout, arrangeMode, autoArrange, state.fs.nodes])

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const activeWindow = state.windows.find((item) => item.instanceId === state.activeWindowId)

      if (
        activeWindow &&
        !activeWindow.minimized &&
        ((event.altKey && event.key === 'F4') || (event.ctrlKey && event.key.toLowerCase() === 'w'))
      ) {
        event.preventDefault()
        handleCloseWindow(activeWindow.instanceId)
        return
      }

      if (activeWindow?.appId === 'dosGame' && !activeWindow.minimized) {
        return
      }
      if (event.ctrlKey && event.key === 'Escape') {
        event.preventDefault()
        setContextMenu(null)
        setStartMenuOpen(!state.startMenuOpen)
        return
      }
      if (event.key === 'Escape') {
        setStartMenuOpen(false)
        setContextMenu(null)
        if (selectedIconIds.length) {
          setSelectedIconIds([])
        }
      }
      if (event.altKey && event.key.toLowerCase() === 'tab') {
        event.preventDefault()
        const visible = state.windows.filter((item) => !item.minimized)
        if (!visible.length) return
        const currentIndex = visible.findIndex((item) => item.instanceId === state.activeWindowId)
        const step = event.shiftKey ? -1 : 1
        const nextIndex = (currentIndex + step + visible.length) % visible.length
        focusWindow(visible[nextIndex].instanceId)
      }
      if (event.key === 'F5') {
        event.preventDefault()
        refreshDesktop()
      }
      if (isEditableTarget(event.target)) {
        return
      }
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) {
        event.preventDefault()
        const nextId = findNextDesktopIcon(keyboardAnchorIcon, event.key)
        selectDesktopIcon(nextId)
        focusDesktopIcon(nextId)
      }
      if (event.key === 'Enter' && primarySelectedIcon) {
        const icon = allIconDefs.find((item) => item.id === primarySelectedIcon)
        if (icon) {
          event.preventDefault()
          openApp(icon.appId, icon.payload)
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [
    allIconDefs,
    focusWindow,
    findNextDesktopIcon,
    handleCloseWindow,
    openApp,
    keyboardAnchorIcon,
    primarySelectedIcon,
    selectedIconIds.length,
    setStartMenuOpen,
    state.activeWindowId,
    state.startMenuOpen,
    state.windows,
  ])

  function taskClick(instanceId: string) {
    const target = state.windows.find((item) => item.instanceId === instanceId)
    if (!target) return
    if (state.activeWindowId === instanceId && !target.minimized) {
      minimizeWindow(instanceId)
    } else {
      focusWindow(instanceId)
    }
  }

  function refreshDesktop() {
    setContextMenu(null)
    setRefreshingDesktop(true)
    window.setTimeout(() => setRefreshingDesktop(false), 260)
  }

  return (
    <main
      className={`os-shell ${state.bootMode === 'safe' ? 'safe-mode' : ''} ${
        displayDriverDegraded ? 'display-driver-missing' : ''
      } ${displayDriverUnstable ? 'display-driver-unstable' : ''} ${shellIntroActive ? 'is-shell-starting' : ''}`}
      onPointerDown={() => {
        setStartMenuOpen(false)
        setContextMenu(null)
      }}
    >
      <div
        ref={desktopRef}
        className={`desktop ${refreshingDesktop ? 'is-refreshing' : ''} ${
          displayDriverDegraded ? 'is-display-degraded' : ''
        } ${displayDriverUnstable ? 'is-display-unstable' : ''}`}
        aria-label="Windows 98 portfolio desktop"
        onPointerDown={(event) => {
          const target = event.target as HTMLElement
          setStartMenuOpen(false)
          setContextMenu(null)
          if (event.button !== 0 || target.closest('.desktop-icon, .window, .desktop-context-menu')) {
            return
          }
          startSelectionBox(event)
        }}
        onContextMenu={(event) => {
          event.preventDefault()
          const target = event.target as HTMLElement
          const iconButton = target.closest<HTMLButtonElement>('.desktop-icon')
          if (iconButton?.dataset.desktopIconId) {
            selectDesktopIcon(iconButton.dataset.desktopIconId)
          } else {
            setSelectedIconIds([])
          }
          const menuWidth = 210
          const menuHeight = 190
          setStartMenuOpen(false)
          setContextMenu({
            x: Math.max(2, Math.min(event.clientX, window.innerWidth - menuWidth - 2)),
            y: Math.max(2, Math.min(event.clientY, window.innerHeight - menuHeight - 38)),
          })
        }}
      >
        {state.bootMode === 'safe' && (
          <div className="safe-mode-banner" role="status">
            <strong>Safe Mode</strong>
            <span>
              Generic VGA, keyboard &amp; mouse loaded for repair. Networking, sound, and accelerated video are
              disabled.
            </span>
          </div>
        )}
        <DesktopIconLayer
          icons={allIconDefs}
          iconPositions={iconPositions}
          fsNodes={state.fs.nodes}
          selectedIconIds={selectedIconIds}
          recycleHover={recycleHover}
          selectionBox={selectionBox}
          autoArrange={autoArrange}
          onSelectIcon={selectDesktopIcon}
          onOpenIcon={(icon) => openApp(icon.appId, icon.payload)}
          onMoveIcon={moveDesktopIcon}
          onRecycleHoverChange={setRecycleHover}
          onDropOnRecycle={handleDropOnRecycle}
        />
        <DesktopWindowLayer
          windows={state.windows}
          activeWindowId={state.activeWindowId}
          openApp={openApp}
          onFocus={focusWindow}
          onClose={handleCloseWindow}
          onMinimize={minimizeWindow}
          onToggleMaximize={toggleMaximize}
          onMove={moveWindow}
        />
        {state.startMenuOpen && (
          <div onPointerDown={(event) => event.stopPropagation()}>
            <StartMenu
              openApp={openApp}
              onRestart={() => restart('normal', { bootProfile: 'warm' })}
              onShutdown={shutDown}
              network={state.network}
            />
          </div>
        )}
        {contextMenu && (
          <DesktopContextMenu
            x={contextMenu.x}
            y={contextMenu.y}
            openApp={(appId, payload) => {
              setContextMenu(null)
              openApp(appId, payload)
            }}
            arrangeMode={arrangeMode}
            autoArrange={autoArrange}
            onRefresh={refreshDesktop}
            onArrangeIcons={() => arrangeIconsBy(arrangeMode)}
            onArrangeBy={arrangeIconsBy}
            onToggleAutoArrange={toggleAutoArrange}
            onLineUpIcons={lineUpIcons}
          />
        )}
        <MessageBoxHost />
        <NotificationHost />
        {shellIntroActive && state.bootMode !== 'safe' && (
          <div className="desktop-startup-loader" aria-live="polite">
            <span className="desktop-startup-loader-icon" aria-hidden="true"></span>
            <span>Loading Windows settings...</span>
          </div>
        )}
        {!shellIntroActive && <BootDisclaimer />}
      </div>
      <Taskbar
        windows={state.windows}
        activeWindowId={state.activeWindowId}
        startOpen={state.startMenuOpen}
        network={state.network}
        audioEnabled={state.audio.enabled}
        audioMuted={state.audio.muted}
        audioVolume={state.audio.volume}
        onToggleStart={() => setStartMenuOpen(!state.startMenuOpen)}
        onTaskClick={taskClick}
        onToggleNetwork={() => openApp('network')}
        onToggleMute={() => {
          if (!state.audio.enabled) {
            enableAudio()
          } else {
            setAudioMuted(!state.audio.muted)
          }
        }}
        onSetVolume={setAudioVolume}
        onTaskRestore={focusWindow}
        onTaskMinimize={minimizeWindow}
        onTaskToggleMaximize={toggleMaximize}
        onTaskClose={handleCloseWindow}
        onMinimizeAll={() => {
          state.windows.filter((window) => !window.minimized).forEach((window) => minimizeWindow(window.instanceId))
        }}
        onOpenTaskManager={() => openApp('taskManager')}
        onOpenTaskbarProperties={() => openApp('controlPanel', { controlPanelSection: 'display' })}
      />
      {state.appearanceEffects.mouseTrails && <MouseTrails />}
    </main>
  )
}
