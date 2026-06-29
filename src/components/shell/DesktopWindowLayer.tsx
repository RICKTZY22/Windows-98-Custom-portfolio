import { useMemo } from 'react'
import type { AppId, WindowPayload, WindowRect, WindowState } from '../../types'
import { WindowFrame } from './WindowFrame'
import { AppWindowContent } from './AppWindowContent'

type DesktopWindowLayerProps = {
  windows: WindowState[]
  activeWindowId?: string
  openApp: (appId: AppId, payload?: WindowPayload) => void
  onFocus: (instanceId: string) => void
  onClose: (instanceId: string) => void
  onMinimize: (instanceId: string) => void
  onToggleMaximize: (instanceId: string) => void
  onMove: (instanceId: string, rect: WindowRect) => void
}

export function DesktopWindowLayer({
  windows,
  activeWindowId,
  openApp,
  onFocus,
  onClose,
  onMinimize,
  onToggleMaximize,
  onMove,
}: DesktopWindowLayerProps) {
  const orderedWindows = useMemo(() => [...windows].sort((a, b) => a.zIndex - b.zIndex), [windows])

  return (
    <>
      {orderedWindows.map((windowState) =>
        windowState.minimized ? null : (
          <WindowFrame
            key={windowState.instanceId}
            window={windowState}
            active={activeWindowId === windowState.instanceId}
            onFocus={onFocus}
            onClose={onClose}
            onMinimize={onMinimize}
            onToggleMaximize={onToggleMaximize}
            onMove={onMove}
          >
            <AppWindowContent windowState={windowState} openApp={openApp} />
          </WindowFrame>
        ),
      )}
    </>
  )
}
