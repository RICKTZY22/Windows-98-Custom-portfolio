import type {
  AppearanceEffects,
  AudioState,
  BiosSettings,
  CursorSchemeId,
  FsState,
  NetworkState,
  OsState,
  Point,
  WallpaperMode,
} from '../types'
import { defaultBiosSettings, normalizeBootOrder } from '../data/bios'

export type PersistedState = {
  version: 5
  fs: FsState
  themeId: string
  wallpaperId: string
  wallpaperMode: WallpaperMode
  appearanceEffects: AppearanceEffects
  cursorScheme: CursorSchemeId
  audio: AudioState
  network: NetworkState
  desktopIcons: Record<string, Point>
  bios: BiosSettings
}

const STORAGE_KEY = 'win98-portfolio.v5'
const LEGACY_STORAGE_KEYS = ['win98-portfolio.v4', 'win98-portfolio.v3']
const DEFAULT_WALLPAPER_MODE: WallpaperMode = 'stretch'
const DEFAULT_APPEARANCE_EFFECTS: AppearanceEffects = {
  mouseTrails: false,
  menuShadows: true,
  windowAnimations: true,
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function coerceBiosSettings(value: unknown): BiosSettings {
  if (!isRecord(value)) return defaultBiosSettings
  const haltOn =
    value.haltOn === 'allErrors' || value.haltOn === 'noErrors' || value.haltOn === 'allButKeyboard'
      ? value.haltOn
      : defaultBiosSettings.haltOn
  const displayMode =
    value.displayMode === 'egaVga' || value.displayMode === 'cga80' || value.displayMode === 'mono'
      ? value.displayMode
      : defaultBiosSettings.displayMode
  const powerManagement =
    value.powerManagement === 'userDefine' ||
    value.powerManagement === 'maxSaving' ||
    value.powerManagement === 'minSaving' ||
    value.powerManagement === 'disabled'
      ? value.powerManagement
      : defaultBiosSettings.powerManagement
  const videoOffMethod =
    value.videoOffMethod === 'vhSyncBlank' || value.videoOffMethod === 'blankScreen' || value.videoOffMethod === 'dpms'
      ? value.videoOffMethod
      : defaultBiosSettings.videoOffMethod
  const modemIrq =
    value.modemIrq === '3' || value.modemIrq === '4' || value.modemIrq === '5' || value.modemIrq === '7' || value.modemIrq === 'NA'
      ? value.modemIrq
      : defaultBiosSettings.modemIrq
  const softOffMode =
    value.softOffMode === 'instantOff' || value.softOffMode === 'delay4Sec'
      ? value.softOffMode
      : defaultBiosSettings.softOffMode

  return {
    quickPost: typeof value.quickPost === 'boolean' ? value.quickPost : defaultBiosSettings.quickPost,
    floppyEnabled: typeof value.floppyEnabled === 'boolean' ? value.floppyEnabled : defaultBiosSettings.floppyEnabled,
    cdromEnabled: typeof value.cdromEnabled === 'boolean' ? value.cdromEnabled : defaultBiosSettings.cdromEnabled,
    networkBootEnabled:
      typeof value.networkBootEnabled === 'boolean'
        ? value.networkBootEnabled
        : defaultBiosSettings.networkBootEnabled,
    soundEnabled: typeof value.soundEnabled === 'boolean' ? value.soundEnabled : defaultBiosSettings.soundEnabled,
    virusWarning: typeof value.virusWarning === 'boolean' ? value.virusWarning : defaultBiosSettings.virusWarning,
    pnpOsInstalled:
      typeof value.pnpOsInstalled === 'boolean' ? value.pnpOsInstalled : defaultBiosSettings.pnpOsInstalled,
    resetConfigurationData:
      typeof value.resetConfigurationData === 'boolean'
        ? value.resetConfigurationData
        : defaultBiosSettings.resetConfigurationData,
    assignIrqForVga:
      typeof value.assignIrqForVga === 'boolean' ? value.assignIrqForVga : defaultBiosSettings.assignIrqForVga,
    cmosDate: typeof value.cmosDate === 'string' ? value.cmosDate : defaultBiosSettings.cmosDate,
    cmosTime: typeof value.cmosTime === 'string' ? value.cmosTime : defaultBiosSettings.cmosTime,
    displayMode,
    powerManagement,
    apmEnabled: typeof value.apmEnabled === 'boolean' ? value.apmEnabled : defaultBiosSettings.apmEnabled,
    videoOffMethod,
    modemIrq,
    softOffMode,
    haltOn,
    bootOrder: normalizeBootOrder(Array.isArray(value.bootOrder) ? value.bootOrder : defaultBiosSettings.bootOrder),
  }
}

function coerceWallpaperMode(value: unknown): WallpaperMode {
  return value === 'stretch' || value === 'center' || value === 'tile' ? value : DEFAULT_WALLPAPER_MODE
}

function coerceAppearanceEffects(value: unknown): AppearanceEffects {
  if (!isRecord(value)) return DEFAULT_APPEARANCE_EFFECTS
  return {
    mouseTrails: typeof value.mouseTrails === 'boolean' ? value.mouseTrails : DEFAULT_APPEARANCE_EFFECTS.mouseTrails,
    menuShadows: typeof value.menuShadows === 'boolean' ? value.menuShadows : DEFAULT_APPEARANCE_EFFECTS.menuShadows,
    windowAnimations:
      typeof value.windowAnimations === 'boolean'
        ? value.windowAnimations
        : DEFAULT_APPEARANCE_EFFECTS.windowAnimations,
  }
}

function isValidPersistedShape(value: unknown): value is Omit<PersistedState, 'version' | 'bios'> & {
  version: 3 | 4 | 5
  bios?: BiosSettings
} {
  if (!isRecord(value)) return false
  if (value.version !== 3 && value.version !== 4 && value.version !== 5) return false
  if (!isRecord(value.fs)) return false
  const fs = value.fs
  if (!isRecord(fs.nodes) || !Array.isArray(fs.recycle)) return false
  if (typeof value.themeId !== 'string') return false
  if (typeof value.wallpaperId !== 'string') return false
  if (value.cursorScheme !== 'win98' && value.cursorScheme !== 'standard') return false
  if (!isRecord(value.audio) || typeof value.audio.volume !== 'number') return false
  if (!isRecord(value.network) || typeof value.network.ipAddress !== 'string') return false
  if (!isRecord(value.desktopIcons)) return false
  // The filesystem must at least still have a C: drive to be usable.
  if (!isRecord(fs.nodes['C:\\'])) return false
  return true
}

export function loadPersistedState(): PersistedState | null {
  try {
    if (typeof localStorage === 'undefined') {
      return null
    }
    const raw =
      localStorage.getItem(STORAGE_KEY) ??
      LEGACY_STORAGE_KEYS.map((key) => localStorage.getItem(key)).find((value): value is string => Boolean(value))
    if (!raw) {
      return null
    }
    const parsed: unknown = JSON.parse(raw)
    if (!isValidPersistedShape(parsed)) {
      return null
    }
    return {
      ...parsed,
      version: 5,
      bios: coerceBiosSettings(parsed.bios),
      wallpaperMode: coerceWallpaperMode(parsed.wallpaperMode),
      appearanceEffects: coerceAppearanceEffects(parsed.appearanceEffects),
    }
  } catch {
    return null
  }
}

export function persistState(state: OsState): void {
  try {
    if (typeof localStorage === 'undefined') {
      return
    }
    const snapshot: PersistedState = {
      version: 5,
      fs: {
        nodes: state.fs.nodes,
        // onResult callbacks etc. never live in fs, so it serializes cleanly -
        // but strip functions defensively by relying on JSON semantics.
        recycle: state.fs.recycle,
      },
      themeId: state.themeId,
      wallpaperId: state.wallpaperId,
      wallpaperMode: state.wallpaperMode,
      appearanceEffects: state.appearanceEffects,
      cursorScheme: state.cursorScheme,
      audio: state.audio,
      network: state.network,
      desktopIcons: state.desktopIcons,
      bios: state.bios,
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot))
  } catch {
    // Storage may be full or blocked; the OS simply boots fresh next time.
  }
}

export function clearPersistedState(): void {
  try {
    if (typeof localStorage === 'undefined') {
      return
    }
    localStorage.removeItem(STORAGE_KEY)
    for (const key of LEGACY_STORAGE_KEYS) {
      localStorage.removeItem(key)
    }
  } catch {
    // ignore
  }
}

// ---------------------------------------------------------------------------
// Improper-shutdown detection
// ---------------------------------------------------------------------------
// A tiny flag kept SEPARATE from the versioned PersistedState blob above. It
// records whether the simulated machine is currently "on": a proper Shut Down /
// Restart flips it to 'clean', while closing or refreshing the tab leaves it
// 'running'. On the next load a 'running' value means the previous session ended
// improperly, so the boot runs the startup ScanDisk screen (mirrors real Win98).
const SESSION_KEY = 'win98-portfolio.session'

export function markSessionRunning(): void {
  try {
    if (typeof localStorage === 'undefined') return
    localStorage.setItem(SESSION_KEY, 'running')
  } catch {
    // Storage may be blocked; the startup scan simply never triggers.
  }
}

export function markSessionClean(): void {
  try {
    if (typeof localStorage === 'undefined') return
    localStorage.setItem(SESSION_KEY, 'clean')
  } catch {
    // ignore
  }
}

/** True when the previous session ended without a proper shut down. */
export function wasSessionDirty(): boolean {
  try {
    if (typeof localStorage === 'undefined') return false
    return localStorage.getItem(SESSION_KEY) === 'running'
  } catch {
    return false
  }
}
