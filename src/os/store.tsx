import { useCallback, useEffect, useMemo, useReducer, useRef } from 'react'
import type { ReactNode } from 'react'
import type {
  AppId,
  AudioState,
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
  WindowState,
} from '../types'
import { appDefinitions, desktopIconDefs } from '../data/apps'
import { defaultBiosSettings } from '../data/bios'
import { createInitialFsState, ensurePortfolioSeedFiles } from '../data/initialFilesystem'
import { portfolioData } from '../data/portfolioData'
import { controlPanelSections } from '../data/system'
import { defaultThemeId, defaultWallpaperId, getTheme, getWallpaper } from '../data/themes'
import {
  baseName,
  copyNode as fsCopyNode,
  createFile as fsCreateFile,
  createFolder as fsCreateFolder,
  deleteNode as fsDeleteNode,
  emptyRecycleBin as fsEmptyRecycleBin,
  getNode,
  moveNode as fsMoveNode,
  normalizePath,
  nowStamp,
  openTargetFor,
  renameNode as fsRenameNode,
  restoreEntry as fsRestoreEntry,
  writeFile as fsWriteFile,
} from './filesystem'
import { defaultNetworkState, randomDhcpLease, releasedNetworkState } from './network'
import { isSystemHealthy, missingRequiredSystemFiles, shouldSafeModeBlueScreen } from './recovery'
import { applyCursorScheme, applyTheme, applyWallpaper } from './themes'
import { isAudioUnlocked, playSound as synthPlaySound, preloadSoundFiles, unlockAudio } from './audio'
import { clearPersistedState, loadPersistedState, persistState } from './persistence'
import { OsContext, type OsContextValue } from './useOs'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const TASKBAR_HEIGHT = 33
const ICON_W = 88
const ICON_H = 84
const ICON_GAP_X = 8
const ICON_GAP_Y = 12

function viewportSize(): { width: number; height: number } {
  if (typeof window === 'undefined') {
    return { width: 1024, height: 768 }
  }
  return { width: window.innerWidth, height: window.innerHeight }
}

function clampRect(rect: WindowRect, offset: number): WindowRect {
  const { width: vw, height: vh } = viewportSize()
  const width = Math.min(rect.width, vw - 20)
  const height = Math.min(rect.height, vh - 56)
  const maxX = Math.max(8, vw - width - 8)
  const maxY = Math.max(8, vh - height - 46)
  return {
    width,
    height,
    x: Math.max(8, Math.min(rect.x + offset, maxX)),
    y: Math.max(8, Math.min(rect.y + offset, maxY)),
  }
}

function clampIconPosition(pos: Point): Point {
  const { width, height } = viewportSize()
  const desktopHeight = Math.max(160, height - TASKBAR_HEIGHT)
  return {
    x: Math.max(4, Math.min(pos.x, width - ICON_W - 4)),
    y: Math.max(4, Math.min(pos.y, desktopHeight - ICON_H - 4)),
  }
}

function defaultDesktopIconPositions(): Record<string, Point> {
  const { width, height } = viewportSize()
  const desktopHeight = Math.max(160, height - TASKBAR_HEIGHT)
  const positions: Record<string, Point> = {}

  if (width <= 720) {
    const columns = Math.min(3, desktopIconDefs.length)
    const gridWidth = columns * ICON_W + (columns - 1) * ICON_GAP_X
    const startX = Math.max(8, Math.floor((width - gridWidth) / 2))
    desktopIconDefs.forEach((def, index) => {
      const column = index % columns
      const row = Math.floor(index / columns)
      positions[def.id] = clampIconPosition({
        x: startX + column * (ICON_W + ICON_GAP_X),
        y: 8 + row * (ICON_H + ICON_GAP_Y),
      })
    })
    return positions
  }

  const rowsPerColumn = Math.max(1, Math.floor((desktopHeight - 24) / (ICON_H + ICON_GAP_Y)))
  desktopIconDefs.forEach((def, index) => {
    const column = Math.floor(index / rowsPerColumn)
    const row = index % rowsPerColumn
    positions[def.id] = clampIconPosition({
      x: 10 + column * (ICON_W + ICON_GAP_X),
      y: 12 + row * (ICON_H + ICON_GAP_Y),
    })
  })
  return positions
}

let instanceCounter = 0

function instanceIdFor(appId: AppId, payload?: WindowPayload): string {
  const singleton = appDefinitions[appId].singleton !== false
  if (appId === 'explorer') {
    return `explorer:${normalizePath(payload?.path ?? 'C:\\').toLowerCase()}`
  }
  if (appId === 'projectDetails' && payload?.projectId) {
    return `projectDetails:${payload.projectId}`
  }
  if (appId === 'notepad' && payload?.filePath) {
    return `notepad:${normalizePath(payload.filePath).toLowerCase()}`
  }
  if (appId === 'wordpad' && payload?.filePath) {
    return `wordpad:${normalizePath(payload.filePath).toLowerCase()}`
  }
  if (appId === 'imageViewer' && payload?.filePath) {
    return `imageViewer:${normalizePath(payload.filePath).toLowerCase()}`
  }
  if (appId === 'videoPlayer' && payload?.filePath) {
    return `videoPlayer:${normalizePath(payload.filePath).toLowerCase()}`
  }
  if (singleton) {
    return appId
  }
  instanceCounter += 1
  return `${appId}#${instanceCounter}`
}

function titleFor(appId: AppId, fs: FsState, payload?: WindowPayload): string {
  const def = appDefinitions[appId]
  switch (appId) {
    case 'explorer': {
      const path = normalizePath(payload?.path ?? 'C:\\')
      if (path === 'C:\\') return 'My Computer'
      const node = getNode(fs, path)
      return `Exploring - ${node?.path ?? path}`
    }
    case 'notepad':
      return payload?.filePath ? `${baseName(payload.filePath)} - Notepad` : 'Untitled - Notepad'
    case 'wordpad':
      return payload?.filePath ? `${baseName(payload.filePath)} - WordPad` : 'Document - WordPad'
    case 'paint':
      return payload?.filePath ? `${baseName(payload.filePath)} - Paint` : 'untitled - Paint'
    case 'imageViewer':
      return payload?.filePath ? `${baseName(payload.filePath)} - Imaging Preview` : def.title
    case 'mediaPlayer':
      return payload?.filePath ? `${baseName(payload.filePath)} - Media Player` : def.title
    case 'videoPlayer':
      return payload?.filePath ? `${baseName(payload.filePath)} - Video Player` : def.title
    case 'projectDetails':
      return portfolioData.projects.find((project) => project.id === payload?.projectId)?.name ?? def.title
    case 'controlPanel': {
      if (!payload?.controlPanelSection) return def.title
      const section = controlPanelSections.find((item) => item.id === payload.controlPanelSection)
      return section ? `${section.title} Properties` : def.title
    }
    default:
      return def.title
  }
}

function iconFor(appId: AppId, payload?: WindowPayload) {
  if (appId === 'explorer') {
    const path = normalizePath(payload?.path ?? 'C:\\')
    return path === 'C:\\' ? appDefinitions.explorer.icon : 'folderOpen'
  }
  return appDefinitions[appId].icon
}

function protectionCrash(path: string): CrashState {
  return {
    title: 'Windows protection error',
    message: 'The system has become unstable because a required system component was removed.',
    detail: `While initializing device ${baseName(path).toUpperCase()}: the file ${path} could not be found. Explorer, networking, display drivers, and shell services cannot continue.`,
    stopCode: '0E : 0028 : C0011E36',
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

function createDefaultState(): OsState {
  const persisted = loadPersistedState()
  const themeId = persisted?.themeId ?? defaultThemeId
  const fs = persisted?.fs ? ensurePortfolioSeedFiles(persisted.fs) : createInitialFsState()
  return {
    phase: 'boot',
    bootMode: 'normal',
    bootProfile: 'cold',
    bootTarget: 'normal',
    bios: persisted?.bios ?? defaultBiosSettings,
    fs,
    windows: [],
    activeWindowId: undefined,
    zCounter: 20,
    network: persisted?.network ?? defaultNetworkState,
    themeId,
    wallpaperId: persisted?.wallpaperId ?? getTheme(themeId).wallpaperId ?? defaultWallpaperId,
    cursorScheme: persisted?.cursorScheme ?? 'win98',
    audio: { enabled: true, muted: false, volume: persisted?.audio.volume ?? 0.7 },
    crash: null,
    desktopIcons:
      persisted?.desktopIcons && Object.keys(persisted.desktopIcons).length
        ? persisted.desktopIcons
        : defaultDesktopIconPositions(),
    clipboard: null,
    messageBoxes: [],
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
  | { type: 'SET_FS'; fs: FsState }
  | { type: 'SET_CLIPBOARD'; clipboard: ClipboardState }
  | { type: 'SET_NETWORK'; network: NetworkState }
  | { type: 'SET_THEME'; themeId: string; wallpaperId?: string }
  | { type: 'SET_WALLPAPER'; wallpaperId: string }
  | { type: 'SET_CURSOR_SCHEME'; scheme: CursorSchemeId }
  | { type: 'SET_AUDIO'; audio: AudioState }
  | { type: 'ENTER_BIOS_SETUP' }
  | { type: 'ENTER_BOOT_DEVICE_MENU' }
  | { type: 'SET_BIOS'; bios: BiosSettings }
  | { type: 'CRASH'; crash: CrashState }
  | {
      type: 'RESTART'
      target: 'normal' | 'safe' | 'dos' | 'recovery' | 'bootMenu'
      bootProfile: BootProfile
    }
  | { type: 'SHUTDOWN' }
  | { type: 'FINISH_BOOT' }
  | { type: 'RESET'; state: OsState }

function nextActiveWindow(windows: WindowState[], excludeId?: string): string | undefined {
  return windows
    .filter((win) => win.instanceId !== excludeId && !win.minimized)
    .sort((a, b) => b.zIndex - a.zIndex)[0]?.instanceId
}

function reducer(state: OsState, action: Action): OsState {
  switch (action.type) {
    case 'OPEN_WINDOW': {
      const zIndex = state.zCounter + 1
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
    case 'ENTER_BOOT_DEVICE_MENU':
      return {
        ...state,
        phase: 'bootDeviceMenu',
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
      switch (state.bootTarget) {
        case 'normal':
          if (!isSystemHealthy(state.fs)) {
            return { ...state, phase: 'bootMenu', bootTarget: 'normal' }
          }
          return { ...state, phase: 'desktop', bootMode: 'normal' }
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
            phase: 'desktop',
            bootMode: 'safe',
            network: releasedNetworkState(),
          }
        case 'dos':
          return { ...state, phase: 'dosOnly' }
        case 'recovery':
          return { ...state, phase: 'recovery' }
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

// Taglish note: OsProvider ang bridge ng UI at virtual OS. Apps call these
// methods, pero filesystem/network/audio rules stay centralized dito.
export function OsProvider({ children }: { children: ReactNode }): ReactNode {
  const [state, dispatch] = useReducer(reducer, undefined, createDefaultState)
  const stateRef = useRef(state)
  const startupSoundPlayedRef = useRef(false)
  useEffect(() => {
    stateRef.current = state
  })

  // ----- sounds -----
  const playSound = useCallback((id: SoundId) => {
    const current = stateRef.current
    if (!current.audio.enabled || current.audio.muted || current.audio.volume <= 0) return
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
      if (!current.audio.enabled) {
        const audio: AudioState = { ...current.audio, enabled: true, muted: false }
        stateRef.current = { ...current, audio }
        dispatch({ type: 'SET_AUDIO', audio })
      }
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

  const closeWindow = useCallback((id: string) => {
    dispatch({ type: 'CLOSE_WINDOW', id })
  }, [])

  const minimizeWindow = useCallback(
    (id: string) => {
      dispatch({ type: 'MINIMIZE_WINDOW', id })
      playSound('minimize')
    },
    [playSound],
  )

  const toggleMaximize = useCallback((id: string) => {
    dispatch({ type: 'TOGGLE_MAXIMIZE', id })
  }, [])

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

  const enterBiosSetup = useCallback(() => {
    dispatch({ type: 'ENTER_BIOS_SETUP' })
  }, [])

  const enterBootDeviceMenu = useCallback(() => {
    dispatch({ type: 'ENTER_BOOT_DEVICE_MENU' })
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
    dispatch({ type: 'RESTART', target, bootProfile: opts?.bootProfile ?? 'cold' })
  }, [])

  const shutDown = useCallback(() => {
    playSound('shutdown')
    dispatch({ type: 'SHUTDOWN' })
  }, [playSound])

  const finishBoot = useCallback(() => {
    dispatch({ type: 'FINISH_BOOT' })
  }, [])

  const resetEverything = useCallback(() => {
    clearPersistedState()
    startupSoundPlayedRef.current = false
    const fresh: OsState = {
      ...createDefaultState(),
      fs: createInitialFsState(),
      network: defaultNetworkState,
      themeId: defaultThemeId,
      wallpaperId: defaultWallpaperId,
      cursorScheme: 'win98',
      desktopIcons: defaultDesktopIconPositions(),
    }
    stateRef.current = fresh
    dispatch({ type: 'RESET', state: fresh })
  }, [])

  // ----- filesystem ops (synchronous; optimistic stateRef updates) -----
  const commitFs = useCallback((fs: FsState) => {
    stateRef.current = { ...stateRef.current, fs }
    dispatch({ type: 'SET_FS', fs })
  }, [])

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
        commitNetwork(randomDhcpLease())
        playSound('networkUp')
      },
      disconnect(): void {
        if (!stateRef.current.network.connected) return
        commitNetwork(releasedNetworkState())
        playSound('networkDown')
      },
      renewDhcp(): void {
        const wasConnected = stateRef.current.network.connected
        commitNetwork(randomDhcpLease())
        if (!wasConnected) {
          playSound('networkUp')
        }
      },
      applyConfig(partial: Partial<NetworkState>): void {
        const previous = stateRef.current.network
        const next = { ...previous, ...partial }
        commitNetwork(next)
        if (previous.connected !== next.connected) {
          playSound(next.connected ? 'networkUp' : 'networkDown')
        }
      },
      recordTraffic(sent: number, received: number): void {
        const network = stateRef.current.network
        commitNetwork({
          ...network,
          packetsSent: network.packetsSent + sent,
          packetsReceived: network.packetsReceived + received,
        })
      },
    }),
    [commitNetwork, playSound],
  )

  // ----- appearance -----
  const setTheme = useCallback((themeId: string) => {
    const theme = getTheme(themeId)
    dispatch({ type: 'SET_THEME', themeId: theme.id, wallpaperId: theme.wallpaperId })
  }, [])

  const setWallpaper = useCallback((wallpaperId: string) => {
    dispatch({ type: 'SET_WALLPAPER', wallpaperId })
  }, [])

  const setCursorScheme = useCallback((scheme: CursorSchemeId) => {
    dispatch({ type: 'SET_CURSOR_SCHEME', scheme })
  }, [])

  // ----- audio -----
  const enableAudio = useCallback(() => {
    unlockAudio()
    const audio: AudioState = { ...stateRef.current.audio, enabled: true, muted: false }
    stateRef.current = { ...stateRef.current, audio }
    dispatch({ type: 'SET_AUDIO', audio })
    if (!audio.muted && audio.volume > 0) {
      synthPlaySound('ding', audio.volume)
    }
  }, [])

  const setAudioMuted = useCallback((muted: boolean) => {
    if (!muted) {
      unlockAudio()
    }
    const audio: AudioState = { ...stateRef.current.audio, enabled: true, muted }
    stateRef.current = { ...stateRef.current, audio }
    dispatch({ type: 'SET_AUDIO', audio })
    if (!muted && audio.volume > 0) {
      synthPlaySound('ding', audio.volume)
    }
  }, [])

  const setAudioVolume = useCallback((volume: number) => {
    const clamped = Math.max(0, Math.min(1, volume))
    const audio: AudioState = { ...stateRef.current.audio, volume: clamped }
    stateRef.current = { ...stateRef.current, audio }
    dispatch({ type: 'SET_AUDIO', audio })
  }, [])

  // ----- DOM effects: theme / wallpaper / cursor -----
  const inSafeDesktop = state.phase === 'desktop' && state.bootMode === 'safe'
  const { themeId, wallpaperId, cursorScheme } = state
  useEffect(() => {
    const theme = inSafeDesktop ? getTheme('safeMode16') : getTheme(themeId)
    const wallpaper = inSafeDesktop ? getWallpaper('none') : getWallpaper(wallpaperId)
    applyTheme(theme)
    applyWallpaper(wallpaper)
    applyCursorScheme(cursorScheme)
  }, [themeId, wallpaperId, cursorScheme, inSafeDesktop])

  // ----- startup sound on reaching the desktop -----
  const prevPhaseRef = useRef(state.phase)
  useEffect(() => {
    const previous = prevPhaseRef.current
    prevPhaseRef.current = state.phase
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
      fsOps,
      setClipboard,
      networkOps,
      setTheme,
      setWallpaper,
      setCursorScheme,
      enableAudio,
      setAudioMuted,
      setAudioVolume,
      playSound,
      crashSystem,
      enterBiosSetup,
      enterBootDeviceMenu,
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
      fsOps,
      setClipboard,
      networkOps,
      setTheme,
      setWallpaper,
      setCursorScheme,
      enableAudio,
      setAudioMuted,
      setAudioVolume,
      playSound,
      crashSystem,
      enterBiosSetup,
      enterBootDeviceMenu,
      setBiosSettings,
      restart,
      shutDown,
      finishBoot,
      resetEverything,
    ],
  )

  return <OsContext.Provider value={value}>{children}</OsContext.Provider>
}
