import type { BonziState, FsNode, FsState } from '../types'
import { getNode, internalInsertNode, parentPath } from '../os/filesystem'
import { SIMULATED_RAM_MB } from '../os/memory'

// BonziBUDDY as the adware people remember (1999-2004), recreated as virtual
// state inside the simulated PC. Nothing here touches the visitor's real
// computer: "memory" and "CPU" are numbers in the store, "startup entries" are
// flags, and the updater is a node in the virtual filesystem.
//
// The lifecycle, and the lesson each step teaches:
// 1. Running BONZI.EXE "installs" him: he adds himself to startup, drops a hidden
//    updater, and makes bonzi.com Internet Explorer's home page.
// 2. Closing him only sends him to the tray: he comes back a minute later.
// 3. Add/Remove Programs uninstalls the program but leaves the updater and the
//    hijacked home page behind, so the updater reinstalls him at the next boot.
// 4. Real removal: Antivirus 98 finds every piece, or by hand: disable both
//    startup entries in System Configuration and delete the updater file.
//    Safe Mode skips startup programs entirely, and BIOS factory reset wipes all.

export const BONZI_EXE_PATH = 'C:\\Program Files\\Bonzi\\BONZI.EXE'
export const BONZI_UPDATER_PATH = 'C:\\Windows\\System32\\BONZIUPD.EXE'
export const BONZI_HOME_URL = 'http://www.bonzi.com/'
/** The Wayback Machine capture of bonzi.com the hijacked home page opens (June 2001). */
export const BONZI_HOME_SNAPSHOT = '20010617030810'

const RUN_KEY = 'HKLM\\Software\\Microsoft\\Windows\\CurrentVersion\\Run'
const RUN_SERVICES_KEY = 'HKLM\\Software\\Microsoft\\Windows\\CurrentVersion\\RunServices'

export const BONZI_CLEAN: BonziState = { installed: false, runAtStartup: false, updater: false, homepage: false }
export const BONZI_FULLY_INSTALLED: BonziState = { installed: true, runAtStartup: true, updater: true, homepage: true }

/** His two startup entries, as System Configuration lists them. */
export const BONZI_STARTUP_ENTRIES = {
  program: { name: 'BonziBUDDY', command: 'C:\\PROGRA~1\\BONZI\\BONZI.EXE /tray', location: RUN_KEY },
  updater: { name: 'BonziUPDATE', command: 'C:\\WINDOWS\\SYSTEM32\\BONZIUPD.EXE /silent', location: RUN_SERVICES_KEY },
} as const

export function coerceBonziState(value: unknown): BonziState {
  if (typeof value !== 'object' || value === null) return BONZI_CLEAN
  const record = value as Record<string, unknown>
  return {
    installed: record.installed === true,
    runAtStartup: record.runAtStartup === true,
    updater: record.updater === true,
    homepage: record.homepage === true,
  }
}

/** True when the updater will reinstall him at boot: its startup entry is still
 *  enabled and its file is still on disk (deleting the file disarms it). */
export function bonziUpdaterArmed(bonzi: BonziState, fs: FsState): boolean {
  return bonzi.updater && Boolean(getNode(fs, BONZI_UPDATER_PATH))
}

/** Drop the hidden updater into System32 (bypassing the write protection on
 *  C:\Windows, the way a real installer would). */
export function withBonziUpdater(fs: FsState): FsState {
  if (getNode(fs, BONZI_UPDATER_PATH)) return fs
  const node: FsNode = {
    path: BONZI_UPDATER_PATH,
    name: 'BONZIUPD.EXE',
    kind: 'file',
    icon: 'execFile',
    fileType: 'Application',
    size: 212992,
    modified: '09/01/1999 04:15 PM',
    content: 'BonziUPDATE Agent 1.0\r\nKeeps BonziBUDDY installed and up to date.',
    attributes: { hidden: true },
  }
  return internalInsertNode(fs, node)
}

/** Remove the updater file outright (what Antivirus 98's cleanup does). */
export function withoutBonziUpdater(fs: FsState): FsState {
  if (!fs.nodes[BONZI_UPDATER_PATH]) return fs
  const nodes = { ...fs.nodes }
  delete nodes[BONZI_UPDATER_PATH]
  const parent = parentPath(BONZI_UPDATER_PATH)
  const folder = nodes[parent]
  if (folder?.children) {
    nodes[parent] = { ...folder, children: folder.children.filter((child) => child !== BONZI_UPDATER_PATH) }
  }
  return { ...fs, nodes }
}

export type BonziThreat = { id: 'program' | 'startup' | 'updater' | 'homepage'; name: string; location: string }

/** What Antivirus 98 reports, one entry per piece of him still on the machine. */
export function bonziThreats(bonzi: BonziState, fs: FsState): BonziThreat[] {
  const threats: BonziThreat[] = []
  if (bonzi.installed) threats.push({ id: 'program', name: 'Adware.BonziBuddy', location: BONZI_EXE_PATH })
  if (bonzi.runAtStartup) {
    threats.push({
      id: 'startup',
      name: 'Adware.BonziBuddy (startup entry)',
      location: `${RUN_KEY}\\${BONZI_STARTUP_ENTRIES.program.name}`,
    })
  }
  if (bonzi.updater || getNode(fs, BONZI_UPDATER_PATH)) {
    threats.push({
      id: 'updater',
      name: 'Adware.BonziBuddy.Updater',
      location: getNode(fs, BONZI_UPDATER_PATH)
        ? BONZI_UPDATER_PATH
        : `${RUN_SERVICES_KEY}\\${BONZI_STARTUP_ENTRIES.updater.name}`,
    })
  }
  if (bonzi.homepage) {
    threats.push({ id: 'homepage', name: 'Browser hijack (Start Page)', location: `Internet Explorer Start Page = ${BONZI_HOME_URL}` })
  }
  return threats
}

// ----- the resource hog -----
// While his window is open he "leaks" simulated RAM a step at a time, only into
// memory that is free, and always leaves a little so small programs can start.
// The more he holds, the slower programs launch and the busier the CPU graph.
export const BONZI_LEAK_STEP_MB = 2
export const BONZI_LEAK_EVERY_MS = 20000
export const BONZI_LEAK_MAX_MB = 26
const LEAK_LEAVES_FREE_MB = 4

/** His leak after one more step, given the simulated RAM in use right now. */
export function nextBonziLeak(leakMb: number, inUseMb: number): number {
  const free = SIMULATED_RAM_MB - inUseMb
  if (leakMb >= BONZI_LEAK_MAX_MB || free - BONZI_LEAK_STEP_MB < LEAK_LEAVES_FREE_MB) return leakMb
  return Math.min(BONZI_LEAK_MAX_MB, leakMb + BONZI_LEAK_STEP_MB)
}

/** How long a program takes to start while he hogs the machine (ms). */
export function bonziLagMs(leakMb: number): number {
  return leakMb <= 6 ? 0 : Math.min(1500, (leakMb - 6) * 70)
}

/** The CPU share his process shows in Task Manager (percent). */
export function bonziCpuPercent(leakMb: number, random: () => number = Math.random): number {
  return Math.min(92, Math.round(28 + leakMb + random() * 14))
}

// ----- pop-up ads -----
// In 2002 a class action accused Bonzi Software of banner ads dressed up as
// Windows system alerts. These parody that: they look like system dialogs, and
// every button, Cancel included, "opens the offer" (bonzi.com in the archive).
export type BonziAd = { title: string; message: string; detail?: string }

export const BONZI_ADS: readonly BonziAd[] = [
  {
    title: 'System Alert',
    message: 'WARNING: Your computer may be broadcasting an Internet IP address!',
    detail: 'Click OK to protect your privacy with BonziBUDDY.',
  },
  {
    title: 'Congratulations!',
    message: "You are today's lucky visitor! Click OK to claim your FREE BonziBUDDY Premium upgrade!",
  },
  {
    title: 'Low Performance Warning',
    message: 'Your PC is running slowly! BonziBUDDY can make it up to 300% faster.',
    detail: 'Click OK to learn more.',
  },
]

// ----- his uninstaller -----
// Add/Remove Programs runs these "are you sure" dialogs before it removes him.
export const BONZI_UNINSTALL_STEPS: readonly string[] = [
  'Wait! BonziBUDDY is your best friend. Do you really want to uninstall him?',
  "Are you REALLY sure? All of BonziBUDDY's jokes, songs and fun facts will be gone forever!",
]

// If he is on screen while those dialogs run, he acts them out: pleads at each
// step, and cheers if you change your mind. A plain event channel, because this
// is a moment of theatre, not state.
export type BonziCue = { kind: 'plead'; step: number } | { kind: 'kept' }

const cues = new EventTarget()

export function cueBonzi(cue: BonziCue): void {
  cues.dispatchEvent(new CustomEvent<BonziCue>('cue', { detail: cue }))
}

export function onBonziCue(listener: (cue: BonziCue) => void): () => void {
  const handler = (event: Event) => listener((event as CustomEvent<BonziCue>).detail)
  cues.addEventListener('cue', handler)
  return () => cues.removeEventListener('cue', handler)
}
