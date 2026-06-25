import type { AppId, BootMode, DriverType, FsState, NetworkState, WindowPayload } from '../types'
import {
  baseName,
  copyNode,
  createFile,
  createFolder,
  deleteNode,
  extensionOf,
  getNode,
  isCriticalPath,
  isProtectedPath,
  listDirectory,
  moveNode,
  normalizePath,
  openTargetFor,
  parentPath,
  renameNode,
  resolvePath,
} from './filesystem'
import { createInitialFsState } from '../data/initialFilesystem'
import { osProductName } from '../data/system'
import { pingReport, randomDhcpLease, releasedNetworkState, resolveHostIp } from './network'
import { missingSystemFilePackages, missingSystemFiles, scanregLines } from './recovery'
import { isSystem32Wiped } from './systemFiles'
import {
  driverDeviceLabels,
  driverErrorCodes,
  driverHealthy,
  driverRecoveryHint,
  missingDriverFiles,
} from './systemHealth'

export type CommandEffect =
  | { type: 'openApp'; appId: AppId; payload?: WindowPayload }
  | { type: 'setFs'; fs: FsState }
  | { type: 'crash'; criticalPath: string }
  | { type: 'restart'; target: 'normal' | 'safe' | 'dos' | 'recovery' | 'bootMenu' }
  | { type: 'networkPing'; sent: number; received: number }
  | { type: 'setNetwork'; network: NetworkState }
  | { type: 'stageRestore' } // schedule a protected-file restore that applies on next restart
  | { type: 'exitWindow' } // 'exit' closes the terminal window / leaves dosOnly to bootMenu

// A command can hand the terminal an interactive Y/N prompt that runs AFTER its
// immediate lines + stream finish (e.g. SFC asking to restore). The terminal waits
// for the next Enter and resolves to onConfirm / onDecline.
export type TerminalPrompt = {
  question: string
  onConfirm: { lines: string[]; effects?: CommandEffect[] }
  onDecline: { lines: string[] }
}

export type CommandContext = {
  cwd: string
  fs: FsState
  network: NetworkState
  bootMode: BootMode
  dosOnly: boolean // true when running in Command-Prompt-Only boot
}

export type CommandOutput = {
  lines: string[] // immediate output lines
  newCwd?: string
  clear?: boolean
  effects?: CommandEffect[]
  stream?: Array<{ delayMs: number; lines: string[]; effects?: CommandEffect[] }>
  prompt?: TerminalPrompt // interactive Y/N asked after lines + stream finish
}

// Taglish note: command processor is pure-ish. It returns text + effects, then
// TerminalApp/store ang bahala mag-open app, update fs/network, or crash system.
const BAD_COMMAND = 'Bad command or file name'
const VOLUME_LABEL = 'PORTFOLIO'
const VOLUME_SERIAL = '1998-0612'
const FREE_BYTES = 261_562_368

function driverMissingCommandLines(type: DriverType, feature: string, missing: string[] = []): string[] {
  const missingNames = missing.length ? missing.map(baseName).join(', ') : 'driver package'
  return [
    driverErrorCodes[type],
    `${feature} is unavailable because the simulated ${driverDeviceLabels[type].toLowerCase()} driver is missing.`,
    `Missing: ${missingNames}`,
    driverRecoveryHint(type),
  ]
}

// ---------------------------------------------------------------------------
// Parsing
// ---------------------------------------------------------------------------

function tokenize(input: string): string[] {
  const tokens: string[] = []
  let current = ''
  let inQuotes = false
  let sawAny = false
  for (const ch of input) {
    if (ch === '"') {
      inQuotes = !inQuotes
      sawAny = true
      continue
    }
    if (!inQuotes && /\s/.test(ch)) {
      if (sawAny) {
        tokens.push(current)
        current = ''
        sawAny = false
      }
      continue
    }
    current += ch
    sawAny = true
  }
  if (sawAny) {
    tokens.push(current)
  }
  return tokens
}

function num(value: number): string {
  return value.toLocaleString('en-US')
}

/** '06/12/2026 12:05 AM' -> '06-12-26 12:05a' */
function dirDate(stamp: string): string {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2})\s+(AM|PM)$/.exec(stamp)
  if (!match) {
    return stamp
  }
  const [, mm, dd, yyyy, hh, min, suffix] = match
  return `${mm}-${dd}-${yyyy.slice(2)}  ${hh}:${min}${suffix === 'AM' ? 'a' : 'p'}`
}

function shortNameParts(name: string): { stem: string; ext: string } {
  const ext = extensionOf(name)
  const rawStem = ext ? name.slice(0, name.length - ext.length - 1) : name
  const clean = (value: string) => value.replace(/[^A-Za-z0-9_$~!#%&\-{}()@'`]/g, '').toUpperCase()
  let stem = clean(rawStem)
  if (!stem) stem = '_'
  if (stem.length > 8) {
    stem = `${stem.slice(0, 6)}~1`
  }
  return { stem, ext: clean(ext).slice(0, 3) }
}

// ---------------------------------------------------------------------------
// Individual commands
// ---------------------------------------------------------------------------

function dirCommand(args: string[], ctx: CommandContext): CommandOutput {
  const wide = args.some((arg) => arg.toLowerCase() === '/w')
  const pathArg = args.find((arg) => !arg.startsWith('/'))
  const resolved = resolvePath(ctx.cwd, pathArg ?? '.')
  const node = getNode(ctx.fs, resolved)
  const target = node?.path ?? resolved

  const header = [
    ` Volume in drive C is ${VOLUME_LABEL}`,
    ` Volume Serial Number is ${VOLUME_SERIAL}`,
    ` Directory of ${target}`,
    '',
  ]

  if (!node) {
    return { lines: [...header, 'File not found'] }
  }

  const entries = node.kind === 'folder' ? listDirectory(ctx.fs, target) : [node]
  const isRoot = /^[A-Z]:\\$/.test(target)

  let fileCount = 0
  let dirCount = 0
  let totalBytes = 0
  const lines: string[] = [...header]

  if (wide) {
    const cells: string[] = []
    if (node.kind === 'folder' && !isRoot) {
      cells.push('[.]', '[..]')
      dirCount += 2
    }
    for (const entry of entries) {
      if (entry.kind === 'folder') {
        cells.push(`[${entry.name}]`)
        dirCount += 1
      } else {
        cells.push(entry.name)
        fileCount += 1
        totalBytes += entry.size
      }
    }
    for (let i = 0; i < cells.length; i += 4) {
      lines.push(cells.slice(i, i + 4).map((cell) => cell.padEnd(18)).join('').trimEnd())
    }
  } else {
    const row = (stem: string, ext: string, sizeCol: string, stamp: string, longName: string) =>
      `${stem.padEnd(8)} ${ext.padEnd(3)} ${sizeCol}  ${dirDate(stamp)}  ${longName}`
    if (node.kind === 'folder' && !isRoot) {
      lines.push(row('.', '', '<DIR>'.padEnd(14), node.modified, '.'))
      lines.push(row('..', '', '<DIR>'.padEnd(14), node.modified, '..'))
      dirCount += 2
    }
    for (const entry of entries) {
      const { stem, ext } = shortNameParts(entry.name)
      if (entry.kind === 'folder') {
        lines.push(row(stem, ext, '<DIR>'.padEnd(14), entry.modified, entry.name))
        dirCount += 1
      } else {
        lines.push(row(stem, ext, num(entry.size).padStart(14), entry.modified, entry.name))
        fileCount += 1
        totalBytes += entry.size
      }
    }
  }

  lines.push(`${String(fileCount).padStart(10)} file(s)${num(totalBytes).padStart(15)} bytes`)
  lines.push(`${String(dirCount).padStart(10)} dir(s)${num(FREE_BYTES).padStart(16)} bytes free`)
  return { lines }
}

function treeCommand(args: string[], ctx: CommandContext): CommandOutput {
  const showFiles = args.some((arg) => arg.toLowerCase() === '/f')
  const pathArg = args.find((arg) => !arg.startsWith('/'))
  const resolved = resolvePath(ctx.cwd, pathArg ?? '.')
  const node = getNode(ctx.fs, resolved)
  if (!node || node.kind !== 'folder') {
    return { lines: [`Invalid path - ${resolved}`] }
  }
  const target = node.path

  const lines: string[] = [
    'Directory PATH listing',
    `Volume serial number is ${VOLUME_SERIAL}`,
    /^[A-Z]:\\$/.test(target) ? `${target.slice(0, 2)}.` : target,
  ]

  function walk(folderPath: string, prefix: string) {
    const children = listDirectory(ctx.fs, folderPath)
    const folders = children.filter((child) => child.kind === 'folder')
    const files = showFiles ? children.filter((child) => child.kind === 'file') : []
    for (const file of files) {
      lines.push(`${prefix}    ${file.name}`)
    }
    folders.forEach((folder, index) => {
      const last = index === folders.length - 1
      lines.push(`${prefix}+---${folder.name}`)
      walk(folder.path, `${prefix}${last ? '    ' : '|   '}`)
    })
  }

  walk(target, '')
  return { lines }
}

function helpCommand(): CommandOutput {
  const rows: Array<[string, string]> = [
    ['ATTRIB', 'Displays file attributes.'],
    ['CD', 'Displays the name of or changes the current directory.'],
    ['CHKDSK', 'Checks a disk and displays a status report.'],
    ['CLS', 'Clears the screen.'],
    ['COPY', 'Copies one or more files to another location.'],
    ['DATE', 'Displays the date.'],
    ['DEL', 'Deletes one or more files.'],
    ['DIR', 'Displays a list of files and subdirectories in a directory.'],
    ['ECHO', 'Displays messages.'],
    ['EXIT', 'Quits the COMMAND.COM program (command interpreter).'],
    ['HELP', 'Provides help information for Windows 98 commands.'],
    ['IPCONFIG', 'Displays the TCP/IP configuration (/all /release /renew).'],
    ['MD', 'Creates a directory.'],
    ['MEM', 'Displays the amount of used and free memory in your system.'],
    ['MOVE', 'Moves files and renames files and directories.'],
    ['PING', 'Sends ICMP echo requests to a network host.'],
    ['RD', 'Removes (deletes) a directory.'],
    ['REN', 'Renames a file or files.'],
    ['SCANREG', 'Scans and restores the system registry (/restore).'],
    ['SCANDISK', 'Checks the virtual hard disk for errors.'],
    ['SCANDSKW', 'Opens the ScanDisk graphical tool.'],
    ['DEFRAG', 'Opens Disk Defragmenter to optimize the virtual disk.'],
    ['SFC', 'Scans protected system files (/scannow).'],
    ['START', 'Starts a program, document, or folder window.'],
    ['TIME', 'Displays the time.'],
    ['TREE', 'Graphically displays the folder structure of a drive or path.'],
    ['TYPE', 'Displays the contents of a text file.'],
    ['VER', 'Displays the Windows version.'],
    ['WINVER', 'Displays Windows version information.'],
    ['WIN', 'Starts Windows from the MS-DOS prompt.'],
    ['SHUTDOWN', 'Shuts down and restarts the computer.'],
  ]
  return {
    lines: [
      'For more information on a specific command, type the command followed by /?',
      '',
      ...rows.map(([name, description]) => `${name.padEnd(10)}${description}`),
    ],
  }
}

function memCommand(): CommandOutput {
  return {
    lines: [
      'Memory Type        Total      Used       Free',
      '----------------  --------   --------   --------',
      'Conventional           640K        38K       602K',
      'Upper                  155K       155K         0K',
      'Reserved               384K       384K         0K',
      'Extended (XMS)      64,512K     2,348K    62,164K',
      '----------------  --------   --------   --------',
      'Total memory        65,536K     2,925K    62,611K',
      '',
      'Total under 1 MB        795K       193K       602K',
      '',
      'Largest executable program size       602K (616,448 bytes)',
      'Largest free upper memory block         0K       (0 bytes)',
      'MS-DOS is resident in the high memory area.',
    ],
  }
}

function attributeFlags(nodePath: string, ctx: CommandContext): string {
  const node = getNode(ctx.fs, nodePath)
  if (!node) return '    '
  return [
    node.attributes?.readOnly ? 'R' : ' ',
    node.attributes?.hidden ? 'H' : ' ',
    node.attributes?.system ? 'S' : ' ',
    node.kind === 'folder' ? ' ' : 'A',
  ].join('')
}

function attribCommand(args: string[], ctx: CommandContext): CommandOutput {
  const pathArg = args.find((arg) => !arg.startsWith('+') && !arg.startsWith('-'))
  const target = resolvePath(ctx.cwd, pathArg ?? '.')
  const node = getNode(ctx.fs, target)
  if (!node) {
    return { lines: ['File not found'] }
  }
  const targets = node.kind === 'folder' ? listDirectory(ctx.fs, node.path) : [node]
  return {
    lines: targets.map((entry) => `${attributeFlags(entry.path, ctx)}     ${entry.path}`),
  }
}

function diskStats(ctx: CommandContext): { files: number; folders: number; bytes: number } {
  return Object.values(ctx.fs.nodes).reduce(
    (total, node) => ({
      files: total.files + (node.kind === 'file' ? 1 : 0),
      folders: total.folders + (node.kind === 'folder' ? 1 : 0),
      bytes: total.bytes + (node.kind === 'file' ? node.size : 0),
    }),
    { files: 0, folders: 0, bytes: 0 },
  )
}

function chkdskCommand(ctx: CommandContext): CommandOutput {
  const stats = diskStats(ctx)
  return {
    lines: [
      'The type of the file system is FAT16.',
      `Volume ${VOLUME_LABEL} created 06-13-2026`,
      `Volume Serial Number is ${VOLUME_SERIAL}`,
      '',
      'Windows is verifying files and folders...',
      `${stats.files.toLocaleString()} file(s) checked.`,
      `${stats.folders.toLocaleString()} folder(s) checked.`,
      '',
      `${num(stats.bytes).padStart(12)} bytes in user files`,
      `${num(FREE_BYTES).padStart(12)} bytes available on disk`,
      '',
      'No lost allocation units found.',
    ],
  }
}

function scandiskCommand(ctx: CommandContext): CommandOutput {
  const missing = missingSystemFiles(ctx.fs)
  return {
    lines: ['ScanDisk is now checking drive C:', ''],
    stream: [
      { delayMs: 500, lines: ['Checking file allocation tables... OK'] },
      { delayMs: 650, lines: ['Checking folders... OK'] },
      { delayMs: 700, lines: ['Checking free space... OK'] },
      {
        delayMs: 700,
        lines: missing.length
          ? ['ScanDisk found Windows system file problems.', ...missing.map((path) => `  Missing: ${path}`)]
          : ['ScanDisk did not find any problems on drive C:.'],
      },
    ],
  }
}

// The classic install tools (FORMAT / SYS / SETUP) are the "boot media" recovery
// path. They only run from the Command-Prompt-Only boot, mirroring booting from a
// Win98 startup disk, and rebuild the disk from the canonical seed. This is the
// only way back once System32 has been wiped (Recovery Mode refuses then).
function bootMediaRequired(ctx: CommandContext): CommandOutput | null {
  if (!ctx.dosOnly) {
    return {
      lines: [
        'This command is only available from the Command-Prompt-Only boot.',
        'Restart, press F8 during boot, then choose "Command prompt only".',
      ],
    }
  }
  return null
}

function blankDiskFs(): FsState {
  const seed = createInitialFsState()
  const root = seed.nodes['C:\\']
  return { nodes: { 'C:\\': { ...root, children: [] } }, recycle: [] }
}

function formatCommand(args: string[], ctx: CommandContext): CommandOutput {
  const drive = (args[0] ?? '').toUpperCase().replace(/:$/, '')
  if (!drive) {
    return { lines: ['Required parameter missing', 'Usage: FORMAT drive:'] }
  }
  if (drive !== 'C') {
    return { lines: [`Cannot format drive ${drive}: - no such drive in the portfolio OS.`] }
  }
  const guard = bootMediaRequired(ctx)
  if (guard) return guard
  return {
    lines: ['WARNING, ALL DATA ON NON-REMOVABLE DISK', 'DRIVE C: WILL BE LOST!', ''],
    stream: [
      { delayMs: 700, lines: ['Formatting 2,047.00M'] },
      { delayMs: 900, lines: ['Format complete.', ''] },
      {
        delayMs: 600,
        lines: ['Volume label is PORTFOLIO', '', 'C: is now empty. Type SYS C: then SETUP to reinstall Windows 98.'],
        effects: [{ type: 'setFs', fs: blankDiskFs() }],
      },
    ],
  }
}

function sysCommand(args: string[], ctx: CommandContext): CommandOutput {
  const drive = (args[0] ?? '').toUpperCase().replace(/:$/, '')
  if (drive !== 'C') {
    return { lines: ['Usage: SYS C:'] }
  }
  const guard = bootMediaRequired(ctx)
  if (guard) return guard
  let fs = ctx.fs
  for (const name of ['IO.SYS', 'MSDOS.SYS', 'COMMAND.COM']) {
    if (!getNode(fs, `C:\\${name}`)) {
      const result = createFile(fs, 'C:\\', name, { content: `; ${name} - simulated Windows 98 boot file` })
      if (!result.error) fs = result.fs
    }
  }
  return {
    lines: ['Transferring system files to C:...'],
    stream: [
      {
        delayMs: 800,
        lines: ['System transferred.', 'C: is now bootable. Type SETUP to install Windows 98.'],
        effects: [{ type: 'setFs', fs }],
      },
    ],
  }
}

function setupCommand(ctx: CommandContext): CommandOutput {
  const guard = bootMediaRequired(ctx)
  if (guard) return guard
  return {
    lines: ['Microsoft Windows 98 Setup', osProductName, ''],
    stream: [
      { delayMs: 700, lines: ['Preparing Setup... checking your system.'] },
      { delayMs: 700, lines: ['Scanning hardware and creating the installation database...'] },
      { delayMs: 800, lines: ['Copying Windows files: KERNEL32.DLL USER32.DLL GDI32.DLL .......  12%'] },
      { delayMs: 800, lines: ['Copying Windows files: SHELL32.DLL COMCTL32.DLL OLE32.DLL ......  28%'] },
      { delayMs: 800, lines: ['Copying Windows files: System32 drivers (VxD, .SYS, .DRV) ......  44%'] },
      { delayMs: 800, lines: ['Copying Windows files: Internet Explorer + HTML engine .........  61%'] },
      { delayMs: 800, lines: ['Copying Windows files: Control Panel, Fonts, Media .............  78%'] },
      { delayMs: 800, lines: ['Copying Windows files: registry hives and shell .............  92%'] },
      { delayMs: 700, lines: ['Updating system settings ...'] },
      { delayMs: 700, lines: ['Building the registry and finishing Setup ... 100%'] },
      {
        delayMs: 900,
        lines: ['', 'Setup is complete.', 'Type WIN, or restart, to start Windows 98.'],
        effects: [{ type: 'setFs', fs: createInitialFsState() }],
      },
    ],
  }
}

function winverCommand(): CommandOutput {
  return {
    lines: [
      '',
      osProductName,
      'Version 4.10.1998 Portfolio Shell',
      'Copyright (C) John Erick Mendoza 2026',
      '',
    ],
  }
}

function pingCommand(args: string[], ctx: CommandContext): CommandOutput {
  const host = args.find((arg) => !arg.startsWith('/') && !arg.startsWith('-'))
  if (!host) {
    return {
      lines: [
        'Usage: ping <host>',
        '',
        'Known hosts on this network include portfolio.local, localhost,',
        'google.com, youtube.com and github.com.',
      ],
    }
  }
  if (!driverHealthy(ctx.fs, 'network')) {
    return { lines: driverMissingCommandLines('network', 'PING', missingDriverFiles(ctx.fs, 'network')) }
  }
  const report = pingReport(host, ctx.network)
  const ip = resolveHostIp(host, ctx.network)
  if (!ip) {
    return { lines: report.lines[0] ?? [`Unknown host ${host}.`] }
  }
  const received = report.success ? 4 : 0
  const stream = report.lines.map((lines, index) => ({
    delayMs: 600,
    lines,
    effects:
      index === report.lines.length - 1
        ? ([{ type: 'networkPing', sent: 4, received } satisfies CommandEffect])
        : undefined,
  }))
  return {
    lines: [`Pinging ${host.toLowerCase()} [${ip}] with 32 bytes of data:`, ''],
    stream,
  }
}

function ipconfigLines(network: NetworkState, all: boolean, networkDriverMissing = false): string[] {
  const lines = ['', 'Windows 98 IP Configuration', '']
  if (all) {
    lines.push(
      `        Host Name . . . . . . . . . : portfolio98`,
      `        DNS Servers . . . . . . . . : ${network.dns || 'none'}`,
      '        Node Type . . . . . . . . . : Broadcast',
      '        IP Routing Enabled. . . . . : No',
      '',
    )
  }
  lines.push('0 Ethernet adapter :', '')
  if (all) {
    lines.push(
      `        Description . . . . . . . . : ${network.adapterName}`,
      `        Physical Address. . . . . . : ${network.macAddress}`,
      `        DHCP Enabled. . . . . . . . : ${network.dhcp ? 'Yes' : 'No'}`,
    )
  }
  if (networkDriverMissing) {
    lines.push(
      '        Media State . . . . . . . . : Media disconnected',
      '        Driver State. . . . . . . . : Simulated network driver missing',
    )
    return lines
  }
  lines.push(
    `        IP Address. . . . . . . . . : ${network.ipAddress}`,
    `        Subnet Mask . . . . . . . . : ${network.subnetMask}`,
    `        Default Gateway . . . . . . : ${network.gateway}`,
  )
  if (all && network.connectedSince) {
    lines.push(`        Lease Obtained. . . . . . . : ${network.connectedSince}`)
  }
  return lines
}

function ipconfigCommand(args: string[], ctx: CommandContext): CommandOutput {
  const flag = args.find((arg) => arg.startsWith('/'))?.toLowerCase()
  if (flag === '/release') {
    const released = releasedNetworkState()
    return {
      lines: ['', `IP address successfully released for adapter "${ctx.network.adapterName}".`],
      effects: [{ type: 'setNetwork', network: released }],
    }
  }
  if (!driverHealthy(ctx.fs, 'network')) {
    const released = releasedNetworkState()
    if (flag === '/renew') {
      return {
        lines: driverMissingCommandLines('network', 'IPCONFIG /RENEW', missingDriverFiles(ctx.fs, 'network')),
        effects: [{ type: 'setNetwork', network: released }],
      }
    }
    if (flag && flag !== '/all') {
      return { lines: [`Unknown option: ${flag}`, 'Usage: ipconfig [/all | /release | /renew]'] }
    }
    return { lines: ipconfigLines(released, flag === '/all', true) }
  }
  if (flag === '/renew') {
    const lease = randomDhcpLease()
    return {
      lines: ipconfigLines(lease, false),
      effects: [{ type: 'setNetwork', network: lease }],
    }
  }
  if (flag && flag !== '/all') {
    return { lines: [`Unknown option: ${flag}`, 'Usage: ipconfig [/all | /release | /renew]'] }
  }
  return { lines: ipconfigLines(ctx.network, flag === '/all') }
}

const RECOVERY_WIPED_LINES = [
  'The registry/system file cache could not be found.',
  'System32 has been removed, so this tool cannot restore it.',
  'Type SYS C: then SETUP to reinstall Windows 98 from scratch.',
]

// A restore is never applied inline anymore. The scan animates, lists what's
// missing, then the terminal asks Y/N; confirming STAGES the repair (stageRestore)
// which the next restart applies — so it survives navigation and "takes effect"
// on reboot like the real tools.
const RESTORE_STAGED_LINES = [
  'Repair scheduled.',
  'Restart your computer (type WIN, or use Start > Shut Down > Restart) for the changes to take effect.',
]
const RESTORE_DECLINED_LINES = ['No changes were made.']

function scanregCommand(args: string[], ctx: CommandContext): CommandOutput {
  if (isSystem32Wiped(ctx.fs)) {
    return { lines: ['Microsoft Registry Checker', '', ...RECOVERY_WIPED_LINES] }
  }
  const flag = args[0]?.toLowerCase()
  if (flag !== '/restore' && flag !== '/fix') {
    return { lines: scanregLines([]) }
  }
  const missing = missingSystemFilePackages(ctx.fs)
  const scan: NonNullable<CommandOutput['stream']> = [
    { delayMs: 600, lines: ['Scanning system registry...'] },
    { delayMs: 700, lines: ['Checking registry backups: rb000.cab rb001.cab rb002.cab'] },
    { delayMs: 800, lines: ['Validating protected file packages ... 70%'] },
    { delayMs: 700, lines: ['Validating protected file packages ... 100%', ''] },
  ]
  if (!missing.length) {
    return {
      lines: ['Microsoft Registry Checker', ''],
      stream: [...scan, { delayMs: 300, lines: ['No damaged or missing items were found.'] }],
    }
  }
  return {
    lines: ['Microsoft Registry Checker', ''],
    stream: [...scan, { delayMs: 300, lines: [`Found ${missing.length} damaged or missing item(s).`, ''] }],
    prompt: {
      question: `Restore ${missing.length} item(s) from backup? (Y/N)`,
      onConfirm: { lines: RESTORE_STAGED_LINES, effects: [{ type: 'stageRestore' }] },
      onDecline: { lines: RESTORE_DECLINED_LINES },
    },
  }
}

function sfcCommand(args: string[], ctx: CommandContext): CommandOutput {
  if (isSystem32Wiped(ctx.fs)) {
    return { lines: ['System File Checker', '', ...RECOVERY_WIPED_LINES] }
  }
  const flag = args[0]?.toLowerCase()
  if (flag !== '/scannow') {
    return { lines: ['Checks the integrity of protected system files.', '', 'Usage: sfc /scannow'] }
  }
  const missing = missingSystemFilePackages(ctx.fs)
  const scan: NonNullable<CommandOutput['stream']> = [
    { delayMs: 600, lines: ['Starting scan of all protected system files...'] },
    { delayMs: 700, lines: ['Verifying C:\\Windows\\System32 ............ 20%'] },
    { delayMs: 700, lines: ['Verifying device drivers ................. 45%'] },
    { delayMs: 700, lines: ['Verifying C:\\Windows\\Command ............ 65%'] },
    { delayMs: 700, lines: ['Verifying C:\\Windows core files .......... 85%'] },
    { delayMs: 800, lines: ['Verification 100% complete.', ''] },
  ]
  if (!missing.length) {
    return {
      lines: ['System File Checker', ''],
      stream: [...scan, { delayMs: 300, lines: ['Windows did not find any integrity violations.'] }],
    }
  }
  const list = missing.slice(0, 10).map((path) => `  MISSING   ${path}`)
  const extra = missing.length > 10 ? [`  ...and ${missing.length - 10} more file(s)`] : []
  return {
    lines: ['System File Checker', ''],
    stream: [...scan, { delayMs: 300, lines: [`Found ${missing.length} missing protected file(s):`, ...list, ...extra, ''] }],
    prompt: {
      question: `Restore ${missing.length} file(s) from the protected cache? (Y/N)`,
      onConfirm: { lines: RESTORE_STAGED_LINES, effects: [{ type: 'stageRestore' }] },
      onDecline: { lines: RESTORE_DECLINED_LINES },
    },
  }
}

const START_TARGETS: Record<string, AppId> = {
  notepad: 'notepad',
  'notepad.exe': 'notepad',
  pdfviewer: 'pdfViewer',
  'pdfviewer.exe': 'pdfViewer',
  acrord32: 'pdfViewer',
  'acrord32.exe': 'pdfViewer',
  mspaint: 'paint',
  'mspaint.exe': 'paint',
  paint: 'paint',
  kodakimg: 'imageViewer',
  'kodakimg.exe': 'imageViewer',
  imaging: 'imageViewer',
  iexplore: 'internetExplorer',
  'iexplore.exe': 'internetExplorer',
  calc: 'calculator',
  'calc.exe': 'calculator',
  explorer: 'explorer',
  'explorer.exe': 'explorer',
  mediaplayer: 'mediaPlayer',
  'mplayer.exe': 'mediaPlayer',
  vidplay: 'videoPlayer',
  'vidplay.exe': 'videoPlayer',
  videoplayer: 'videoPlayer',
  sndrec32: 'soundRecorder',
  'sndrec32.exe': 'soundRecorder',
  testdontouch: 'setupSafety',
  'testdontouch.exe': 'setupSafety',
  msinfo32: 'systemInfo',
  'msinfo32.exe': 'systemInfo',
  sysinfo: 'systemInfo',
  msconfig: 'msconfig',
  'msconfig.exe': 'msconfig',
  devmgmt: 'deviceManager',
  hwinfo: 'deviceManager',
  regedit: 'registryEditor',
  'regedit.exe': 'registryEditor',
  regedt32: 'registryEditor',
  registry: 'registryEditor',
  scandskw: 'scandisk',
  'scandskw.exe': 'scandisk',
  defrag: 'defrag',
  'defrag.exe': 'defrag',
  dfrg: 'defrag',
}

function dosModeBlocked(ctx: CommandContext): CommandOutput | null {
  if (ctx.dosOnly) {
    return { lines: ['This program cannot be run in DOS mode.', '', 'Type WIN to start Windows 98.'] }
  }
  return null
}

function startCommand(args: string[], ctx: CommandContext): CommandOutput {
  const blocked = dosModeBlocked(ctx)
  if (blocked) return blocked
  const target = args[0]
  if (!target) {
    return { lines: [], effects: [{ type: 'openApp', appId: 'explorer', payload: { path: ctx.cwd } }] }
  }
  const known = START_TARGETS[target.toLowerCase()]
  if (known) {
    return { lines: [], effects: [{ type: 'openApp', appId: known }] }
  }
  const path = resolvePath(ctx.cwd, target)
  const node = getNode(ctx.fs, path)
  if (node) {
    const openTarget = openTargetFor(node)
    if (openTarget) {
      return { lines: [], effects: [{ type: 'openApp', appId: openTarget.appId, payload: openTarget.payload }] }
    }
    return { lines: [`'${node.name}' is not a valid Win32 application.`] }
  }
  return { lines: [`Cannot find the file '${target}' (or one of its components).`] }
}

function appCommand(appId: AppId, fileArg: string | undefined, ctx: CommandContext): CommandOutput {
  const blocked = dosModeBlocked(ctx)
  if (blocked) return blocked
  if (fileArg) {
    const path = resolvePath(ctx.cwd, fileArg)
    const node = getNode(ctx.fs, path)
    if (node && node.kind === 'file') {
      return { lines: [], effects: [{ type: 'openApp', appId, payload: { filePath: path } }] }
    }
  }
  return { lines: [], effects: [{ type: 'openApp', appId }] }
}

// ---------------------------------------------------------------------------
// File operations
// ---------------------------------------------------------------------------

function cdCommand(arg: string | undefined, ctx: CommandContext): CommandOutput {
  if (!arg) {
    return { lines: [ctx.cwd] }
  }
  const target = resolvePath(ctx.cwd, arg)
  const node = getNode(ctx.fs, target)
  if (!node || node.kind !== 'folder') {
    return { lines: ['Invalid directory'] }
  }
  return { lines: [], newCwd: node.path }
}

function mdCommand(arg: string | undefined, ctx: CommandContext): CommandOutput {
  if (!arg) {
    return { lines: ['Required parameter missing'] }
  }
  const target = resolvePath(ctx.cwd, arg)
  const result = createFolder(ctx.fs, parentPath(target), baseName(target))
  if (result.error) {
    return { lines: [result.error] }
  }
  return { lines: [], effects: [{ type: 'setFs', fs: result.fs }] }
}

function rdCommand(arg: string | undefined, ctx: CommandContext): CommandOutput {
  if (!arg) {
    return { lines: ['Required parameter missing'] }
  }
  const target = resolvePath(ctx.cwd, arg)
  const node = getNode(ctx.fs, target)
  if (!node || node.kind !== 'folder') {
    return { lines: ['Invalid path, not directory,', 'or directory not empty.'] }
  }
  if (node.children && node.children.length > 0) {
    return { lines: ['Invalid path, not directory,', 'or directory not empty.'] }
  }
  const result = deleteNode(ctx.fs, target)
  if (result.error) {
    return { lines: [result.error] }
  }
  const effects: CommandEffect[] = [{ type: 'setFs', fs: result.fs }]
  if (result.criticalDeleted) {
    effects.push({ type: 'crash', criticalPath: target })
  }
  return { lines: [], effects }
}

function delCommand(args: string[], ctx: CommandContext): CommandOutput {
  const confirmed = args.some((token) => token.toLowerCase() === '/y')
  const arg = args.find((token) => !token.startsWith('/'))
  if (!arg) {
    return { lines: ['Required parameter missing'] }
  }
  const target = resolvePath(ctx.cwd, arg)
  const node = getNode(ctx.fs, target)
  if (!node) {
    return { lines: ['File not found'] }
  }
  // Safeguard: deleting anything under the protected Windows tree (System32,
  // etc.) can break the boot, so require an explicit /Y the way real DOS makes
  // you confirm a wildcard delete — no silent `del C:\Windows\System32`.
  if (!confirmed && isProtectedPath(target)) {
    return {
      lines: [
        `WARNING: ${target} is part of the protected Windows system folder.`,
        'Deleting it can stop Windows from starting and force a recovery boot.',
        `To delete it anyway, run:  del ${arg} /Y`,
      ],
    }
  }
  const result = deleteNode(ctx.fs, target)
  if (result.error) {
    return { lines: [result.error] }
  }
  const effects: CommandEffect[] = [{ type: 'setFs', fs: result.fs }]
  const lines: string[] = []
  if (result.criticalDeleted) {
    effects.push({ type: 'crash', criticalPath: isCriticalPath(target) ? target : node.path })
  }
  return { lines, effects }
}

function copyOrMove(kind: 'copy' | 'move', args: string[], ctx: CommandContext): CommandOutput {
  const [srcArg, dstArg] = args
  if (!srcArg || !dstArg) {
    return { lines: ['Required parameter missing'] }
  }
  const src = resolvePath(ctx.cwd, srcArg)
  const sourceNode = getNode(ctx.fs, src)
  if (!sourceNode) {
    return { lines: ['File not found'] }
  }
  const dst = resolvePath(ctx.cwd, dstArg)
  const dstNode = getNode(ctx.fs, dst)
  const op = kind === 'copy' ? copyNode : moveNode

  if (dstNode?.kind === 'folder') {
    const result = op(ctx.fs, src, dst)
    if (result.error) {
      return { lines: [result.error] }
    }
    return {
      lines: [`        1 file(s) ${kind === 'copy' ? 'copied' : 'moved'}`],
      effects: [{ type: 'setFs', fs: result.fs }],
    }
  }

  // Destination is a new name inside an existing folder.
  const dstParent = parentPath(dst)
  const parentNode = getNode(ctx.fs, dstParent)
  if (!parentNode || parentNode.kind !== 'folder') {
    return { lines: ['The system cannot find the path specified.'] }
  }
  const result = op(ctx.fs, src, dstParent)
  if (result.error || !result.createdPath) {
    return { lines: [result.error ?? 'Operation failed'] }
  }
  let fs = result.fs
  const desiredName = baseName(dst)
  if (baseName(result.createdPath).toLowerCase() !== desiredName.toLowerCase()) {
    const renamed = renameNode(fs, result.createdPath, desiredName)
    if (renamed.error) {
      return { lines: [renamed.error] }
    }
    fs = renamed.fs
  }
  return {
    lines: [`        1 file(s) ${kind === 'copy' ? 'copied' : 'moved'}`],
    effects: [{ type: 'setFs', fs }],
  }
}

function renCommand(args: string[], ctx: CommandContext): CommandOutput {
  const [srcArg, newName] = args
  if (!srcArg || !newName) {
    return { lines: ['Required parameter missing'] }
  }
  if (/[\\/:]/.test(newName)) {
    return { lines: ['Invalid parameter - the new name must not contain a path.'] }
  }
  const src = resolvePath(ctx.cwd, srcArg)
  const result = renameNode(ctx.fs, src, newName)
  if (result.error) {
    return { lines: [result.error] }
  }
  return { lines: [], effects: [{ type: 'setFs', fs: result.fs }] }
}

function typeCommand(arg: string | undefined, ctx: CommandContext): CommandOutput {
  if (!arg) {
    return { lines: ['Required parameter missing'] }
  }
  const target = resolvePath(ctx.cwd, arg)
  const node = getNode(ctx.fs, target)
  if (!node) {
    return { lines: [`File not found - ${baseName(target).toUpperCase()}`] }
  }
  if (node.kind === 'folder') {
    return { lines: ['Access denied'] }
  }
  if (node.content === undefined) {
    return { lines: [`Cannot display - ${node.name} is not a text file.`] }
  }
  return { lines: node.content.split('\n') }
}

// ---------------------------------------------------------------------------
// Dispatcher
// ---------------------------------------------------------------------------

export function executeCommand(input: string, ctx: CommandContext): CommandOutput {
  const raw = input.trim()
  if (!raw) {
    return { lines: [] }
  }

  // DOS classics: `cd..`, `cd\` without a space.
  const cdShortcut = /^cd(\.\.+|\\.*)$/i.exec(raw)
  if (cdShortcut) {
    return cdCommand(cdShortcut[1], ctx)
  }

  const tokens = tokenize(raw)
  const command = (tokens[0] ?? '').toLowerCase()
  const args = tokens.slice(1)

  switch (command) {
    case 'attrib':
      return attribCommand(args, ctx)
    case 'cls':
      return { lines: [], clear: true }
    case 'chkdsk':
      return chkdskCommand(ctx)
    case 'help':
      return helpCommand()
    case 'ver':
      return { lines: ['', 'Windows 98 [Version 4.10.1998]', ''] }
    case 'winver':
      return winverCommand()
    case 'date': {
      const now = new Date()
      const day = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][now.getDay()]
      const mm = String(now.getMonth() + 1).padStart(2, '0')
      const dd = String(now.getDate()).padStart(2, '0')
      return { lines: [`Current date is ${day} ${mm}-${dd}-${now.getFullYear()}`] }
    }
    case 'time': {
      const now = new Date()
      const hh = String(now.getHours()).padStart(2, '0')
      const mm = String(now.getMinutes()).padStart(2, '0')
      const ss = String(now.getSeconds()).padStart(2, '0')
      const cc = String(Math.floor(now.getMilliseconds() / 10)).padStart(2, '0')
      return { lines: [`Current time is ${hh}:${mm}:${ss}.${cc}`] }
    }
    case 'mem':
      return memCommand()
    case 'dir':
      return dirCommand(args, ctx)
    case 'cd':
    case 'chdir':
      // Real COMMAND.COM treats everything after CD as one argument,
      // so `cd my documents` works without quotes.
      return cdCommand(args.length ? args.join(' ') : undefined, ctx)
    case 'md':
    case 'mkdir':
      return mdCommand(args[0], ctx)
    case 'rd':
    case 'rmdir':
      return rdCommand(args[0], ctx)
    case 'del':
    case 'erase':
      return delCommand(args, ctx)
    case 'copy':
      return copyOrMove('copy', args, ctx)
    case 'move':
      return copyOrMove('move', args, ctx)
    case 'ren':
    case 'rename':
      return renCommand(args, ctx)
    case 'type':
      return typeCommand(args[0], ctx)
    case 'tree':
      return treeCommand(args, ctx)
    case 'scandisk':
      return scandiskCommand(ctx)
    case 'format':
      return formatCommand(args, ctx)
    case 'sys':
      return sysCommand(args, ctx)
    case 'setup':
    case 'setup.exe':
    case 'install':
      return setupCommand(ctx)
    case 'echo':
      return { lines: [args.length ? args.join(' ') : 'ECHO is on.'] }
    case 'start':
      return startCommand(args, ctx)
    case 'testdontouch':
    case 'testdontouch.exe':
      return appCommand('setupSafety', undefined, ctx)
    case 'notepad':
      return appCommand('notepad', args[0], ctx)
    case 'mspaint':
      return appCommand('paint', args[0], ctx)
    case 'kodakimg':
      return appCommand('imageViewer', args[0], ctx)
    case 'vidplay':
      return appCommand('videoPlayer', args[0], ctx)
    case 'iexplore': {
      const blocked = dosModeBlocked(ctx)
      if (blocked) return blocked
      return {
        lines: [],
        effects: [{ type: 'openApp', appId: 'internetExplorer', payload: args[0] ? { url: args[0] } : undefined }],
      }
    }
    case 'calc':
      return appCommand('calculator', undefined, ctx)
    case 'msinfo32':
    case 'sysinfo':
      return appCommand('systemInfo', undefined, ctx)
    case 'msconfig':
      return appCommand('msconfig', undefined, ctx)
    case 'devmgmt':
    case 'hwinfo':
      return appCommand('deviceManager', undefined, ctx)
    case 'regedit':
    case 'regedit.exe':
    case 'regedt32':
    case 'regedt32.exe':
    case 'registry':
      return appCommand('registryEditor', undefined, ctx)
    case 'scandskw':
    case 'scandskw.exe':
      return appCommand('scandisk', undefined, ctx)
    case 'defrag':
    case 'defrag.exe':
    case 'dfrg':
      return appCommand('defrag', undefined, ctx)
    case 'ping':
      return pingCommand(args, ctx)
    case 'ipconfig':
    case 'winipcfg':
      return ipconfigCommand(args, ctx)
    case 'scanreg':
      return scanregCommand(args, ctx)
    case 'sfc':
      return sfcCommand(args, ctx)
    case 'exit':
      return { lines: [], effects: [{ type: 'exitWindow' }] }
    case 'win':
      if (ctx.dosOnly) {
        return { lines: ['Starting Windows 98...'], effects: [{ type: 'restart', target: 'normal' }] }
      }
      return { lines: ['Windows is already running.'] }
    case 'shutdown':
      return {
        lines: ['Windows is shutting down...'],
        effects: [{ type: 'restart', target: 'normal' }],
      }
    default:
      return { lines: [BAD_COMMAND] }
  }
}

// ---------------------------------------------------------------------------
// Tab completion
// ---------------------------------------------------------------------------

export function autoCompletePath(input: string, ctx: CommandContext): string | null {
  if (!input.trim()) {
    return null
  }
  // Find the start of the last argument (respecting quotes).
  let inQuotes = false
  let tokenStart = 0
  for (let i = 0; i < input.length; i += 1) {
    const ch = input[i]
    if (ch === '"') {
      inQuotes = !inQuotes
    } else if (!inQuotes && /\s/.test(ch)) {
      tokenStart = i + 1
    }
  }
  if (tokenStart >= input.length) {
    return null // nothing typed for the last argument yet
  }
  const partialRaw = input.slice(tokenStart)
  const partial = partialRaw.replace(/"/g, '')
  const separator = Math.max(partial.lastIndexOf('\\'), partial.lastIndexOf('/'))
  const dirPart = separator >= 0 ? partial.slice(0, separator + 1) : ''
  const prefix = (separator >= 0 ? partial.slice(separator + 1) : partial).toLowerCase()
  const dirPath = dirPart ? resolvePath(ctx.cwd, dirPart) : normalizePath(ctx.cwd)
  const entries = listDirectory(ctx.fs, dirPath)
  const matches = entries
    .filter((entry) => entry.name.toLowerCase().startsWith(prefix))
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b))
  if (!matches.length) {
    return null
  }
  const completed = `${dirPart}${matches[0]}`
  const needsQuotes = /\s/.test(completed)
  const replacement = needsQuotes ? `"${completed}"` : completed
  return `${input.slice(0, tokenStart)}${replacement}`
}
