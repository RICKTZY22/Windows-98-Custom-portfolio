import type { AppId, WindowState } from '../types'
import { appDefinitions } from '../data/apps'

// ----- simulated RAM budget -----
// The BIOS reports 64MB. Windows reserves a slice for itself and each open
// program occupies a little (AppDefinition.memoryCost). The store refuses or
// faults a launch that would overflow it; Task Manager reports the same numbers.
export const SIMULATED_RAM_MB = 64
export const SYSTEM_RESERVED_MB = 12
const DEFAULT_APP_MEMORY_MB = 5

export function appMemoryCost(appId: AppId): number {
  return appDefinitions[appId].memoryCost ?? DEFAULT_APP_MEMORY_MB
}

/** Simulated RAM one window holds: its program's footprint, plus whatever Bonzi
 *  has leaked if it is his window. */
export function windowMemoryMb(appId: AppId, bonziLeakMb: number): number {
  return appMemoryCost(appId) + (appId === 'bonzi' ? bonziLeakMb : 0)
}

/** Simulated RAM in use right now: Windows' own share plus every open window. */
export function memoryInUseMb(windows: readonly Pick<WindowState, 'appId'>[], bonziLeakMb: number): number {
  return windows.reduce((sum, win) => sum + windowMemoryMb(win.appId, bonziLeakMb), SYSTEM_RESERVED_MB)
}
