import { describe, expect, it } from 'vitest'
import {
  BONZI_CLEAN,
  BONZI_FULLY_INSTALLED,
  BONZI_LEAK_MAX_MB,
  BONZI_LEAK_STEP_MB,
  BONZI_UPDATER_PATH,
  bonziLagMs,
  bonziThreats,
  bonziUpdaterArmed,
  coerceBonziState,
  nextBonziLeak,
  withBonziUpdater,
  withoutBonziUpdater,
} from '../bonziAdware'
import { createInitialFsState } from '../initialFilesystem'
import { getNode, parentPath } from '../../os/filesystem'
import { memoryInUseMb, SIMULATED_RAM_MB, SYSTEM_RESERVED_MB, windowMemoryMb } from '../../os/memory'

describe('bonzi adware lifecycle', () => {
  it('drops the updater into the virtual System32 and removes it again', () => {
    const clean = createInitialFsState()
    expect(getNode(clean, BONZI_UPDATER_PATH)).toBeUndefined()
    const infected = withBonziUpdater(clean)
    expect(getNode(infected, BONZI_UPDATER_PATH)?.kind).toBe('file')
    expect(getNode(infected, parentPath(BONZI_UPDATER_PATH))?.children).toContain(BONZI_UPDATER_PATH)
    const cleaned = withoutBonziUpdater(infected)
    expect(getNode(cleaned, BONZI_UPDATER_PATH)).toBeUndefined()
    expect(getNode(cleaned, parentPath(BONZI_UPDATER_PATH))?.children).not.toContain(BONZI_UPDATER_PATH)
  })

  it('only lets the updater reinstall him while its entry is on and its file exists', () => {
    const fs = withBonziUpdater(createInitialFsState())
    expect(bonziUpdaterArmed({ ...BONZI_CLEAN, updater: true }, fs)).toBe(true)
    expect(bonziUpdaterArmed({ ...BONZI_CLEAN, updater: false }, fs)).toBe(false) // disabled in System Configuration
    expect(bonziUpdaterArmed({ ...BONZI_CLEAN, updater: true }, withoutBonziUpdater(fs))).toBe(false) // file deleted
  })

  it('reports every piece of him to Antivirus 98, and nothing on a clean machine', () => {
    const fs = withBonziUpdater(createInitialFsState())
    expect(bonziThreats(BONZI_FULLY_INSTALLED, fs).map((threat) => threat.id)).toEqual([
      'program',
      'startup',
      'updater',
      'homepage',
    ])
    // After Add/Remove Programs: the updater and the hijacked home page remain.
    const uninstalled = { ...BONZI_FULLY_INSTALLED, installed: false, runAtStartup: false }
    expect(bonziThreats(uninstalled, fs).map((threat) => threat.id)).toEqual(['updater', 'homepage'])
    expect(bonziThreats(BONZI_CLEAN, createInitialFsState())).toEqual([])
  })

  it('reads a saved state defensively', () => {
    expect(coerceBonziState(undefined)).toEqual(BONZI_CLEAN)
    expect(coerceBonziState({ installed: true, homepage: 'yes' })).toEqual({ ...BONZI_CLEAN, installed: true })
  })
})

describe('bonzi resource hog (simulated RAM)', () => {
  it('counts his leak against the simulated RAM only while his window is open', () => {
    const windows = [{ appId: 'bonzi' as const }, { appId: 'notepad' as const }]
    expect(windowMemoryMb('bonzi', 10)).toBe(windowMemoryMb('bonzi', 0) + 10)
    expect(windowMemoryMb('notepad', 10)).toBe(windowMemoryMb('notepad', 0))
    expect(memoryInUseMb(windows, 10)).toBe(SYSTEM_RESERVED_MB + windowMemoryMb('bonzi', 10) + windowMemoryMb('notepad', 0))
  })

  it('grows a step at a time, up to his cap, and never into the last few MB', () => {
    expect(nextBonziLeak(0, 30)).toBe(BONZI_LEAK_STEP_MB)
    expect(nextBonziLeak(BONZI_LEAK_MAX_MB, 30)).toBe(BONZI_LEAK_MAX_MB)
    // Nearly full: he stops rather than leave nothing for other programs.
    expect(nextBonziLeak(8, SIMULATED_RAM_MB - 4)).toBe(8)
    let leak = 0
    for (let tick = 0; tick < 100; tick += 1) leak = nextBonziLeak(leak, 26 + leak)
    expect(leak).toBeLessThanOrEqual(BONZI_LEAK_MAX_MB)
    expect(26 + leak).toBeLessThanOrEqual(SIMULATED_RAM_MB)
  })

  it('makes launches drag harder the more he holds', () => {
    expect(bonziLagMs(0)).toBe(0)
    expect(bonziLagMs(12)).toBeGreaterThan(0)
    expect(bonziLagMs(BONZI_LEAK_MAX_MB)).toBeGreaterThan(bonziLagMs(12))
    expect(bonziLagMs(1000)).toBeLessThanOrEqual(1500)
  })
})
