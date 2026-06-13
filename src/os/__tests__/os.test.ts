import { describe, expect, it } from 'vitest'
import { createInitialFsState, ensurePortfolioSeedFiles } from '../../data/initialFilesystem'
import { executeCommand } from '../commands'
import {
  copyNode,
  createFile,
  deleteNode,
  emptyRecycleBin,
  getNode,
  listDirectory,
  openTargetFor,
  restoreEntry,
  writeFile,
} from '../filesystem'
import { defaultNetworkState, pingReport, releasedNetworkState } from '../network'
import { isSystemHealthy, restoreSystemFiles } from '../recovery'
import { scheduleSound, soundCatalog } from '../audio'

// A minimal fake of the Web Audio scheduling surface that records every absolute
// time the synth schedules an event at. Lets us assert nothing is scheduled in
// the past against a live clock (the bug that silenced every sound after the first).
function makeFakeAudioContext(currentTime: number) {
  const times: number[] = []
  const param = () => ({
    value: 0,
    setValueAtTime: (_v: number, t: number) => times.push(t),
    linearRampToValueAtTime: (_v: number, t: number) => times.push(t),
    exponentialRampToValueAtTime: (_v: number, t: number) => times.push(t),
  })
  const ctx = {
    currentTime,
    sampleRate: 44100,
    destination: {},
    createOscillator: () => ({
      type: 'sine',
      frequency: param(),
      connect() {},
      start: (t: number) => times.push(t),
      stop: (t: number) => times.push(t),
    }),
    createGain: () => ({ gain: param(), connect() {} }),
    createBuffer: (_channels: number, length: number) => ({ getChannelData: () => new Float32Array(length) }),
    createBufferSource: () => ({ buffer: null, connect() {}, start: (t: number) => times.push(t) }),
    createBiquadFilter: () => ({ type: 'bandpass', Q: { value: 0 }, frequency: param(), connect() {} }),
  }
  return { ctx, times }
}

describe('virtual filesystem', () => {
  it('creates, copies, deletes, and restores regular files', () => {
    let fs = createInitialFsState()
    const created = createFile(fs, 'C:\\My Documents', 'Notes.txt', { content: 'hello' })
    expect(created.error).toBeNull()
    fs = created.fs
    expect(getNode(fs, 'C:\\My Documents\\Notes.txt')?.content).toBe('hello')

    const copied = copyNode(fs, 'C:\\My Documents\\Notes.txt', 'C:\\My Pictures')
    expect(copied.error).toBeNull()
    fs = copied.fs
    expect(getNode(fs, 'C:\\My Pictures\\Notes.txt')).toBeDefined()

    const deleted = deleteNode(fs, 'C:\\My Documents\\Notes.txt')
    expect(deleted.error).toBeNull()
    expect(deleted.criticalDeleted).toBe(false)
    fs = deleted.fs
    expect(getNode(fs, 'C:\\My Documents\\Notes.txt')).toBeUndefined()

    const restored = restoreEntry(fs, fs.recycle[0].id)
    expect(restored.error).toBeNull()
    expect(getNode(restored.fs, 'C:\\My Documents\\Notes.txt')).toBeDefined()
  })

  it('flags critical System32 deletion and recovery restores boot health', () => {
    const fs = createInitialFsState()
    const deleted = deleteNode(fs, 'C:\\Windows\\System32')
    expect(deleted.criticalDeleted).toBe(true)
    expect(isSystemHealthy(deleted.fs)).toBe(false)

    const restored = restoreSystemFiles(deleted.fs)
    expect(restored.restored.length).toBeGreaterThan(0)
    expect(isSystemHealthy(restored.fs)).toBe(true)
  })

  it('associates common file types with apps', () => {
    const fs = createInitialFsState()
    expect(openTargetFor(getNode(fs, 'C:\\My Documents\\About Me.txt')!)?.appId).toBe('about')
    expect(openTargetFor(getNode(fs, 'C:\\My Documents\\Resume.doc')!)?.appId).toBe('wordpad')
    expect(openTargetFor(getNode(fs, 'C:\\My Pictures\\Welcome.bmp')!)?.appId).toBe('paint')
    expect(openTargetFor(getNode(fs, 'C:\\Windows\\Media\\Startup.wav')!)?.appId).toBe('mediaPlayer')
  })

  it('opens a newly saved Paint PNG through the Paint association', () => {
    const written = writeFile(createInitialFsState(), 'C:\\My Pictures\\Sketch.png', {
      dataUrl: 'data:image/png;base64,iVBORw0KGgo=',
    })
    expect(written.error).toBeNull()
    const node = getNode(written.fs, 'C:\\My Pictures\\Sketch.png')
    expect(node?.fileType).toBe('PNG Image')
    expect(node?.icon).toBe('imageFile')
    expect(openTargetFor(node!)?.appId).toBe('paint')
  })

  it('seeds portfolio resume documents into an existing persisted disk', () => {
    let fs = createInitialFsState()
    const savedPaint = writeFile(fs, 'C:\\My Pictures\\KeepMe.png', {
      dataUrl: 'data:image/png;base64,abc',
    })
    expect(savedPaint.error).toBeNull()
    fs = savedPaint.fs

    const nodes = { ...fs.nodes }
    delete nodes['C:\\My Documents\\Resume.doc']
    delete nodes['C:\\Projects']
    fs = { ...fs, nodes }

    const seeded = ensurePortfolioSeedFiles(fs)
    expect(getNode(seeded, 'C:\\My Documents\\Resume.doc')?.appId).toBe('wordpad')
    expect(getNode(seeded, 'C:\\Projects')).toBeDefined()
    expect(getNode(seeded, 'C:\\My Pictures\\KeepMe.png')).toBeDefined()
  })

  it('permanently removes recycle entries when the recycle bin is emptied', () => {
    const fs = createInitialFsState()
    const deleted = deleteNode(fs, 'C:\\My Documents\\Education.txt')
    expect(deleted.error).toBeNull()
    expect(deleted.fs.recycle.length).toBe(1)

    const emptied = emptyRecycleBin(deleted.fs)
    expect(emptied.recycle.length).toBe(0)
    expect(getNode(emptied, 'C:\\My Documents\\Education.txt')).toBeUndefined()
  })
})

describe('command processor', () => {
  it('runs dir, cd, type, and scanreg against the shared filesystem model', () => {
    const fs = createInitialFsState()
    const ctx = { cwd: 'C:\\', fs, network: defaultNetworkState, bootMode: 'normal' as const, dosOnly: false }
    expect(executeCommand('dir', ctx).lines.join('\n')).toContain('Directory of C:\\')
    expect(executeCommand('cd "My Documents"', ctx).newCwd).toBe('C:\\My Documents')
    expect(executeCommand('type AUTOEXEC.BAT', ctx).lines.length).toBeGreaterThan(0)

    const deleted = deleteNode(fs, 'C:\\Windows\\System32\\kernel32.dll')
    const restored = executeCommand('scanreg /restore', { ...ctx, fs: deleted.fs })
    expect(restored.stream?.at(-1)?.effects?.[0]?.type).toBe('setFs')
  })
})

describe('network simulator', () => {
  it('pings known hosts only when the simulated adapter can reach them', () => {
    const online = pingReport('youtube.com', defaultNetworkState)
    expect(online.success).toBe(true)

    const offline = pingReport('youtube.com', releasedNetworkState())
    expect(offline.success).toBe(false)
    expect(offline.lines.flat().join('\n')).toContain('Request timed out.')
  })

  it('exposes the fake network folder', () => {
    const fs = createInitialFsState()
    expect(listDirectory(fs, 'C:\\Network').map((node) => node.name)).toContain('Ethernet Adapter')
  })
})

describe('audio synth scheduling', () => {
  it('anchors every scheduled event to the context clock so sounds are never scheduled in the past', () => {
    const NOW = 137.5 // simulate a context that has been running for a while
    for (const { id } of soundCatalog) {
      const { ctx, times } = makeFakeAudioContext(NOW)
      scheduleSound(ctx as unknown as BaseAudioContext, ctx.destination as unknown as AudioNode, id, 0.8)
      expect(times.length, `${id} scheduled no events`).toBeGreaterThan(0)
      // The pre-fix bug scheduled at absolute ~0..2.6s; against a live clock that
      // is in the past and silent. Every event must be at or after currentTime.
      expect(Math.min(...times), `${id} scheduled an event before currentTime`).toBeGreaterThanOrEqual(NOW)
    }
  })

  it('schedules close to the clock (small lookahead) rather than far in the future', () => {
    const { ctx, times } = makeFakeAudioContext(50)
    scheduleSound(ctx as unknown as BaseAudioContext, ctx.destination as unknown as AudioNode, 'click', 0.8)
    expect(Math.min(...times)).toBeLessThan(50 + 0.1)
  })
})
