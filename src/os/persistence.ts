import type { AudioState, BiosSettings, CursorSchemeId, FsState, NetworkState, OsState, Point } from '../types'
import { defaultBiosSettings, normalizeBootOrder } from '../data/bios'

export type PersistedState = {
  version: 4
  fs: FsState
  themeId: string
  wallpaperId: string
  cursorScheme: CursorSchemeId
  audio: AudioState
  network: NetworkState
  desktopIcons: Record<string, Point>
  bios: BiosSettings
}

const STORAGE_KEY = 'win98-portfolio.v4'
const LEGACY_STORAGE_KEY = 'win98-portfolio.v3'

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

function isValidPersistedShape(value: unknown): value is Omit<PersistedState, 'version' | 'bios'> & {
  version: 3 | 4
  bios?: BiosSettings
} {
  if (!isRecord(value)) return false
  if (value.version !== 3 && value.version !== 4) return false
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
    const raw = localStorage.getItem(STORAGE_KEY) ?? localStorage.getItem(LEGACY_STORAGE_KEY)
    if (!raw) {
      return null
    }
    const parsed: unknown = JSON.parse(raw)
    if (!isValidPersistedShape(parsed)) {
      return null
    }
    return {
      ...parsed,
      version: 4,
      bios: coerceBiosSettings(parsed.bios),
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
      version: 4,
      fs: {
        nodes: state.fs.nodes,
        // onResult callbacks etc. never live in fs, so it serializes cleanly -
        // but strip functions defensively by relying on JSON semantics.
        recycle: state.fs.recycle,
      },
      themeId: state.themeId,
      wallpaperId: state.wallpaperId,
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
    localStorage.removeItem(LEGACY_STORAGE_KEY)
  } catch {
    // ignore
  }
}
