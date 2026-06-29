import { describe, expect, it } from 'vitest'
import type { BootDeviceId, OsState, WindowState } from '../../types'
import { missingAppDependency, missingAppDriverDependency, reducer } from '../store'
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
import {
  RECOVERY_MAX_RESTORE_MS,
  isSystemHealthy,
  missingSystemFilePackages,
  recoveryInstallDurationMs,
  shouldSafeModeBlueScreen,
  restoreSystemFiles,
} from '../recovery'
import { scheduleSound, soundCatalog } from '../audio'
import {
  bootSequenceLabel,
  defaultBiosSettings,
  enabledBootDevices,
  moveBootDevice,
} from '../../data/bios'
import {
  driverHealthy,
  missingDriverFiles,
  missingSystemHealthGroups,
  systemStatusLabel,
} from '../systemHealth'
import {
  EMPTY_WORDPAD_PAGE_HTML,
  WORDPAD_PAGE_BREAK_TOKEN,
  applyWordPadInlineStyle,
  cleanWordPadHtml,
  WORDPAD_FORMAT_MARKER,
  wordPadContentToPages,
  wordPadPagesToDocumentHtml,
} from '../wordpadFormatting'

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

  it('restores only one missing protected file when a single DLL is deleted', () => {
    const fs = createInitialFsState()
    const deleted = deleteNode(fs, 'C:\\Windows\\System32\\kernel32.dll')
    expect(deleted.criticalDeleted).toBe(true)

    const restored = restoreSystemFiles(deleted.fs)
    expect(restored.restored).toEqual(['C:\\Windows\\System32\\kernel32.dll'])
    expect(getNode(restored.fs, 'C:\\Windows\\System32\\kernel32.dll')).toBeDefined()
  })

  it('recovery counts only files as packages and caps a System32 reinstall at two minutes', () => {
    const fs = createInitialFsState()
    const deleted = deleteNode(fs, 'C:\\Windows\\System32')

    const packages = missingSystemFilePackages(deleted.fs)
    const restored = restoreSystemFiles(deleted.fs)

    expect(packages.length).toBeGreaterThan(24)
    expect(restored.restored.length).toBeGreaterThan(packages.length)
    expect(recoveryInstallDurationMs(packages.length)).toBe(RECOVERY_MAX_RESTORE_MS)
    expect(isSystemHealthy(restored.fs)).toBe(true)
  })

  it('lets one missing boot file attempt Safe Mode but blue-screens after severe damage', () => {
    const fs = createInitialFsState()
    const oneMissing = deleteNode(fs, 'C:\\Windows\\System32\\kernel32.dll')
    expect(shouldSafeModeBlueScreen(oneMissing.fs)).toBe(false)

    const twoMissing = deleteNode(oneMissing.fs, 'C:\\Windows\\System32\\user32.dll')
    expect(shouldSafeModeBlueScreen(twoMissing.fs)).toBe(true)
  })

  it('associates common file types with apps', () => {
    let fs = createInitialFsState()
    expect(openTargetFor(getNode(fs, 'C:\\My Documents\\About Me.txt')!)?.appId).toBe('about')
    expect(openTargetFor(getNode(fs, 'C:\\My Documents\\Resume.doc')!)?.appId).toBe('wordpad')
    fs = writeFile(fs, 'C:\\My Pictures\\Photo.bmp', { dataUrl: 'data:image/bmp;base64,Qk0=' }).fs
    const bitmap = getNode(fs, 'C:\\My Pictures\\Photo.bmp')!
    expect(bitmap.icon).toBe('paint')
    expect(openTargetFor(bitmap)?.appId).toBe('imageViewer')
    fs = writeFile(fs, 'C:\\My Videos\\Demo.mp4', { dataUrl: '/media/user/demo.mp4' }).fs
    expect(openTargetFor(getNode(fs, 'C:\\My Videos\\Demo.mp4')!)?.appId).toBe('videoPlayer')
    expect(openTargetFor(getNode(fs, 'C:\\Windows\\Media\\Startup.wav')!)?.appId).toBe('mediaPlayer')
    fs = writeFile(fs, 'C:\\My Documents\\Portfolio.pdf', { dataUrl: '/docs/pdf/final-1.pdf' }).fs
    expect(openTargetFor(getNode(fs, 'C:\\My Documents\\Portfolio.pdf')!)?.appId).toBe('pdfViewer')
  })

  it('blocks WordPad documents when a required rich edit dependency is missing', () => {
    const fs = createInitialFsState()
    const deleted = deleteNode(fs, 'C:\\Windows\\System32\\riched20.dll')

    expect(openTargetFor(getNode(deleted.fs, 'C:\\My Documents\\Resume.doc')!)?.appId).toBe('wordpad')
    expect(missingAppDependency('wordpad', deleted.fs)).toBe('C:\\Windows\\System32\\riched20.dll')
  })

  it('allows unrelated apps when their dependencies are intact', () => {
    const fs = createInitialFsState()
    const deleted = deleteNode(fs, 'C:\\Windows\\System32\\riched20.dll')

    expect(missingAppDependency('notepad', deleted.fs)).toBeNull()
    expect(missingAppDependency('calculator', deleted.fs)).toBeNull()
  })

  it('classifies missing simulated network drivers without breaking boot health', () => {
    const fs = createInitialFsState()
    const deleted = deleteNode(fs, 'C:\\Windows\\System32\\Drivers\\tcpip.sys')

    expect(deleted.criticalDeleted).toBe(false)
    expect(isSystemHealthy(deleted.fs)).toBe(true)
    expect(driverHealthy(deleted.fs, 'network')).toBe(false)
    expect(missingDriverFiles(deleted.fs, 'network')).toEqual(['C:\\Windows\\System32\\Drivers\\tcpip.sys'])
    expect(missingAppDriverDependency('network', deleted.fs)?.type).toBe('network')
    expect(missingAppDriverDependency('internetExplorer', deleted.fs)?.type).toBe('network')
    expect(missingAppDriverDependency('notepad', deleted.fs)).toBeNull()
  })

  it('classifies audio and video drivers as feature-scoped dependencies', () => {
    const fs = createInitialFsState()
    const audioMissing = deleteNode(fs, 'C:\\Windows\\System32\\sound.drv')
    const videoMissing = deleteNode(fs, 'C:\\Windows\\System32\\Drivers\\vga.drv')
    const displayDriverMissing = deleteNode(fs, 'C:\\Windows\\System32\\display.drv')

    expect(audioMissing.criticalDeleted).toBe(false)
    expect(driverHealthy(audioMissing.fs, 'audio')).toBe(false)
    expect(missingAppDriverDependency('mediaPlayer', audioMissing.fs)?.type).toBe('audio')
    expect(missingAppDriverDependency('paint', audioMissing.fs)).toBeNull()

    expect(videoMissing.criticalDeleted).toBe(false)
    expect(driverHealthy(videoMissing.fs, 'video')).toBe(false)
    expect(missingAppDriverDependency('paint', videoMissing.fs)?.type).toBe('video')
    expect(missingAppDriverDependency('gallery', videoMissing.fs)?.type).toBe('video')
    expect(missingAppDriverDependency('notepad', videoMissing.fs)).toBeNull()

    expect(displayDriverMissing.criticalDeleted).toBe(false)
    expect(isSystemHealthy(displayDriverMissing.fs)).toBe(true)
    expect(driverHealthy(displayDriverMissing.fs, 'video')).toBe(false)
  })

  it('restores missing simulated drivers from the protected cache', () => {
    const fs = createInitialFsState()
    const deleted = deleteNode(fs, 'C:\\Windows\\System32\\Drivers\\el90xnd3.sys')

    expect(missingSystemHealthGroups(deleted.fs).map((group) => group.label)).toContain('Network Drivers')

    const restored = restoreSystemFiles(deleted.fs)
    expect(restored.restored).toEqual(['C:\\Windows\\System32\\Drivers\\el90xnd3.sys'])
    expect(driverHealthy(restored.fs, 'network')).toBe(true)
    expect(systemStatusLabel(restored.fs)).toBe('Detected')
  })

  it('purges legacy seed artifacts and restores My Videos when topping up a migrated disk', () => {
    let fs = createInitialFsState()
    // Simulate an older disk: a demo image that used to ship in My Pictures, plus
    // a user file that must be preserved, stale uploaded media seeds, and a disk missing the My Videos folder.
    fs = createFile(fs, 'C:\\My Pictures', 'Welcome.bmp', { content: 'old demo' }).fs
    fs = createFile(fs, 'C:\\My Pictures', 'MyPhoto.png', { content: 'mine' }).fs
    fs = createFile(fs, 'C:\\My Pictures', 'media.bmp', { content: 'saved bitmap', icon: 'imageFile' }).fs
    fs = createFile(fs, 'C:\\My Pictures', 'Old Upload.jpg', { dataUrl: '/media/user/Old%20Upload.jpg' }).fs
    fs = createFile(fs, 'C:\\My Pictures', 'gallery-photo.png', {
      dataUrl: 'https://old.public.blob.vercel-storage.com/gallery-photo.png',
    }).fs
    fs = createFile(fs, 'C:\\My Videos', 'Old Upload.mp4', { dataUrl: '/media/user/Old%20Upload.mp4' }).fs
    fs = createFile(fs, 'C:\\My Documents\\Music', 'Old Upload.mp3', { dataUrl: '/media/user/Old%20Upload.mp3' }).fs
    fs = createFile(fs, 'C:\\My Documents', 'Education.txt', { content: 'old education seed' }).fs
    const nodesWithOldLauncher = { ...fs.nodes }
    nodesWithOldLauncher['C:\\Windows\\Desktop\\Portfolio OS.lnk'] = {
      ...nodesWithOldLauncher['C:\\Windows\\Desktop\\Portfolio OS.lnk'],
      appId: 'projects',
      appPayload: undefined,
    }
    fs = { ...fs, nodes: nodesWithOldLauncher }
    const withoutVideos = { ...fs.nodes }
    delete withoutVideos['C:\\My Videos']
    fs = { ...fs, nodes: withoutVideos }

    const cleaned = ensurePortfolioSeedFiles(fs)
    expect(getNode(cleaned, 'C:\\My Pictures\\Welcome.bmp')).toBeUndefined() // legacy artifact removed
    expect(getNode(cleaned, 'C:\\My Pictures\\MyPhoto.png')).toBeDefined() // user file kept
    expect(getNode(cleaned, 'C:\\My Pictures\\media.bmp')?.icon).toBe('paint')
    expect(getNode(cleaned, 'C:\\My Pictures\\Old Upload.jpg')).toBeUndefined()
    expect(getNode(cleaned, 'C:\\My Pictures\\gallery-photo.png')).toBeUndefined()
    expect(getNode(cleaned, 'C:\\My Documents\\Music\\Old Upload.mp3')).toBeUndefined()
    expect(getNode(cleaned, 'C:\\My Documents\\Education.txt')).toBeUndefined()
    expect(getNode(cleaned, 'C:\\Windows\\Desktop\\Portfolio OS.lnk')?.appId).toBe('explorer')
    expect(getNode(cleaned, 'C:\\Windows\\Desktop\\Portfolio OS.lnk')?.appPayload?.path).toBe(
      'C:\\Projects\\Windows 98 Portfolio OS',
    )
    expect(getNode(cleaned, 'C:\\My Videos')?.kind).toBe('folder') // folder restored
  })

  it('opens a newly saved Paint PNG through the image viewer association', () => {
    const written = writeFile(createInitialFsState(), 'C:\\My Pictures\\Sketch.png', {
      dataUrl: 'data:image/png;base64,iVBORw0KGgo=',
    })
    expect(written.error).toBeNull()
    const node = getNode(written.fs, 'C:\\My Pictures\\Sketch.png')
    expect(node?.fileType).toBe('PNG Image')
    expect(node?.icon).toBe('imageFile')
    expect(openTargetFor(node!)?.appId).toBe('imageViewer')
  })

  it('opens modern hosted image formats through the image viewer association', () => {
    const written = writeFile(createInitialFsState(), 'C:\\My Pictures\\Portfolio.webp', {
      dataUrl: 'https://blob.example/portfolio.webp',
    })
    expect(written.error).toBeNull()
    const node = getNode(written.fs, 'C:\\My Pictures\\Portfolio.webp')
    expect(node?.fileType).toBe('WebP Image')
    expect(node?.icon).toBe('imageFile')
    expect(openTargetFor(node!)?.appId).toBe('imageViewer')
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
    expect(getNode(seeded, 'C:\\My Documents\\Resume.doc')?.content).toContain(
      'data-resume-template="dark-sidebar-v1"',
    )
    expect(getNode(seeded, 'C:\\My Documents\\Education.txt')).toBeUndefined()
    expect(getNode(seeded, 'C:\\Projects')).toBeDefined()
    expect(getNode(seeded, 'C:\\Projects\\Windows 98 Portfolio OS\\src\\data\\initialFilesystem.ts')?.fileType).toBe(
      'TypeScript Source',
    )
    // The per-project Documentation\*.md showcase markdown is legitimate and stays.
    expect(getNode(seeded, 'C:\\Projects\\Windows 98 Portfolio OS\\Documentation\\Features.md')?.fileType).toBe(
      'Markdown Document',
    )
    // The confidential footprint (the docs/ source dump and the case-study PDFs
    // under Documentation\PDFs) is NOT seeded, and a purge keeps it from
    // reappearing on disks seeded by older builds.
    expect(getNode(seeded, 'C:\\Projects\\Windows 98 Portfolio OS\\docs')).toBeUndefined()
    expect(getNode(seeded, 'C:\\Projects\\Windows 98 Portfolio OS\\docs\\apps\\explorer.md')).toBeUndefined()
    expect(
      getNode(seeded, 'C:\\Projects\\Windows 98 Portfolio OS\\Documentation\\PDFs\\Build Documentation Explained.pdf'),
    ).toBeUndefined()
    expect(getNode(seeded, 'C:\\Projects\\PLMun Inventory Nexus\\Backend\\apps\\messaging\\consumers.py')?.appId).toBe(
      'notepad',
    )
    expect(getNode(seeded, 'C:\\Projects\\PLMun Inventory Nexus\\frontend\\src\\pages\\Dashboard.jsx')?.fileType).toBe(
      'React Component',
    )
    expect(getNode(seeded, 'C:\\Projects\\PLMun Inventory Nexus\\.github\\workflows\\ci.yml')?.fileType).toBe(
      'YAML File',
    )
    expect(getNode(seeded, 'C:\\Projects\\Between Two Ruins\\between-two-ruins-web\\src\\App.tsx')).toBeDefined()
    expect(getNode(seeded, 'C:\\Projects\\Between Two Ruins\\between-two-ruins-web\\public\\cover-art.png')?.appId).toBe(
      'imageViewer',
    )
    expect(getNode(seeded, 'C:\\My Pictures')?.kind).toBe('folder')
    expect(getNode(seeded, 'C:\\Program Files\\Accessories\\KODAKIMG.EXE')?.appId).toBe('imageViewer')
    expect(getNode(seeded, 'C:\\Program Files\\Accessories\\VIDPLAY.EXE')?.appId).toBe('videoPlayer')
    expect(getNode(seeded, 'C:\\My Pictures\\KeepMe.png')).toBeDefined()
  })

  it('permanently removes recycle entries when the recycle bin is emptied', () => {
    const fs = createFile(createInitialFsState(), 'C:\\My Documents', 'Trash Me.txt', { content: 'temporary' }).fs
    const deleted = deleteNode(fs, 'C:\\My Documents\\Trash Me.txt')
    expect(deleted.error).toBeNull()
    expect(deleted.fs.recycle.length).toBe(1)

    const emptied = emptyRecycleBin(deleted.fs)
    expect(emptied.recycle.length).toBe(0)
    expect(getNode(emptied, 'C:\\My Documents\\Trash Me.txt')).toBeUndefined()
  })
})

describe('window reducer', () => {
  // Minimal slice of OsState: OPEN_WINDOW only reads windows/zCounter/activeWindowId/startMenuOpen.
  const baseState = (): OsState =>
    ({ windows: [], zCounter: 20, activeWindowId: undefined, startMenuOpen: false }) as unknown as OsState

  const makeWindow = (instanceId: string): Omit<WindowState, 'zIndex'> =>
    ({
      instanceId,
      appId: 'internetExplorer',
      title: 'Internet Explorer',
      icon: 'internetExplorer',
      minimized: false,
      maximized: false,
      x: 0,
      y: 0,
      width: 400,
      height: 300,
    }) as unknown as Omit<WindowState, 'zIndex'>

  it('focuses instead of duplicating when the same instanceId is opened twice', () => {
    // Reproduces the Enter-key double-handler race: two OPEN_WINDOW dispatches for
    // one instanceId, as happens when both DesktopIcon and the desktop window-level
    // keydown handler fire before state commits. Must yield a single window so two
    // React children never share the instanceId key.
    const win = makeWindow('internetExplorer')
    const once = reducer(baseState(), { type: 'OPEN_WINDOW', window: win })
    const twice = reducer(once, { type: 'OPEN_WINDOW', window: win })

    expect(once.windows).toHaveLength(1)
    expect(twice.windows).toHaveLength(1)
    expect(twice.windows.map((w) => w.instanceId)).toEqual(['internetExplorer'])
    expect(twice.activeWindowId).toBe('internetExplorer')
    // Re-opening still raises the window above where it was.
    expect(twice.windows[0].zIndex).toBeGreaterThan(once.windows[0].zIndex)
  })

  it('restores a minimized window when its app is reopened', () => {
    const win = makeWindow('internetExplorer')
    const opened = reducer(baseState(), { type: 'OPEN_WINDOW', window: win })
    const minimized: OsState = {
      ...opened,
      windows: opened.windows.map((w) => ({ ...w, minimized: true })),
    }

    const reopened = reducer(minimized, { type: 'OPEN_WINDOW', window: win })
    expect(reopened.windows).toHaveLength(1)
    expect(reopened.windows[0].minimized).toBe(false)
    expect(reopened.activeWindowId).toBe('internetExplorer')
  })

  it('routes setup safety crashes through reboot into safety training before returning to desktop', () => {
    const crash = {
      title: 'Windows protection error',
      message: 'Simulated setup failure.',
      detail: 'No real files were touched.',
      stopCode: '0E : 0028 : C0DEF00D',
      crashedAt: '06/22/2026 5:00 PM',
    }
    const initial = {
      ...baseState(),
      phase: 'desktop',
      bootTarget: 'normal',
      bootMode: 'normal',
      bootProfile: 'warm',
      fs: createInitialFsState(),
      messageBoxes: [],
      clipboard: null,
      pendingSafetyTraining: false,
    } as OsState

    const crashed = reducer(initial, { type: 'START_SAFETY_TRAINING_CRASH', crash })
    expect(crashed.phase).toBe('crashed')
    expect(crashed.pendingSafetyTraining).toBe(true)

    const rebooting = reducer(crashed, { type: 'RESTART', target: 'normal', bootProfile: 'warm' })
    const training = reducer(rebooting, { type: 'FINISH_BOOT' })
    expect(training.phase).toBe('safetyTraining')
    expect(training.pendingSafetyTraining).toBe(false)

    const desktop = reducer(training, { type: 'COMPLETE_SAFETY_TRAINING' })
    expect(desktop.phase).toBe('desktop')
  })
})

describe('BIOS settings helpers', () => {
  it('filters disabled boot devices and formats the boot sequence', () => {
    const settings = {
      ...defaultBiosSettings,
      cdromEnabled: false,
      bootOrder: ['cdrom', 'floppy', 'hardDisk', 'network'] as BootDeviceId[],
    }

    expect(enabledBootDevices(settings)).toEqual(['floppy', 'hardDisk'])
    expect(bootSequenceLabel(settings)).toBe('CDROM, A, C, LAN')
  })

  it('moves boot devices without dropping the remaining sequence', () => {
    expect(moveBootDevice(defaultBiosSettings.bootOrder, 'floppy', -1)).toEqual([
      'hardDisk',
      'floppy',
      'cdrom',
      'network',
    ])
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
    // Repairs are no longer applied inline; confirming the prompt stages a restore
    // that the next restart applies.
    expect(restored.prompt?.onConfirm.effects?.[0]?.type).toBe('stageRestore')
  })

  it('reports classic disk utilities without mutating the virtual disk', () => {
    const fs = createInitialFsState()
    const ctx = { cwd: 'C:\\Windows\\System32', fs, network: defaultNetworkState, bootMode: 'normal' as const, dosOnly: false }
    expect(executeCommand('attrib kernel32.dll', ctx).lines.join('\n')).toContain('kernel32.dll')
    expect(executeCommand('chkdsk', ctx).lines.join('\n')).toContain('FAT16')
    expect(executeCommand('format c:', ctx).lines.join('\n')).toContain('Command prompt only')
    expect(executeCommand('winver', ctx).lines.join('\n')).toContain('Portfolio Shell')
  })

  it('opens the local setup safety lesson from the command prompt only', () => {
    const fs = createInitialFsState()
    const ctx = { cwd: 'C:\\', fs, network: defaultNetworkState, bootMode: 'normal' as const, dosOnly: false }

    expect(executeCommand('testdontouch.exe', ctx).effects).toEqual([{ type: 'openApp', appId: 'setupSafety' }])
    expect(executeCommand('testdontouch', ctx).effects).toEqual([{ type: 'openApp', appId: 'setupSafety' }])
  })

  it('guards terminal del of protected system paths behind /Y', () => {
    const fs = createInitialFsState()
    const ctx = { cwd: 'C:\\', fs, network: defaultNetworkState, bootMode: 'normal' as const, dosOnly: false }

    // Without /Y the command warns and changes nothing.
    const blocked = executeCommand('del C:\\Windows\\System32', ctx)
    expect(blocked.lines.join('\n')).toContain('WARNING')
    expect(blocked.effects).toBeUndefined()
    expect(getNode(fs, 'C:\\Windows\\System32')).toBeTruthy()

    // With /Y it deletes the subtree and triggers the recovery crash.
    const confirmed = executeCommand('del C:\\Windows\\System32 /Y', ctx)
    expect(confirmed.effects?.some((effect) => effect.type === 'setFs')).toBe(true)
    expect(confirmed.effects?.some((effect) => effect.type === 'crash')).toBe(true)
  })

  it('fails network commands when the simulated network driver is missing', () => {
    const fs = createInitialFsState()
    const deleted = deleteNode(fs, 'C:\\Windows\\System32\\Drivers\\ndis.vxd')
    const ctx = { cwd: 'C:\\', fs: deleted.fs, network: defaultNetworkState, bootMode: 'normal' as const, dosOnly: false }

    expect(executeCommand('ping google.com', ctx).lines.join('\n')).toContain('ERR_DRIVER_NETWORK_MISSING')

    const renewed = executeCommand('ipconfig /renew', ctx)
    expect(renewed.lines.join('\n')).toContain('ERR_DRIVER_NETWORK_MISSING')
    expect(renewed.effects?.[0]).toMatchObject({ type: 'setNetwork' })

    expect(executeCommand('ipconfig /all', ctx).lines.join('\n')).toContain('Simulated network driver missing')
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

describe('wordpad formatting helpers', () => {
  it('serializes and reloads multi-page WordPad documents', () => {
    const pages = ['<div>Page one</div>', '<div>Page two</div>']
    const saved = wordPadPagesToDocumentHtml(pages)

    expect(saved).toContain(WORDPAD_PAGE_BREAK_TOKEN)
    expect(wordPadContentToPages(saved)).toEqual(pages)
    expect(wordPadContentToPages(undefined)).toEqual([EMPTY_WORDPAD_PAGE_HTML])
    expect(wordPadContentToPages('Plain\nText')).toEqual(['Plain<br>Text'])
  })

  it('wraps selected text with real inline font, size, and color styles', async () => {
    const { JSDOM } = await import('jsdom')
    const dom = new JSDOM('<div id="editor">Hello world</div>')
    const document = dom.window.document
    const editor = document.getElementById('editor') as HTMLElement
    const range = document.createRange()
    range.setStart(editor.firstChild as Text, 0)
    range.setEnd(editor.firstChild as Text, 5)

    const nextRange = applyWordPadInlineStyle(editor, range, {
      color: '#ff0000',
      fontFamily: 'Georgia',
      fontSize: '18pt',
    })
    const span = editor.querySelector('span') as HTMLSpanElement

    expect(nextRange).not.toBeNull()
    expect(span.textContent).toBe('Hello')
    expect(span.style.color).toBe('rgb(255, 0, 0)')
    expect(span.style.fontFamily).toBe('Georgia')
    expect(span.style.fontSize).toBe('18pt')
  })

  it('creates a styled caret marker for future typing and strips it from saved html', async () => {
    const { JSDOM } = await import('jsdom')
    const dom = new JSDOM('<div id="editor">Hello</div>')
    const document = dom.window.document
    const editor = document.getElementById('editor') as HTMLElement
    const range = document.createRange()
    range.setStart(editor.firstChild as Text, 5)
    range.collapse(true)

    const nextRange = applyWordPadInlineStyle(editor, range, { fontFamily: 'Courier New' })
    const span = editor.querySelector('span') as HTMLSpanElement

    expect(nextRange).not.toBeNull()
    expect(span.textContent).toBe(WORDPAD_FORMAT_MARKER)
    expect(span.style.fontFamily.replaceAll('"', '')).toBe('Courier New')
    expect(cleanWordPadHtml(editor.innerHTML)).not.toContain(WORDPAD_FORMAT_MARKER)
  })
})
