import type { AppId, FsAttributes, FsNode, FsState, IconKey, WindowPayload } from '../types'
import {
  REQUIRED_SYSTEM_FILES as REQUIRED,
  fileTypeForName,
  iconForFileName,
  internalInsertNode,
  isProtectedPath,
  getNode,
  parentPath,
} from '../os/filesystem'
import { portfolioData } from './portfolioData'

export const REQUIRED_SYSTEM_FILES: string[] = REQUIRED

const MODERN_STAMP = '06/12/2026 12:00 AM'
const RETRO_STAMP = '05/11/1998 08:01 AM'

function systemFileContent(name: string): string {
  return [
    name,
    'Simulated Windows 98 portfolio system component.',
    'This placeholder contains no Microsoft code or real operating system data.',
    'It exists only inside the browser filesystem model.',
  ].join('\n')
}

const AUTOEXEC_BAT = [
  '@ECHO OFF',
  'PROMPT $p$g',
  'PATH C:\\WINDOWS;C:\\WINDOWS\\COMMAND',
  'SET TEMP=C:\\WINDOWS\\TEMP',
  'SET BLASTER=A220 I5 D1 T4 P330',
  'LH C:\\WINDOWS\\COMMAND\\MSCDEX.EXE /D:OEMCD001 /L:E',
  'LH C:\\MOUSE\\MOUSE.EXE /Q',
  'REM ------------------------------------------',
  'REM  Portfolio 98 - tuned for maximum nostalgia',
  'REM ------------------------------------------',
  'ECHO Loading Portfolio 98...',
  'WIN',
].join('\n')

const CONFIG_SYS = [
  'DEVICE=C:\\WINDOWS\\HIMEM.SYS /TESTMEM:OFF',
  'DEVICE=C:\\WINDOWS\\EMM386.EXE NOEMS',
  'DOS=HIGH,UMB',
  'FILES=60',
  'BUFFERS=40,0',
  'STACKS=9,256',
  'FCBS=4,0',
  'DEVICEHIGH=C:\\CDROM\\OEMCD001.SYS /D:OEMCD001',
  'LASTDRIVE=Z',
  'REM 64 MB ought to be enough for any portfolio',
].join('\n')

const WIN_INI = [
  '[windows]',
  'load=',
  'run=',
  'NullPort=None',
  '',
  '[Desktop]',
  'Wallpaper=(None)',
  'TileWallpaper=0',
  'WallpaperStyle=0',
  '',
  '[fonts]',
  'MS Sans Serif=SSERIFE.FON',
  'Terminal=8514OEM.FON',
].join('\n')

const SYSTEM_INI = [
  '[boot]',
  'shell=Explorer.exe',
  'system.drv=system.drv',
  'keyboard.drv=keyboard.drv',
  'mouse.drv=mouse.drv',
  'display.drv=display.drv',
  '',
  '[386Enh]',
  'device=vmm32.vxd',
  'PagingDrive=C:',
  'ConservativeSwapfileUsage=1',
].join('\n')

type FileOpts = {
  size?: number
  content?: string
  dataUrl?: string
  icon?: IconKey
  fileType?: string
  appId?: AppId
  appPayload?: WindowPayload
  attributes?: FsAttributes
  modified?: string
}

export function createInitialFsState(): FsState {
  const nodes: Record<string, FsNode> = {}

  function add(node: FsNode): FsNode {
    nodes[node.path] = node
    const parent = nodes[parentPath(node.path)]
    if (parent && parent.path !== node.path && parent.kind === 'folder') {
      parent.children = [...(parent.children ?? []), node.path]
    }
    return node
  }

  function folder(path: string, icon: IconKey = 'folder', modified = MODERN_STAMP): FsNode {
    const name = path.endsWith(':\\') ? path : path.slice(path.lastIndexOf('\\') + 1)
    return add({
      path,
      name,
      kind: 'folder',
      icon,
      fileType: 'File Folder',
      size: 0,
      modified,
      children: [],
    })
  }

  function file(path: string, opts: FileOpts = {}): FsNode {
    const name = path.slice(path.lastIndexOf('\\') + 1)
    return add({
      path,
      name,
      kind: 'file',
      icon: opts.icon ?? iconForFileName(name),
      fileType: opts.fileType ?? fileTypeForName(name),
      size: opts.size ?? opts.content?.length ?? opts.dataUrl?.length ?? 0,
      modified: opts.modified ?? MODERN_STAMP,
      content: opts.content,
      dataUrl: opts.dataUrl,
      attributes: opts.attributes,
      appId: opts.appId,
      appPayload: opts.appPayload,
    })
  }

  function sysFile(path: string, size: number, opts: FileOpts = {}): FsNode {
    const name = path.slice(path.lastIndexOf('\\') + 1)
    return file(path, {
      size,
      content: opts.content ?? systemFileContent(name),
      modified: RETRO_STAMP,
      ...opts,
    })
  }

  // ----- drive root -----
  const root = folder('C:\\', 'hardDrive')
  root.name = 'Portfolio (C:)'

  file('C:\\AUTOEXEC.BAT', { content: AUTOEXEC_BAT, modified: RETRO_STAMP })
  file('C:\\CONFIG.SYS', {
    content: CONFIG_SYS,
    modified: RETRO_STAMP,
    icon: 'sysFile',
    fileType: 'System File',
  })

  // ----- My Documents -----
  folder('C:\\My Documents', 'projects', '06/12/2026 12:03 AM')
  file('C:\\My Documents\\About Me.txt', {
    content: portfolioData.profile.summary,
    icon: 'student',
    appId: 'about',
    modified: '06/12/2026 12:06 AM',
  })
  file('C:\\My Documents\\Contact.url', {
    content: `mailto:${portfolioData.contact.email}`,
    icon: 'contact',
    appId: 'contact',
    size: 98,
    modified: '06/12/2026 12:05 AM',
  })
  file('C:\\My Documents\\Resume.doc', {
    content: portfolioData.resume.documentContent,
    icon: 'wordpad',
    appId: 'wordpad',
    appPayload: { filePath: 'C:\\My Documents\\Resume.doc' },
    modified: '06/13/2026 12:34 AM',
  })
  file('C:\\My Documents\\Education.txt', {
    content: portfolioData.resume.education.join('\n'),
    modified: '06/13/2026 12:34 AM',
  })
  folder('C:\\My Documents\\Music', 'folder', '06/12/2026 12:07 AM')

  // ----- Projects -----
  folder('C:\\Projects', 'projects', '06/13/2026 12:35 AM')
  for (const project of portfolioData.projects) {
    file(`C:\\Projects\\${project.name}.txt`, {
      content: [
        project.name,
        '',
        project.summary,
        '',
        project.details,
        '',
        `Stack: ${project.stack.join(', ')}`,
      ].join('\n'),
      modified: '06/13/2026 12:35 AM',
    })
    file(`C:\\Projects\\${project.fileName}`, {
      content: project.links.demo,
      icon: 'urlFile',
      fileType: 'Internet Shortcut',
      appId: 'projectDetails',
      appPayload: { projectId: project.id },
      size: 512,
      modified: '06/13/2026 12:35 AM',
    })
  }

  // ----- My Pictures -----
  folder('C:\\My Pictures', 'folder', '06/12/2026 12:04 AM')
  file('C:\\My Pictures\\Welcome.bmp', { size: 153718, modified: '06/12/2026 12:04 AM' })
  file('C:\\My Pictures\\desktop-clouds.bmp', { size: 184320, modified: '06/12/2026 12:05 AM' })
  file('C:\\My Pictures\\portfolio-sketch.bmp', { size: 98304, modified: '06/12/2026 12:05 AM' })
  file('C:\\My Pictures\\project-preview.url', {
    content: 'https://portfolio.local/projects',
    size: 512,
    modified: '06/12/2026 12:06 AM',
  })

  // ----- Windows -----
  folder('C:\\Windows', 'windows', '05/11/1998 08:00 AM')

  // System32
  folder('C:\\Windows\\System32', 'adminTools', RETRO_STAMP)
  sysFile('C:\\Windows\\System32\\kernel32.dll', 892928)
  sysFile('C:\\Windows\\System32\\user32.dll', 577536)
  sysFile('C:\\Windows\\System32\\gdi32.dll', 253952)
  sysFile('C:\\Windows\\System32\\shell32.dll', 1392640)
  sysFile('C:\\Windows\\System32\\advapi32.dll', 65536)
  sysFile('C:\\Windows\\System32\\comdlg32.dll', 184320)
  sysFile('C:\\Windows\\System32\\comctl32.dll', 557056)
  sysFile('C:\\Windows\\System32\\ole32.dll', 770048)
  sysFile('C:\\Windows\\System32\\msvcrt.dll', 278581)
  sysFile('C:\\Windows\\System32\\winsock.dll', 42160)
  sysFile('C:\\Windows\\System32\\wsock32.dll', 66560)
  sysFile('C:\\Windows\\System32\\wininet.dll', 372736)
  sysFile('C:\\Windows\\System32\\rasapi32.dll', 217088)
  sysFile('C:\\Windows\\System32\\setupapi.dll', 446464)
  sysFile('C:\\Windows\\System32\\mmsystem.dll', 71680)
  sysFile('C:\\Windows\\System32\\control.exe', 112640, { appId: 'controlPanel' })
  sysFile('C:\\Windows\\System32\\rundll32.exe', 24576)
  sysFile('C:\\Windows\\System32\\regsvr32.exe', 36864)
  sysFile('C:\\Windows\\System32\\systray.exe', 40960)
  sysFile('C:\\Windows\\System32\\netcfg.dll', 94208)
  sysFile('C:\\Windows\\System32\\portfolio.sys', 32768)
  sysFile('C:\\Windows\\System32\\vmm32.vxd', 932864)
  sysFile('C:\\Windows\\System32\\configmg.vxd', 125952)
  sysFile('C:\\Windows\\System32\\vcomm.vxd', 65536)
  sysFile('C:\\Windows\\System32\\vflatd.vxd', 77824)
  sysFile('C:\\Windows\\System32\\gpu.vxd', 49152)
  sysFile('C:\\Windows\\System32\\display.drv', 98304)
  sysFile('C:\\Windows\\System32\\keyboard.drv', 28672)
  sysFile('C:\\Windows\\System32\\mouse.drv', 24576)
  sysFile('C:\\Windows\\System32\\sound.drv', 53248)

  folder('C:\\Windows\\System32\\Drivers', 'adminTools', RETRO_STAMP)
  sysFile('C:\\Windows\\System32\\Drivers\\ndis.vxd', 159744)
  sysFile('C:\\Windows\\System32\\Drivers\\tcpip.sys', 196608)
  sysFile('C:\\Windows\\System32\\Drivers\\el90xnd3.sys', 45056)
  sysFile('C:\\Windows\\System32\\Drivers\\vga.drv', 73728)
  sysFile('C:\\Windows\\System32\\Drivers\\mousehid.vxd', 40960)

  folder('C:\\Windows\\System32\\Config', 'adminTools', RETRO_STAMP)
  sysFile('C:\\Windows\\System32\\Config\\system.dat', 1048576)
  sysFile('C:\\Windows\\System32\\Config\\user.dat', 524288)
  sysFile('C:\\Windows\\System32\\Config\\network.reg', 16384)
  sysFile('C:\\Windows\\System32\\Config\\portfolio.ini', 8192)

  folder('C:\\Windows\\System32\\Spool', 'adminTools', RETRO_STAMP)
  folder('C:\\Windows\\System32\\Spool\\PRINTERS', 'adminTools', RETRO_STAMP)
  sysFile('C:\\Windows\\System32\\Spool\\spoolss.dll', 180224)

  // Command
  folder('C:\\Windows\\Command', 'dos', RETRO_STAMP)
  sysFile('C:\\Windows\\Command\\COMMAND.COM', 93890, { appId: 'terminal' })
  sysFile('C:\\Windows\\Command\\PING.EXE', 24576)
  sysFile('C:\\Windows\\Command\\IPCONFIG.EXE', 28672)
  sysFile('C:\\Windows\\Command\\SCANREG.EXE', 151024)
  sysFile('C:\\Windows\\Command\\SFC.EXE', 98304)

  // Control Panel
  folder('C:\\Windows\\Control Panel', 'controlPanel', RETRO_STAMP)
  const cplSections: Array<[string, WindowPayload['controlPanelSection']]> = [
    ['Display.cpl', 'display'],
    ['Mouse.cpl', 'mouse'],
    ['Keyboard.cpl', 'keyboard'],
    ['DateTime.cpl', 'datetime'],
    ['Network.cpl', 'network'],
    ['Sounds.cpl', 'sounds'],
    ['System.cpl', 'system'],
    ['AddRemove.cpl', 'addremove'],
    ['Printers.cpl', 'printers'],
  ]
  for (const [name, section] of cplSections) {
    sysFile(`C:\\Windows\\Control Panel\\${name}`, 16384, {
      icon: 'controlPanel',
      appId: 'controlPanel',
      appPayload: { controlPanelSection: section },
      modified: '05/11/1998 08:03 AM',
    })
  }

  // Desktop
  folder('C:\\Windows\\Desktop', 'desktop', '05/11/1998 08:04 AM')
  sysFile('C:\\Windows\\Desktop\\Portfolio OS.lnk', 1024, {
    icon: 'projects',
    fileType: 'Shortcut',
    appId: 'projects',
    modified: '06/12/2026 12:14 AM',
  })

  // Fonts
  folder('C:\\Windows\\Fonts', 'folder', '05/11/1998 08:04 AM')
  sysFile('C:\\Windows\\Fonts\\MS Sans Serif.fon', 57344)
  sysFile('C:\\Windows\\Fonts\\Terminal.fon', 28672)

  // Media (synthesized .wav launchers)
  folder('C:\\Windows\\Media', 'folder', RETRO_STAMP)
  const mediaWavs = [
    'Startup.wav',
    'Shutdown.wav',
    'Error.wav',
    'Warning.wav',
    'Click.wav',
    'Menu Open.wav',
    'Recycle.wav',
    'Network Up.wav',
    'Network Down.wav',
    'Launch.wav',
    'Minimize.wav',
    'Restore.wav',
    'Ding.wav',
    'Tada.wav',
  ]
  for (const name of mediaWavs) {
    const path = `C:\\Windows\\Media\\${name}`
    file(path, {
      size: 52428,
      content: '',
      icon: 'audioFile',
      fileType: 'Wave Sound',
      appId: 'mediaPlayer',
      appPayload: { filePath: path },
      modified: RETRO_STAMP,
    })
  }

  // Temp
  folder('C:\\Windows\\Temp', 'folder', '06/12/2026 12:14 AM')
  sysFile('C:\\Windows\\Temp\\BOOTLOG.PRV', 4096)
  sysFile('C:\\Windows\\Temp\\netsetup.tmp', 2048)

  // Loose Windows files
  sysFile('C:\\Windows\\WIN.INI', 8192, { content: WIN_INI })
  sysFile('C:\\Windows\\SYSTEM.INI', 12288, { content: SYSTEM_INI })
  sysFile('C:\\Windows\\EXPLORER.EXE', 220160, {
    appId: 'explorer',
    appPayload: { path: 'C:\\' },
  })

  // ----- Program Files -----
  folder('C:\\Program Files', 'folder', '06/12/2026 12:10 AM')
  folder('C:\\Program Files\\Accessories', 'folder', '06/12/2026 12:10 AM')
  file('C:\\Program Files\\Accessories\\NOTEPAD.EXE', {
    size: 65536,
    icon: 'notepad',
    appId: 'notepad',
    modified: '06/12/2026 12:13 AM',
  })
  file('C:\\Program Files\\Accessories\\WORDPAD.EXE', {
    size: 98304,
    icon: 'wordpad',
    appId: 'wordpad',
    modified: '06/13/2026 12:34 AM',
  })
  file('C:\\Program Files\\Accessories\\MSPAINT.EXE', {
    size: 65536,
    icon: 'paint',
    appId: 'paint',
    modified: '06/12/2026 12:13 AM',
  })
  file('C:\\Program Files\\Accessories\\CALC.EXE', {
    size: 65536,
    icon: 'calculator',
    appId: 'calculator',
    modified: '06/12/2026 12:13 AM',
  })
  file('C:\\Program Files\\Accessories\\SNDREC32.EXE', {
    size: 65536,
    icon: 'soundRecorder',
    appId: 'soundRecorder',
    modified: '06/12/2026 12:13 AM',
  })
  file('C:\\Program Files\\Accessories\\MPLAYER.EXE', {
    size: 65536,
    icon: 'mediaPlayer',
    appId: 'mediaPlayer',
    modified: '06/12/2026 12:13 AM',
  })
  folder('C:\\Program Files\\Internet Explorer', 'internet', '06/12/2026 12:11 AM')
  file('C:\\Program Files\\Internet Explorer\\IEXPLORE.EXE', {
    size: 65536,
    icon: 'internet',
    appId: 'internetExplorer',
    modified: '06/12/2026 12:13 AM',
  })

  // ----- Network -----
  folder('C:\\Network', 'network', '06/12/2026 12:12 AM')
  file('C:\\Network\\Portfolio.local', {
    size: 0,
    icon: 'world',
    fileType: 'Network Location',
    appId: 'projects',
    modified: '06/12/2026 12:12 AM',
  })
  file('C:\\Network\\Ethernet Adapter', {
    size: 0,
    icon: 'modem',
    fileType: 'Network Device',
    appId: 'network',
    modified: '06/12/2026 12:12 AM',
  })

  // ----- attributes pass: everything under C:\Windows is a system node -----
  const requiredLower = new Set(REQUIRED_SYSTEM_FILES.map((path) => path.toLowerCase()))
  for (const node of Object.values(nodes)) {
    if (isProtectedPath(node.path)) {
      const critical = requiredLower.has(node.path.toLowerCase())
      node.attributes = { ...node.attributes, system: true, ...(critical ? { critical: true } : {}) }
    }
  }

  return { nodes, recycle: [] }
}

const PORTFOLIO_SEEDED_PATHS = [
  'C:\\My Documents\\Resume.doc',
  'C:\\My Documents\\Education.txt',
  'C:\\Projects',
  ...portfolioData.projects.flatMap((project) => [
    `C:\\Projects\\${project.name}.txt`,
    `C:\\Projects\\${project.fileName}`,
  ]),
  'C:\\Program Files\\Accessories\\WORDPAD.EXE',
]

export function ensurePortfolioSeedFiles(fs: FsState): FsState {
  const seed = createInitialFsState()
  let next = fs
  for (const path of PORTFOLIO_SEEDED_PATHS) {
    const seedNode = getNode(seed, path)
    if (!seedNode) continue
    const existing = getNode(next, seedNode.path)
    if (existing?.kind === 'folder') continue
    next = internalInsertNode(next, {
      ...seedNode,
      children: seedNode.kind === 'folder' ? seedNode.children ?? [] : undefined,
    })
  }
  return next
}
