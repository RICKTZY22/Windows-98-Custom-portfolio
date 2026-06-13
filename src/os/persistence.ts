import type { AudioState, CursorSchemeId, FsState, NetworkState, OsState, Point } from '../types'

export type PersistedState = {
  version: 3
  fs: FsState
  themeId: string
  wallpaperId: string
  cursorScheme: CursorSchemeId
  audio: AudioState
  network: NetworkState
  desktopIcons: Record<string, Point>
}

const STORAGE_KEY = 'win98-portfolio.v3'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isValidPersistedState(value: unknown): value is PersistedState {
  if (!isRecord(value)) return false
  if (value.version !== 3) return false
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
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      return null
    }
    const parsed: unknown = JSON.parse(raw)
    if (!isValidPersistedState(parsed)) {
      return null
    }
    return parsed
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
      version: 3,
      fs: {
        nodes: state.fs.nodes,
        // onResult callbacks etc. never live in fs, so it serializes cleanly â€”
        // but strip functions defensively by relying on JSON semantics.
        recycle: state.fs.recycle,
      },
      themeId: state.themeId,
      wallpaperId: state.wallpaperId,
      cursorScheme: state.cursorScheme,
      audio: state.audio,
      network: state.network,
      desktopIcons: state.desktopIcons,
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
  } catch {
    // ignore
  }
}
