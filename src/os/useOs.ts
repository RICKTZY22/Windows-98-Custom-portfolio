import { createContext, useContext } from 'react'
import type {
  AppId,
  BiosSettings,
  BootProfile,
  ClipboardState,
  CrashState,
  CursorSchemeId,
  FsState,
  MessageBoxButton,
  MessageBoxRequest,
  NetworkState,
  OsState,
  Point,
  SoundId,
  WindowPayload,
  WindowRect,
} from '../types'

// Taglish note: separate file ito para stable ang Fast Refresh. Provider lives
// sa store.tsx, pero hook/context contract nandito para hindi mixed exports.
export type OsContextValue = {
  state: OsState
  // windows
  openApp(appId: AppId, payload?: WindowPayload): void
  openNode(path: string): void
  closeWindow(id: string): void
  minimizeWindow(id: string): void
  focusWindow(id: string): void
  toggleMaximize(id: string): void
  moveWindow(id: string, rect: WindowRect): void
  setWindowTitle(id: string, title: string): void
  // desktop / shell
  setStartMenuOpen(open: boolean): void
  moveDesktopIcon(id: string, pos: Point): void
  arrangeDesktopIcons(): void
  showMessageBox(req: Omit<MessageBoxRequest, 'id'>): void
  dismissMessageBox(id: string, button: MessageBoxButton): void
  // filesystem
  fsOps: {
    createFolder(parent: string, name: string): string | null
    createFile(parent: string, name: string, opts?: { content?: string; dataUrl?: string }): string | null
    writeFile(path: string, data: { content?: string; dataUrl?: string }): string | null
    renameNode(path: string, newName: string): string | null
    moveNode(path: string, targetFolder: string): string | null
    copyNode(path: string, targetFolder: string): string | null
    createDesktopShortcut(targetPath: string): string | null
    deleteNode(path: string, opts?: { skipConfirm?: boolean }): string | null
    restoreEntry(entryId: string): string | null
    emptyRecycleBin(): void
    replaceFs(fs: FsState): void
  }
  setClipboard(c: ClipboardState): void
  // network
  networkOps: {
    connect(): void
    disconnect(): void
    renewDhcp(): void
    applyConfig(partial: Partial<NetworkState>): void
    recordTraffic(sent: number, received: number): void
  }
  // appearance
  setTheme(themeId: string): void
  setWallpaper(wallpaperId: string): void
  setCursorScheme(scheme: CursorSchemeId): void
  // audio
  enableAudio(): void
  setAudioMuted(muted: boolean): void
  setAudioVolume(volume: number): void
  playSound(id: SoundId): void
  // system
  crashSystem(crash: CrashState): void
  enterBiosSetup(): void
  enterBootDeviceMenu(): void
  setBiosSettings(settings: BiosSettings): void
  restart(target?: 'normal' | 'safe' | 'dos' | 'recovery' | 'bootMenu', opts?: { bootProfile?: BootProfile }): void
  shutDown(): void
  finishBoot(): void
  resetEverything(): void
}

export const OsContext = createContext<OsContextValue | null>(null)

export function useOs(): OsContextValue {
  const value = useContext(OsContext)
  if (!value) {
    throw new Error('useOs() must be used inside <OsProvider>.')
  }
  return value
}
