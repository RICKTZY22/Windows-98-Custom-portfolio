// Windows 98 Portfolio Edition (c) 2026 John Erick Mendoza (github.com/RICKTZY22) - MIT, attribution required. origin-fingerprint: JEM-W98P-ORIGIN-7f3a9c1e2b5d
import { useCallback, useEffect, useMemo, useReducer, useRef } from 'react'
import type { ReactNode } from 'react'
import type {
  AppId,
  AppearanceEffects,
  AudioState,
  BiosSettings,
  BootProfile,
  ClipboardState,
  CrashState,
  CursorSchemeId,
  DriverType,
  FsState,
  MessageBoxButton,
  MessageBoxRequest,
  NetworkState,
  OsNotification,
  OsState,
  Point,
  SoundId,
  WallpaperMode,
  WindowPayload,
  WindowRect,
  WindowState,
} from '../types'
import { appDefinitions } from '../data/apps'
import { defaultBiosSettings } from '../data/bios'
import { createInitialFsState, ensurePortfolioSeedFiles } from '../data/initialFilesystem'
import { defaultThemeId, defaultWallpaperId, getTheme, getWallpaper } from '../data/themes'
import {
  baseName,
  copyNode as fsCopyNode,
  createDesktopShortcut as fsCreateDesktopShortcut,
  createFile as fsCreateFile,
  createFolder as fsCreateFolder,
  deleteNode as fsDeleteNode,
  emptyRecycleBin as fsEmptyRecycleBin,
  getNode,
  moveNode as fsMoveNode,
  normalizePath,
  nowStamp,
  parentPath,
  openTargetFor,
  renameNode as fsRenameNode,
  restoreEntry as fsRestoreEntry,
  writeFile as fsWriteFile,
} from './filesystem'
import { defaultNetworkState, randomDhcpLease, releasedNetworkState } from './network'
import { isSystemHealthy, missingRequiredSystemFiles, restoreSystemFiles, shouldSafeModeBlueScreen } from './recovery'
import {
  driverDeviceLabels,
  driverFailureBox,
  driverHealthy,
  effectiveDriverHealthy,
  missingDriverFiles,
  requiredDriverMissing,
} from './systemHealth'
import { FEATURE_FILES, featureAvailable, systemFileFailureBox } from './systemFiles'
import { applyAppearanceEffects, applyCursorScheme, applyTheme, applyWallpaper } from './themes'
import { isAudioUnlocked, playSound as synthPlaySound, preloadSoundFiles, unlockAudio } from './audio'
import {
  clearPersistedState,
  loadPersistedState,
  markSessionClean,
  markSessionRunning,
  persistState,
  wasSessionDirty,
} from './persistence'
import { OsContext, type OsContextValue } from './useOs'
import {
  clampIconPosition,
  clampRect,
  defaultDesktopIconPositions,
  iconFor,
  instanceIdFor,
  missingAppDependency,
  missingAppDriverDependency,
  nextActiveWindow,
  titleFor,
} from './windowManager'

// Re-exported for existing unit tests while the provider boundary is phased out.
// eslint-disable-next-line react-refresh/only-export-components
export { missingAppDependency, missingAppDriverDependency } from './windowManager'

function protectionCrash(path: string): CrashState {
  return {
    title: 'Windows protection error',
    message: 'The system has become unstable because a required system component was removed.',
    detail: `While initializing device ${baseName(path).toUpperCase()}: the file ${path} could not be found. Explorer, networking, display drivers, and shell services cannot continue.`,
    stopCode: '0E : 0028 : C0011E36',
    crashedAt: nowStamp(),
  }
}

// Build a Win98-style "what was affected" notice for a filesystem change that
// removed nodes. Returns null for non-deletions (creates, edits) and for
// moves/renames (which remove an old path but add a new one). Works for both
// Explorer deletes and terminal `del` since both flow through commitFs.
function summarizeDeletion(before: FsState, after: FsState): { title: string; body: string } | null {
  const removed = Object.keys(before.nodes).filter((path) => !(path in after.nodes))
  if (removed.length === 0) return null
  const added = Object.keys(after.nodes).some((path) => !(path in before.nodes))
  if (added) return null // a move or rename, not a deletion

  const recycled = after.recycle.length > before.recycle.length
  const verb = recycled ? 'moved to the Recycle Bin' : 'permanently deleted'
  const removedSet = new Set(removed)
  // Top-level deleted nodes are those whose parent was not also removed.
  const roots = removed.filter((path) => !removedSet.has(parentPath(path)))

  let files = 0
  let folders = 0
  for (const path of removed) {
    if (before.nodes[path]?.kind === 'folder') folders += 1
    else files += 1
  }

  if (roots.length === 1) {
    const root = before.nodes[roots[0]]
    const name = root?.name ?? baseName(roots[0])
    if (root?.kind === 'folder') {
      if (removed.length === 1) {
        return { title: 'Folder deleted', body: `Empty folder "${name}" was ${verb}.` }
      }
      return {
        title: 'Folder deleted',
        body: `"${name}" was ${verb} with its contents: ${files} file(s) and ${folders - 1} folder(s).`,
      }
    }
    return { title: 'File deleted', body: `"${name}" was ${verb}.` }
  }

  return {
    title: 'Items deleted',
    body: `${roots.length} items were ${verb}: ${files} file(s) and ${folders} folder(s).`,
  }
}

// ----- simulated RAM budget (out-of-memory guardrail) -----
// The BIOS reports 64MB. Windows reserves a slice for itself and each open
// program occupies a little. Opening too many at once overflows RAM and faults
// out; the CRASH reducer clears every window, so the user is forced back to a
// clean desktop (mirrors a real low-memory protection fault).
const SIMULATED_RAM_MB = 64
const SYSTEM_RESERVED_MB = 12
const DEFAULT_APP_MEMORY_MB = 5

function appMemoryCost(appId: AppId): number {
  return appDefinitions[appId].memoryCost ?? DEFAULT_APP_MEMORY_MB
}

function outOfMemoryCrash(openCount: number, usedMB: number): CrashState {
  return {
    title: 'Windows protection error',
    message: 'The system is dangerously low on memory and Windows must close to recover.',
    detail: `Too many programs were open at once (${openCount}). Simulated memory use reached ${usedMB} MB of ${SIMULATED_RAM_MB} MB and the system ran out of RAM. All programs have been closed to recover memory. Open fewer programs at a time.`,
    stopCode: '0D : 0000 : 0001E84F',
    crashedAt: nowStamp(),
  }
}

function safeModeCrash(missing: string[]): CrashState {
  const drivers = missing.slice(0, 3).map((path) => baseName(path).toUpperCase()).join(', ')
  return {
    title: 'Windows protection error',
    message: 'Windows cannot start in Safe Mode because multiple protected system files are missing.',
    detail: `Safe Mode requires the core VxD, shell, and display stack. Missing files: ${drivers || 'unknown system files'}. Use Command Prompt Only or Recovery to run SCANREG /RESTORE or SFC /SCANNOW.`,
    stopCode: '0E : 0028 : C0005338',
    crashedAt: nowStamp(),
  }
}

function safetyTrainingCrash(): CrashState {
  return {
    title: 'Windows protection error',
    message: 'Windows has become unstable because an untrusted program exhausted system resources.',
    detail:
      'While initializing device USER32: testdontouch.exe opened repeated modal dialogs inside the Portfolio OS sandbox. No real files, network requests, downloads, or host system commands were executed.',
    stopCode: '0E : 0028 : C0DEF00D',
    crashedAt: nowStamp(),
  }
}

const defaultAppearanceEffects: AppearanceEffects = {
  mouseTrails: false,
  menuShadows: true,
  windowAnimations: true,
}

function createDefaultState(): OsState {
  const persisted = loadPersistedState()
  const themeId = persisted?.themeId ?? defaultThemeId
  const fs = persisted?.fs ? ensurePortfolioSeedFiles(persisted.fs) : createInitialFsState()
  return {
    phase: 'boot',
    bootMode: 'normal',
    bootProfile: 'cold',
    bootTarget: 'normal',
    bios: { ...defaultBiosSettings, ...persisted?.bios },
    fs,
    windows: [],
    activeWindowId: undefined,
    zCounter: 20,
    network: persisted?.network ?? defaultNetworkState,
    themeId,
    wallpaperId: persisted?.wallpaperId ?? getTheme(themeId).wallpaperId ?? defaultWallpaperId,
    wallpaperMode: persisted?.wallpaperMode ?? 'stretch',
    appearanceEffects: persisted?.appearanceEffects ?? defaultAppearanceEffects,
    cursorScheme: persisted?.cursorScheme ?? 'win98',
    audio: { enabled: true, muted: false, volume: persisted?.audio.volume ?? 0.7 },
    crash: null,
    pendingSafetyTraining: false,
    // A 'running' session flag left by the previous tab means it was never shut
    // down properly, so the next normal boot runs the startup ScanDisk screen.
    pendingStartupScan: wasSessionDirty(),
    pendingSystemRestore: false,
    desktopIcons:
      persisted?.desktopIcons && Object.keys(persisted.desktopIcons).length
        ? persisted.desktopIcons
        : defaultDesktopIconPositions(),
    clipboard: null,
    messageBoxes: [],
    notifications: [],
    startMenuOpen: false,
  }
}

// ---------------------------------------------------------------------------
// Reducer
// ---------------------------------------------------------------------------

// Taglish note: reducer lang ang dapat magpalit ng core OS phase/window state.
// Kapag may bagong feature, prefer action + helper kaysa random setState sa apps.
type Action =
  | { type: 'OPEN_WINDOW'; window: Omit<WindowState, 'zIndex'> }
  | { type: 'FOCUS_WINDOW'; id: string }
  | { type: 'CLOSE_WINDOW'; id: string }
  | { type: 'MINIMIZE_WINDOW'; id: string }
  | { type: 'TOGGLE_MAXIMIZE'; id: string }
  | { type: 'MOVE_WINDOW'; id: string; rect: WindowRect }
  | { type: 'SET_WINDOW_TITLE'; id: string; title: string }
  | { type: 'UPDATE_WINDOW_PAYLOAD'; id: string; payload?: WindowPayload; title: string }
  | { type: 'SET_START_MENU'; open: boolean }
  | { type: 'MOVE_DESKTOP_ICON'; id: string; pos: Point }
  | { type: 'SET_DESKTOP_ICONS'; icons: Record<string, Point> }
  | { type: 'PUSH_MESSAGE_BOX'; box: MessageBoxRequest }
  | { type: 'REMOVE_MESSAGE_BOX'; id: string }
  | { type: 'PUSH_NOTIFICATION'; notification: OsNotification }
  | { type: 'DISMISS_NOTIFICATION'; id: string }
  | { type: 'SET_FS'; fs: FsState }
  | { type: 'SET_CLIPBOARD'; clipboard: ClipboardState }
  | { type: 'SET_NETWORK'; network: NetworkState }
  | { type: 'SET_THEME'; themeId: string; wallpaperId?: string }
  | { type: 'SET_WALLPAPER'; wallpaperId: string }
  | { type: 'SET_WALLPAPER_MODE'; mode: WallpaperMode }
  | { type: 'SET_APPEARANCE_EFFECTS'; effects: AppearanceEffects }
  | { type: 'SET_CURSOR_SCHEME'; scheme: CursorSchemeId }
  | { type: 'SET_AUDIO'; audio: AudioState }
  | { type: 'ENTER_BIOS_SETUP' }
  | { type: 'ENTER_RECOVERY_MODE' }
  | { type: 'SET_BIOS'; bios: BiosSettings }
  | { type: 'CRASH'; crash: CrashState }
  | { type: 'START_SAFETY_TRAINING_CRASH'; crash: CrashState }
  | { type: 'COMPLETE_SAFETY_TRAINING' }
  | { type: 'COMPLETE_STARTUP_SCAN' }
  | { type: 'STAGE_SYSTEM_RESTORE' }
  | {
      type: 'RESTART'
      target: 'normal' | 'safe' | 'dos' | 'recovery' | 'bootMenu'
      bootProfile: BootProfile
    }
  | { type: 'SHUTDOWN' }
  | { type: 'FINISH_BOOT' }
  | { type: 'RESET'; state: OsState }

// Exported for unit testing (e.g. OPEN_WINDOW idempotency). Colocated with the
// provider it drives; the disable keeps fast-refresh lint happy for that export.
// eslint-disable-next-line react-refresh/only-export-components
export function reducer(state: OsState, action: Action): OsState {
  switch (action.type) {
    case 'OPEN_WINDOW': {
      const zIndex = state.zCounter + 1
      // Idempotent guard: if a window with this instanceId already exists, focus
      // it instead of appending a duplicate. openApp dedupes against stateRef, but
      // two synchronous opens (e.g. a key press firing two handlers in one tick)
      // both read the same stale state — without this they'd create two windows
      // sharing one React key.
      const existing = state.windows.find((win) => win.instanceId === action.window.instanceId)
      if (existing) {
        return {
          ...state,
          zCounter: zIndex,
          windows: state.windows.map((win) =>
            win.instanceId === action.window.instanceId ? { ...win, minimized: false, zIndex } : win,
          ),
          activeWindowId: action.window.instanceId,
          startMenuOpen: false,
        }
      }
      return {
        ...state,
        zCounter: zIndex,
        windows: [...state.windows, { ...action.window, zIndex }],
        activeWindowId: action.window.instanceId,
        startMenuOpen: false,
      }
    }
    case 'FOCUS_WINDOW': {
      const target = state.windows.find((win) => win.instanceId === action.id)
      if (!target) return state
      const zIndex = state.zCounter + 1
      return {
        ...state,
        zCounter: zIndex,
        activeWindowId: action.id,
        windows: state.windows.map((win) =>
          win.instanceId === action.id ? { ...win, minimized: false, zIndex } : win,
        ),
      }
    }
    case 'CLOSE_WINDOW': {
      const windows = state.windows.filter((win) => win.instanceId !== action.id)
      return {
        ...state,
        windows,
        activeWindowId:
          state.activeWindowId === action.id ? nextActiveWindow(windows) : state.activeWindowId,
      }
    }
    case 'MINIMIZE_WINDOW': {
      const windows = state.windows.map((win) =>
        win.instanceId === action.id ? { ...win, minimized: true } : win,
      )
      return {
        ...state,
        windows,
        activeWindowId:
          state.activeWindowId === action.id ? nextActiveWindow(windows, action.id) : state.activeWindowId,
      }
    }
    case 'TOGGLE_MAXIMIZE': {
      const zIndex = state.zCounter + 1
      return {
        ...state,
        zCounter: zIndex,
        activeWindowId: action.id,
        windows: state.windows.map((win) => {
          if (win.instanceId !== action.id) return win
          if (win.maximized && win.previousRect) {
            return { ...win, ...win.previousRect, maximized: false, minimized: false, zIndex, previousRect: undefined }
          }
          return {
            ...win,
            maximized: true,
            minimized: false,
            zIndex,
            previousRect: { x: win.x, y: win.y, width: win.width, height: win.height },
          }
        }),
      }
    }
    case 'MOVE_WINDOW':
      return {
        ...state,
        windows: state.windows.map((win) =>
          win.instanceId === action.id ? { ...win, ...action.rect } : win,
        ),
      }
    case 'SET_WINDOW_TITLE':
      return {
        ...state,
        windows: state.windows.map((win) =>
          win.instanceId === action.id ? { ...win, title: action.title } : win,
        ),
      }
    case 'UPDATE_WINDOW_PAYLOAD':
      return {
        ...state,
        windows: state.windows.map((win) =>
          win.instanceId === action.id ? { ...win, payload: action.payload, title: action.title } : win,
        ),
      }
    case 'SET_START_MENU':
      return state.startMenuOpen === action.open ? state : { ...state, startMenuOpen: action.open }
    case 'MOVE_DESKTOP_ICON':
      return {
        ...state,
        desktopIcons: { ...state.desktopIcons, [action.id]: clampIconPosition(action.pos) },
      }
    case 'SET_DESKTOP_ICONS':
      return { ...state, desktopIcons: action.icons }
    case 'PUSH_MESSAGE_BOX':
      return { ...state, messageBoxes: [...state.messageBoxes, action.box] }
    case 'REMOVE_MESSAGE_BOX':
      return { ...state, messageBoxes: state.messageBoxes.filter((box) => box.id !== action.id) }
    case 'PUSH_NOTIFICATION':
      return { ...state, notifications: [...state.notifications, action.notification] }
    case 'DISMISS_NOTIFICATION':
      return { ...state, notifications: state.notifications.filter((note) => note.id !== action.id) }
    case 'SET_FS':
      return { ...state, fs: action.fs }
    case 'SET_CLIPBOARD':
      return { ...state, clipboard: action.clipboard }
    case 'SET_NETWORK':
      return { ...state, network: action.network }
    case 'SET_THEME':
      return {
        ...state,
        themeId: action.themeId,
        wallpaperId: action.wallpaperId ?? state.wallpaperId,
      }
    case 'SET_WALLPAPER':
      return { ...state, wallpaperId: action.wallpaperId }
    case 'SET_WALLPAPER_MODE':
      return { ...state, wallpaperMode: action.mode }
    case 'SET_APPEARANCE_EFFECTS':
      return { ...state, appearanceEffects: action.effects }
    case 'SET_CURSOR_SCHEME':
      return { ...state, cursorScheme: action.scheme }
    case 'SET_AUDIO':
      return { ...state, audio: action.audio }
    case 'ENTER_BIOS_SETUP':
      return {
        ...state,
        phase: 'biosSetup',
        windows: [],
        activeWindowId: undefined,
        messageBoxes: [],
        startMenuOpen: false,
      }
    case 'ENTER_RECOVERY_MODE':
      return {
        ...state,
        phase: 'recovery',
        bootTarget: 'recovery',
        bootMode: 'normal',
        windows: [],
        activeWindowId: undefined,
        messageBoxes: [],
        startMenuOpen: false,
      }
    case 'SET_BIOS':
      return { ...state, bios: action.bios }
    case 'CRASH':
      return {
        ...state,
        phase: 'crashed',
        crash: action.crash,
        windows: [],
        activeWindowId: undefined,
        messageBoxes: [],
        startMenuOpen: false,
      }
    case 'START_SAFETY_TRAINING_CRASH':
      return {
        ...state,
        phase: 'crashed',
        crash: action.crash,
        pendingSafetyTraining: true,
        windows: [],
        activeWindowId: undefined,
        messageBoxes: [],
        startMenuOpen: false,
      }
    case 'COMPLETE_SAFETY_TRAINING':
      return {
        ...state,
        phase: 'desktop',
        bootMode: 'normal',
        pendingSafetyTraining: false,
        windows: [],
        activeWindowId: undefined,
        messageBoxes: [],
        startMenuOpen: false,
      }
    case 'COMPLETE_STARTUP_SCAN':
      return {
        ...state,
        phase: 'desktop',
        bootMode: 'normal',
        pendingStartupScan: false,
        windows: [],
        activeWindowId: undefined,
        messageBoxes: [],
        startMenuOpen: false,
      }
    case 'STAGE_SYSTEM_RESTORE':
      // SFC/SCANREG scheduled a repair; FINISH_BOOT applies it on the next restart.
      return state.pendingSystemRestore ? state : { ...state, pendingSystemRestore: true }
    case 'RESTART': {
      const base: OsState = {
        ...state,
        windows: [],
        activeWindowId: undefined,
        messageBoxes: [],
        startMenuOpen: false,
        crash: null,
        clipboard: null,
      }
      if (action.target === 'bootMenu') {
        return { ...base, phase: 'bootMenu', bootTarget: 'normal', bootProfile: 'warm' }
      }
      return { ...base, phase: 'boot', bootTarget: action.target, bootProfile: action.bootProfile }
    }
    case 'SHUTDOWN':
      return {
        ...state,
        phase: 'shutdown',
        windows: [],
        activeWindowId: undefined,
        messageBoxes: [],
        startMenuOpen: false,
      }
    case 'FINISH_BOOT': {
      if (state.phase !== 'boot') return state
      // A staged SFC/SCANREG repair is applied here, on restart — it restores the
      // protected files from the cache, then re-enters this branch with a healthy
      // disk and the flag cleared. This is why a repair "takes effect" on reboot.
      if (state.pendingSystemRestore) {
        return reducer(
          { ...state, fs: restoreSystemFiles(state.fs).fs, pendingSystemRestore: false },
          action,
        )
      }
      const currentBios = state.bios ?? defaultBiosSettings
      const bootedBios = currentBios.resetConfigurationData
        ? { ...currentBios, resetConfigurationData: false }
        : currentBios
      switch (state.bootTarget) {
        case 'normal':
          if (!isSystemHealthy(state.fs)) {
            return {
              ...state,
              phase: 'loadFailed',
              bootTarget: 'normal',
              windows: [],
              activeWindowId: undefined,
              messageBoxes: [],
              startMenuOpen: false,
            }
          }
          if (state.pendingSafetyTraining) {
            return {
              ...state,
              bios: bootedBios,
              phase: 'safetyTraining',
              bootMode: 'normal',
              pendingSafetyTraining: false,
              windows: [],
              activeWindowId: undefined,
              messageBoxes: [],
              startMenuOpen: false,
            }
          }
          if (state.pendingStartupScan) {
            return {
              ...state,
              bios: bootedBios,
              phase: 'startupScan',
              bootMode: 'normal',
              windows: [],
              activeWindowId: undefined,
              messageBoxes: [],
              startMenuOpen: false,
            }
          }
          return { ...state, bios: bootedBios, phase: 'desktop', bootMode: 'normal' }
        case 'safe':
          if (shouldSafeModeBlueScreen(state.fs)) {
            return {
              ...state,
              phase: 'crashed',
              bootMode: 'safe',
              crash: safeModeCrash(missingRequiredSystemFiles(state.fs)),
            }
          }
          return {
            ...state,
            bios: bootedBios,
            phase: 'desktop',
            bootMode: 'safe',
            network: releasedNetworkState(),
          }
        case 'dos':
          return { ...state, bios: bootedBios, phase: 'dosOnly' }
        case 'recovery':
          return { ...state, bios: bootedBios, phase: 'recovery' }
      }
      return state
    }
    case 'RESET':
      return action.state
  }
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

let messageBoxCounter = 0
let notificationCounter = 0

// Taglish note: OsProvider ang bridge ng UI at virtual OS. Apps call these
// methods, pero filesystem/network/audio rules stay centralized dito.
export function OsProvider({ children }: { children: ReactNode }): ReactNode {
  const [state, dispatch] = useReducer(reducer, undefined, createDefaultState)
  const stateRef = useRef(state)
  const startupSoundPlayedRef = useRef(false)
  const desktopShellReadyRef = useRef(false)
  useEffect(() => {
    stateRef.current = state
  })

  // Claim the session as "running" on mount. A proper Shut Down / Restart flips
  // this to 'clean'; if the tab is closed or refreshed instead, the flag stays
  // 'running' so the next load's createDefaultState() sees the improper exit.
  useEffect(() => {
    markSessionRunning()
  }, [])

  // ----- sounds -----
  const playSound = useCallback((id: SoundId) => {
    const current = stateRef.current
    if (!current.audio.enabled || current.audio.muted || current.audio.volume <= 0) return
    if (!driverHealthy(current.fs, 'audio')) return
    if (current.bootMode === 'safe' && current.phase === 'desktop') return
    synthPlaySound(id, current.audio.volume)
  }, [])

  const playStartupSound = useCallback(() => {
    const current = stateRef.current
    if (startupSoundPlayedRef.current || current.phase !== 'desktop') return
    if (current.bootMode === 'safe') {
      startupSoundPlayedRef.current = true
      return
    }
    if (!driverHealthy(current.fs, 'audio')) return
    if (!current.audio.enabled || current.audio.muted || current.audio.volume <= 0) {
      // Audio isn't available yet (e.g. before the first user gesture enables it).
      // Leave the ref unset so the chime still plays once audio comes on.
      return
    }
    if (!isAudioUnlocked()) return
    startupSoundPlayedRef.current = true
    synthPlaySound('startup', current.audio.volume)
  }, [])

  // Browsers block audio until a user gesture, and the AudioContext can later be
  // auto-suspended (tab backgrounded) or its module state reset by dev HMR. So
  // keep a PERSISTENT listener that re-ensures audio is ready on every gesture —
  // every call here is idempotent (unlockAudio resumes a suspended context;
  // playStartupSound is guarded by a ref). This is what makes sound self-heal
  // instead of silently dying until a full reload.
  useEffect(() => {
    preloadSoundFiles()
    function ensureAudioReady() {
      unlockAudio()
      const current = stateRef.current
      if (!driverHealthy(current.fs, 'audio')) return
      if (!current.audio.enabled) {
        const audio: AudioState = { ...current.audio, enabled: true, muted: false }
        stateRef.current = { ...current, audio }
        dispatch({ type: 'SET_AUDIO', audio })
      }
      // Play the chime on the first gesture once the desktop is reached, instead of
      // waiting for the cosmetic shell-intro loader to finish (~5s later).
      playStartupSound()
    }
    window.addEventListener('pointerdown', ensureAudioReady)
    window.addEventListener('keydown', ensureAudioReady)
    return () => {
      window.removeEventListener('pointerdown', ensureAudioReady)
      window.removeEventListener('keydown', ensureAudioReady)
    }
  }, [playStartupSound])

  // ----- message boxes -----
  const showMessageBox = useCallback(
    (req: Omit<MessageBoxRequest, 'id'>) => {
      messageBoxCounter += 1
      const box: MessageBoxRequest = { ...req, id: `mb-${messageBoxCounter}` }
      dispatch({ type: 'PUSH_MESSAGE_BOX', box })
      if (req.icon === 'error') {
        playSound('error')
      } else if (req.icon === 'warning') {
        playSound('warn')
      }
    },
    [playSound],
  )

  const dismissMessageBox = useCallback((id: string, button: MessageBoxButton) => {
    const box = stateRef.current.messageBoxes.find((item) => item.id === id)
    dispatch({ type: 'REMOVE_MESSAGE_BOX', id })
    box?.onResult?.(button)
  }, [])

  // ----- transient taskbar balloons -----
  const dismissNotification = useCallback((id: string) => {
    dispatch({ type: 'DISMISS_NOTIFICATION', id })
  }, [])

  const notify = useCallback((title: string, body: string) => {
    notificationCounter += 1
    dispatch({ type: 'PUSH_NOTIFICATION', notification: { id: `note-${notificationCounter}`, title, body } })
  }, [])

  // ----- windows -----
  const focusWindow = useCallback(
    (id: string) => {
      const target = stateRef.current.windows.find((win) => win.instanceId === id)
      if (!target) return
      if (target.minimized) {
        playSound('restore')
      }
      dispatch({ type: 'FOCUS_WINDOW', id })
    },
    [playSound],
  )

  const openApp = useCallback(
    (appId: AppId, payload?: WindowPayload) => {
      const current = stateRef.current
      const def = appDefinitions[appId]
      const missingDependency = missingAppDependency(appId, current.fs)
      if (missingDependency) {
        showMessageBox(systemFileFailureBox(current.fs, def.title, missingDependency))
        return
      }
      // Safe Mode uses generic video/input drivers, so only block on a driver that
      // is still unavailable under the current boot mode (lets Paint, Imaging, etc.
      // open in Safe Mode for repair even if their driver files were deleted).
      const blockedDriver = (def.driverDependencies ?? []).find(
        (type) => !effectiveDriverHealthy(current.fs, type, current.bootMode),
      )
      if (blockedDriver) {
        showMessageBox(driverFailureBox(blockedDriver, def.title, missingDriverFiles(current.fs, blockedDriver)))
        return
      }
      if (current.bootMode === 'safe' && current.phase === 'desktop' && def.safeModeAvailable === false) {
        showMessageBox({
          title: def.title,
          message: `Windows cannot run ${def.title} in Safe Mode.`,
          detail: 'Restart your computer normally to use this program.',
          icon: 'error',
          buttons: ['ok'],
        })
        return
      }
      const instanceId = instanceIdFor(appId, payload)
      const existing = current.windows.find((win) => win.instanceId === instanceId)
      if (existing) {
        if (payload && JSON.stringify(payload) !== JSON.stringify(existing.payload)) {
          dispatch({
            type: 'UPDATE_WINDOW_PAYLOAD',
            id: instanceId,
            payload,
            title: titleFor(appId, current.fs, payload),
          })
        }
        focusWindow(instanceId)
        return
      }
      // RAM guardrail: if opening this window would exceed simulated memory, fault
      // out instead of opening it. The CRASH reducer clears every window, so all
      // apps auto-close and the user is dropped back to a clean desktop.
      const memoryInUse =
        SYSTEM_RESERVED_MB + current.windows.reduce((sum, win) => sum + appMemoryCost(win.appId), 0)
      const projectedMemory = memoryInUse + appMemoryCost(appId)
      if (projectedMemory > SIMULATED_RAM_MB) {
        playSound('error')
        dispatch({ type: 'CRASH', crash: outOfMemoryCrash(current.windows.length + 1, projectedMemory) })
        return
      }
      const rect = clampRect(def.defaultRect, (current.windows.length % 8) * 22)
      dispatch({
        type: 'OPEN_WINDOW',
        window: {
          instanceId,
          appId,
          title: titleFor(appId, current.fs, payload),
          icon: iconFor(appId, payload),
          minimized: false,
          maximized: false,
          payload,
          ...rect,
        },
      })
      playSound('launch')
    },
    [focusWindow, playSound, showMessageBox],
  )

  const openNode = useCallback(
    (path: string) => {
      const node = getNode(stateRef.current.fs, path)
      if (!node) {
        showMessageBox({
          title: 'Windows Explorer',
          message: `Cannot find the file '${path}' (or one of its components).`,
          detail: 'Make sure the path and filename are correct.',
          icon: 'error',
          buttons: ['ok'],
        })
        return
      }
      const target = openTargetFor(node)
      if (!target) {
        showMessageBox({
          title: node.name,
          message: `'${node.name}' is not a valid Win32 application.`,
          icon: 'error',
          buttons: ['ok'],
        })
        return
      }
      openApp(target.appId, target.payload)
    },
    [openApp, showMessageBox],
  )

  const closeWindow = useCallback(
    (id: string) => {
      dispatch({ type: 'CLOSE_WINDOW', id })
      playSound('click')
    },
    [playSound],
  )

  const minimizeWindow = useCallback(
    (id: string) => {
      dispatch({ type: 'MINIMIZE_WINDOW', id })
      playSound('minimize')
    },
    [playSound],
  )

  const toggleMaximize = useCallback(
    (id: string) => {
      dispatch({ type: 'TOGGLE_MAXIMIZE', id })
      playSound('restore')
    },
    [playSound],
  )

  const moveWindow = useCallback((id: string, rect: WindowRect) => {
    dispatch({ type: 'MOVE_WINDOW', id, rect })
  }, [])

  const setWindowTitle = useCallback((id: string, title: string) => {
    dispatch({ type: 'SET_WINDOW_TITLE', id, title })
  }, [])

  // ----- desktop / shell -----
  const setStartMenuOpen = useCallback(
    (open: boolean) => {
      if (open && !stateRef.current.startMenuOpen) {
        playSound('menuOpen')
      }
      dispatch({ type: 'SET_START_MENU', open })
    },
    [playSound],
  )

  const moveDesktopIcon = useCallback((id: string, pos: Point) => {
    dispatch({ type: 'MOVE_DESKTOP_ICON', id, pos })
  }, [])

  const arrangeDesktopIcons = useCallback(() => {
    dispatch({ type: 'SET_DESKTOP_ICONS', icons: defaultDesktopIconPositions() })
  }, [])

  // ----- system -----
  const crashSystem = useCallback(
    (crash: CrashState) => {
      playSound('error')
      dispatch({ type: 'CRASH', crash })
    },
    [playSound],
  )

  const completeDesktopShellIntro = useCallback(() => {
    desktopShellReadyRef.current = true
    playStartupSound()
  }, [playStartupSound])

  const triggerSafetyTrainingCrash = useCallback(() => {
    playSound('error')
    dispatch({ type: 'START_SAFETY_TRAINING_CRASH', crash: safetyTrainingCrash() })
  }, [playSound])

  const completeSafetyTraining = useCallback(() => {
    playSound('ding')
    dispatch({ type: 'COMPLETE_SAFETY_TRAINING' })
  }, [playSound])

  const completeStartupScan = useCallback(() => {
    playSound('ding')
    dispatch({ type: 'COMPLETE_STARTUP_SCAN' })
  }, [playSound])

  const stageSystemRestore = useCallback(() => {
    dispatch({ type: 'STAGE_SYSTEM_RESTORE' })
  }, [])

  const enterBiosSetup = useCallback(() => {
    dispatch({ type: 'ENTER_BIOS_SETUP' })
  }, [])

  const enterRecoveryMode = useCallback(() => {
    dispatch({ type: 'ENTER_RECOVERY_MODE' })
  }, [])

  const setBiosSettings = useCallback((bios: BiosSettings) => {
    stateRef.current = { ...stateRef.current, bios }
    dispatch({ type: 'SET_BIOS', bios })
  }, [])

  const restart = useCallback((
    target: 'normal' | 'safe' | 'dos' | 'recovery' | 'bootMenu' = 'normal',
    opts?: { bootProfile?: BootProfile },
  ) => {
    startupSoundPlayedRef.current = false
    desktopShellReadyRef.current = false
    // An intentional reboot: the machine stays "on", so keep the session flagged
    // running (a tab-close during the new session is still an improper exit).
    markSessionRunning()
    dispatch({ type: 'RESTART', target, bootProfile: opts?.bootProfile ?? 'cold' })
  }, [])

  const shutDown = useCallback(() => {
    playSound('shutdown')
    // A proper power-off: clear the flag so the next boot does not run ScanDisk.
    markSessionClean()
    dispatch({ type: 'SHUTDOWN' })
  }, [playSound])

  const finishBoot = useCallback(() => {
    dispatch({ type: 'FINISH_BOOT' })
  }, [])

  const resetEverything = useCallback(() => {
    clearPersistedState()
    // The machine is still on after a reset; re-claim the running session and
    // never trigger a startup scan from this fresh state.
    markSessionRunning()
    startupSoundPlayedRef.current = false
    desktopShellReadyRef.current = false
    const fresh: OsState = {
      ...createDefaultState(),
      fs: createInitialFsState(),
      network: defaultNetworkState,
      themeId: defaultThemeId,
      wallpaperId: defaultWallpaperId,
      wallpaperMode: 'stretch',
      appearanceEffects: defaultAppearanceEffects,
      cursorScheme: 'win98',
      pendingStartupScan: false,
      desktopIcons: defaultDesktopIconPositions(),
    }
    stateRef.current = fresh
    dispatch({ type: 'RESET', state: fresh })
  }, [])

  // ----- filesystem ops (synchronous; optimistic stateRef updates) -----
  const commitFs = useCallback(
    (fs: FsState) => {
      const before = stateRef.current.fs
      stateRef.current = { ...stateRef.current, fs }
      dispatch({ type: 'SET_FS', fs })
      // Win98-style notice of what a deletion affected (file/folder counts). Covers
      // both Explorer deletes and terminal `del`, since both flow through here.
      const deletion = summarizeDeletion(before, fs)
      if (deletion) {
        notify(deletion.title, deletion.body)
      }
      // If this change just broke a driver or feature (deleting a file via Explorer
      // OR the terminal both land here), surface a taskbar balloon so the breakage
      // is visible right away — not only when a dependent app is later launched.
      for (const type of Object.keys(driverDeviceLabels) as DriverType[]) {
        if (driverHealthy(before, type) && !driverHealthy(fs, type)) {
          notify(`${driverDeviceLabels[type]} disabled`, 'A device driver file was removed. Run SFC /SCANNOW or open Device Manager.')
        }
      }
      for (const feature of Object.keys(FEATURE_FILES)) {
        if (featureAvailable(before, feature) && !featureAvailable(fs, feature)) {
          notify(`${feature} unavailable`, 'A required system file was removed. Run SFC /SCANNOW to restore it.')
        }
      }
    },
    [notify],
  )

  const fsOps = useMemo(
    () => ({
      createFolder(parent: string, name: string): string | null {
        const result = fsCreateFolder(stateRef.current.fs, parent, name)
        if (result.error) return result.error
        commitFs(result.fs)
        return null
      },
      createFile(parent: string, name: string, opts?: { content?: string; dataUrl?: string }): string | null {
        const result = fsCreateFile(stateRef.current.fs, parent, name, opts)
        if (result.error) return result.error
        commitFs(result.fs)
        return null
      },
      writeFile(path: string, data: { content?: string; dataUrl?: string }): string | null {
        const result = fsWriteFile(stateRef.current.fs, path, data)
        if (result.error) return result.error
        commitFs(result.fs)
        return null
      },
      renameNode(path: string, newName: string): string | null {
        const result = fsRenameNode(stateRef.current.fs, path, newName)
        if (result.error) return result.error
        commitFs(result.fs)
        return null
      },
      moveNode(path: string, targetFolder: string): string | null {
        const result = fsMoveNode(stateRef.current.fs, path, targetFolder)
        if (result.error) return result.error
        commitFs(result.fs)
        return null
      },
      copyNode(path: string, targetFolder: string): string | null {
        const result = fsCopyNode(stateRef.current.fs, path, targetFolder)
        if (result.error) return result.error
        commitFs(result.fs)
        return null
      },
      createDesktopShortcut(targetPath: string): string | null {
        const result = fsCreateDesktopShortcut(stateRef.current.fs, targetPath)
        if (result.error) return result.error
        commitFs(result.fs)
        playSound('ding')
        return null
      },
      deleteNode(path: string, opts?: { skipConfirm?: boolean }): string | null {
        void opts // confirmation lives in the UI layer; accepted for API compatibility
        const result = fsDeleteNode(stateRef.current.fs, path)
        if (result.error) return result.error
        commitFs(result.fs)
        if (result.criticalDeleted) {
          // Let Explorer render the file disappearing before the lights go out.
          const crash = protectionCrash(normalizePath(path))
          if (typeof window !== 'undefined') {
            window.setTimeout(() => crashSystem(crash), 900)
          } else {
            crashSystem(crash)
          }
        } else {
          playSound('recycle')
        }
        return null
      },
      restoreEntry(entryId: string): string | null {
        const result = fsRestoreEntry(stateRef.current.fs, entryId)
        if (result.error) return result.error
        commitFs(result.fs)
        return null
      },
      emptyRecycleBin(): void {
        commitFs(fsEmptyRecycleBin(stateRef.current.fs))
        playSound('recycle')
      },
      replaceFs(fs: FsState): void {
        commitFs(fs)
      },
    }),
    [commitFs, crashSystem, playSound],
  )

  const setClipboard = useCallback((clipboard: ClipboardState) => {
    dispatch({ type: 'SET_CLIPBOARD', clipboard })
  }, [])

  // ----- network ops -----
  const commitNetwork = useCallback((network: NetworkState) => {
    stateRef.current = { ...stateRef.current, network }
    dispatch({ type: 'SET_NETWORK', network })
  }, [])

  const networkOps = useMemo(
    () => ({
      connect(): void {
        if (stateRef.current.network.connected) return
        if (!driverHealthy(stateRef.current.fs, 'network')) {
          commitNetwork(releasedNetworkState())
          showMessageBox(driverFailureBox('network', 'Network Neighborhood', missingAppDriverDependency('network', stateRef.current.fs)?.missing))
          return
        }
        commitNetwork(randomDhcpLease())
        playSound('networkUp')
      },
      disconnect(): void {
        if (!stateRef.current.network.connected) return
        commitNetwork(releasedNetworkState())
        playSound('networkDown')
      },
      renewDhcp(): void {
        if (!driverHealthy(stateRef.current.fs, 'network')) {
          commitNetwork(releasedNetworkState())
          showMessageBox(driverFailureBox('network', 'Network Neighborhood', missingAppDriverDependency('network', stateRef.current.fs)?.missing))
          return
        }
        const wasConnected = stateRef.current.network.connected
        commitNetwork(randomDhcpLease())
        if (!wasConnected) {
          playSound('networkUp')
        }
      },
      applyConfig(partial: Partial<NetworkState>): void {
        if (partial.connected !== false && !driverHealthy(stateRef.current.fs, 'network')) {
          commitNetwork(releasedNetworkState())
          showMessageBox(driverFailureBox('network', 'Network Neighborhood', missingAppDriverDependency('network', stateRef.current.fs)?.missing))
          return
        }
        const previous = stateRef.current.network
        const next = { ...previous, ...partial }
        commitNetwork(next)
        if (previous.connected !== next.connected) {
          playSound(next.connected ? 'networkUp' : 'networkDown')
        }
      },
      recordTraffic(sent: number, received: number): void {
        if (!driverHealthy(stateRef.current.fs, 'network')) return
        const network = stateRef.current.network
        commitNetwork({
          ...network,
          packetsSent: network.packetsSent + sent,
          packetsReceived: network.packetsReceived + received,
        })
      },
    }),
    [commitNetwork, playSound, showMessageBox],
  )

  // ----- appearance -----
  const setTheme = useCallback((themeId: string) => {
    const theme = getTheme(themeId)
    dispatch({ type: 'SET_THEME', themeId: theme.id, wallpaperId: theme.wallpaperId })
  }, [])

  const setWallpaper = useCallback((wallpaperId: string) => {
    dispatch({ type: 'SET_WALLPAPER', wallpaperId })
  }, [])

  const setWallpaperMode = useCallback((mode: WallpaperMode) => {
    dispatch({ type: 'SET_WALLPAPER_MODE', mode })
  }, [])

  const setAppearanceEffects = useCallback((effects: AppearanceEffects) => {
    dispatch({ type: 'SET_APPEARANCE_EFFECTS', effects })
  }, [])

  const setCursorScheme = useCallback((scheme: CursorSchemeId) => {
    dispatch({ type: 'SET_CURSOR_SCHEME', scheme })
  }, [])

  // ----- audio -----
  const enableAudio = useCallback(() => {
    const missingDriver = requiredDriverMissing(stateRef.current.fs, ['audio'])
    if (missingDriver) {
      showMessageBox(driverFailureBox('audio', 'Sounds', missingDriver.missing))
      return
    }
    unlockAudio()
    const audio: AudioState = { ...stateRef.current.audio, enabled: true, muted: false }
    stateRef.current = { ...stateRef.current, audio }
    dispatch({ type: 'SET_AUDIO', audio })
    if (!audio.muted && audio.volume > 0) {
      synthPlaySound('ding', audio.volume)
    }
  }, [showMessageBox])

  const setAudioMuted = useCallback((muted: boolean) => {
    if (!muted) {
      const missingDriver = requiredDriverMissing(stateRef.current.fs, ['audio'])
      if (missingDriver) {
        showMessageBox(driverFailureBox('audio', 'Sounds', missingDriver.missing))
        return
      }
    }
    if (!muted) {
      unlockAudio()
    }
    const audio: AudioState = { ...stateRef.current.audio, enabled: true, muted }
    stateRef.current = { ...stateRef.current, audio }
    dispatch({ type: 'SET_AUDIO', audio })
    if (!muted && audio.volume > 0) {
      synthPlaySound('ding', audio.volume)
    }
  }, [showMessageBox])

  const setAudioVolume = useCallback((volume: number) => {
    const clamped = Math.max(0, Math.min(1, volume))
    const audio: AudioState = { ...stateRef.current.audio, volume: clamped }
    stateRef.current = { ...stateRef.current, audio }
    dispatch({ type: 'SET_AUDIO', audio })
  }, [])

  // ----- DOM effects: theme / wallpaper / cursor -----
  const inSafeDesktop = state.phase === 'desktop' && state.bootMode === 'safe'
  const { themeId, wallpaperId, wallpaperMode, appearanceEffects, cursorScheme } = state
  useEffect(() => {
    const theme = inSafeDesktop ? getTheme('safeMode16') : getTheme(themeId)
    const wallpaper = inSafeDesktop ? getWallpaper('none') : getWallpaper(wallpaperId)
    const effects = inSafeDesktop
      ? { mouseTrails: false, menuShadows: false, windowAnimations: false }
      : appearanceEffects
    applyTheme(theme)
    applyWallpaper(wallpaper, inSafeDesktop ? 'stretch' : wallpaperMode)
    applyAppearanceEffects(effects)
    applyCursorScheme(cursorScheme)
  }, [themeId, wallpaperId, wallpaperMode, appearanceEffects, cursorScheme, inSafeDesktop])

  // ----- desktop shell readiness -----
  const prevPhaseRef = useRef(state.phase)
  useEffect(() => {
    const previous = prevPhaseRef.current
    prevPhaseRef.current = state.phase
    if (previous !== state.phase) {
      desktopShellReadyRef.current = false
    }
    // Reaching the desktop plays the startup chime immediately when audio is already
    // unlocked (e.g. the user pressed a key during boot); otherwise the first gesture
    // triggers it. No longer tied to the shell-intro timer.
    if (previous !== state.phase && state.phase === 'desktop') {
      playStartupSound()
    }
  }, [state.phase, playStartupSound])

  // ----- debounced persistence -----
  // Taglish note: browser storage is for simulated OS state lang. Huwag ilagay
  // dito ang secrets or real user files; virtual files/settings lang dapat.
  const persistTimerRef = useRef<number | null>(null)
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (persistTimerRef.current !== null) {
      window.clearTimeout(persistTimerRef.current)
    }
    persistTimerRef.current = window.setTimeout(() => {
      persistState(stateRef.current)
      persistTimerRef.current = null
    }, 300)
    return () => {
      if (persistTimerRef.current !== null) {
        window.clearTimeout(persistTimerRef.current)
        persistTimerRef.current = null
      }
    }
  }, [
    state.fs,
    state.themeId,
    state.wallpaperId,
    state.wallpaperMode,
    state.appearanceEffects,
    state.cursorScheme,
    state.audio,
    state.network,
    state.desktopIcons,
    state.bios,
  ])

  const value = useMemo<OsContextValue>(
    () => ({
      state,
      openApp,
      openNode,
      closeWindow,
      minimizeWindow,
      focusWindow,
      toggleMaximize,
      moveWindow,
      setWindowTitle,
      setStartMenuOpen,
      moveDesktopIcon,
      arrangeDesktopIcons,
      showMessageBox,
      dismissMessageBox,
      notify,
      dismissNotification,
      fsOps,
      setClipboard,
      networkOps,
      setTheme,
      setWallpaper,
      setWallpaperMode,
      setAppearanceEffects,
      setCursorScheme,
      enableAudio,
      setAudioMuted,
      setAudioVolume,
      playSound,
      crashSystem,
      completeDesktopShellIntro,
      triggerSafetyTrainingCrash,
      completeSafetyTraining,
      completeStartupScan,
      stageSystemRestore,
      enterBiosSetup,
      enterRecoveryMode,
      setBiosSettings,
      restart,
      shutDown,
      finishBoot,
      resetEverything,
    }),
    [
      state,
      openApp,
      openNode,
      closeWindow,
      minimizeWindow,
      focusWindow,
      toggleMaximize,
      moveWindow,
      setWindowTitle,
      setStartMenuOpen,
      moveDesktopIcon,
      arrangeDesktopIcons,
      showMessageBox,
      dismissMessageBox,
      notify,
      dismissNotification,
      fsOps,
      setClipboard,
      networkOps,
      setTheme,
      setWallpaper,
      setWallpaperMode,
      setAppearanceEffects,
      setCursorScheme,
      enableAudio,
      setAudioMuted,
      setAudioVolume,
      playSound,
      crashSystem,
      completeDesktopShellIntro,
      triggerSafetyTrainingCrash,
      completeSafetyTraining,
      completeStartupScan,
      stageSystemRestore,
      enterBiosSetup,
      enterRecoveryMode,
      setBiosSettings,
      restart,
      shutDown,
      finishBoot,
      resetEverything,
    ],
  )

  return <OsContext.Provider value={value}>{children}</OsContext.Provider>
}
