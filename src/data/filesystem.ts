import { portfolioData } from './portfolioData'
import type { AppId, FileSystemNode, IconKey } from '../types'

function resumeText() {
  const lines = [`${portfolioData.profile.name}`, portfolioData.profile.role, '', portfolioData.profile.headline, '']
  portfolioData.resume.sections.forEach((section) => {
    lines.push(section.title.toUpperCase())
    section.items.forEach((item) => lines.push(`- ${item}`))
    lines.push('')
  })
  return lines.join('\n')
}

function projectReadme() {
  return portfolioData.projects
    .map((project) => `${project.name}\n${project.summary}\nStack: ${project.stack.join(', ')}`)
    .join('\n\n')
}

const nodes: Record<string, FileSystemNode> = {
  'C:\\': {
    path: 'C:\\',
    name: 'Portfolio (C:)',
    kind: 'folder',
    icon: 'hardDrive',
    modified: '06/12/2026 12:00 AM',
    children: ['C:\\My Documents', 'C:\\My Pictures', 'C:\\Projects', 'C:\\Windows', 'C:\\Program Files', 'C:\\Network'],
  },
  'C:\\My Documents': {
    path: 'C:\\My Documents',
    name: 'My Documents',
    kind: 'folder',
    icon: 'projects',
    modified: '06/12/2026 12:03 AM',
    children: ['C:\\My Documents\\Resume.txt', 'C:\\My Documents\\Contact.url', 'C:\\My Documents\\About Me.txt'],
  },
  'C:\\My Documents\\Resume.txt': {
    path: 'C:\\My Documents\\Resume.txt',
    name: 'Resume.txt',
    kind: 'file',
    icon: 'resume',
    fileType: 'Text Document',
    size: resumeText().length,
    modified: '06/12/2026 12:05 AM',
    content: resumeText(),
    appId: 'resume',
  },
  'C:\\My Documents\\Contact.url': {
    path: 'C:\\My Documents\\Contact.url',
    name: 'Contact.url',
    kind: 'app',
    icon: 'contact',
    fileType: 'Internet Shortcut',
    size: 98,
    modified: '06/12/2026 12:05 AM',
    content: `mailto:${portfolioData.contact.email}`,
    appId: 'contact',
  },
  'C:\\My Documents\\About Me.txt': {
    path: 'C:\\My Documents\\About Me.txt',
    name: 'About Me.txt',
    kind: 'app',
    icon: 'about',
    fileType: 'Text Document',
    size: portfolioData.profile.summary.length,
    modified: '06/12/2026 12:06 AM',
    content: portfolioData.profile.summary,
    appId: 'about',
  },
  'C:\\My Pictures': {
    path: 'C:\\My Pictures',
    name: 'My Pictures',
    kind: 'folder',
    icon: 'folder',
    modified: '06/12/2026 12:04 AM',
    children: [
      'C:\\My Pictures\\desktop-clouds.bmp',
      'C:\\My Pictures\\portfolio-sketch.bmp',
      'C:\\My Pictures\\project-preview.url',
    ],
  },
  'C:\\My Pictures\\desktop-clouds.bmp': {
    path: 'C:\\My Pictures\\desktop-clouds.bmp',
    name: 'desktop-clouds.bmp',
    kind: 'app',
    icon: 'desktop',
    fileType: 'Bitmap Image',
    size: 184320,
    modified: '06/12/2026 12:05 AM',
    appId: 'themes',
  },
  'C:\\My Pictures\\portfolio-sketch.bmp': {
    path: 'C:\\My Pictures\\portfolio-sketch.bmp',
    name: 'portfolio-sketch.bmp',
    kind: 'app',
    icon: 'paint',
    fileType: 'Bitmap Image',
    size: 98304,
    modified: '06/12/2026 12:05 AM',
    appId: 'paint',
  },
  'C:\\My Pictures\\project-preview.url': {
    path: 'C:\\My Pictures\\project-preview.url',
    name: 'project-preview.url',
    kind: 'app',
    icon: 'html',
    fileType: 'Internet Shortcut',
    size: 512,
    modified: '06/12/2026 12:06 AM',
    appId: 'internetExplorer',
  },
  'C:\\Projects': {
    path: 'C:\\Projects',
    name: 'Projects',
    kind: 'folder',
    icon: 'projects',
    modified: '06/12/2026 12:04 AM',
    children: ['C:\\Projects\\README.txt', 'C:\\Projects\\PortfolioOS.exe', 'C:\\Projects\\Case Studies'],
  },
  'C:\\Projects\\README.txt': {
    path: 'C:\\Projects\\README.txt',
    name: 'README.txt',
    kind: 'file',
    icon: 'notepad',
    fileType: 'Text Document',
    size: projectReadme().length,
    modified: '06/12/2026 12:06 AM',
    content: projectReadme(),
  },
  'C:\\Projects\\PortfolioOS.exe': {
    path: 'C:\\Projects\\PortfolioOS.exe',
    name: 'PortfolioOS.exe',
    kind: 'app',
    icon: 'projects',
    fileType: 'Application',
    size: 4096,
    modified: '06/12/2026 12:07 AM',
    appId: 'projects',
  },
  'C:\\Projects\\Case Studies': {
    path: 'C:\\Projects\\Case Studies',
    name: 'Case Studies',
    kind: 'folder',
    icon: 'folder',
    modified: '06/12/2026 12:08 AM',
    children: ['C:\\Projects\\Case Studies\\Project Alpha.url', 'C:\\Projects\\Case Studies\\Project Beta.url'],
  },
  'C:\\Projects\\Case Studies\\Project Alpha.url': {
    path: 'C:\\Projects\\Case Studies\\Project Alpha.url',
    name: 'Project Alpha.url',
    kind: 'app',
    icon: 'internet',
    fileType: 'Internet Shortcut',
    size: 512,
    modified: '06/12/2026 12:09 AM',
    appId: 'projectDetails',
    content: 'project-alpha',
  },
  'C:\\Projects\\Case Studies\\Project Beta.url': {
    path: 'C:\\Projects\\Case Studies\\Project Beta.url',
    name: 'Project Beta.url',
    kind: 'app',
    icon: 'internet',
    fileType: 'Internet Shortcut',
    size: 512,
    modified: '06/12/2026 12:09 AM',
    appId: 'projectDetails',
    content: 'project-beta',
  },
  'C:\\Windows': {
    path: 'C:\\Windows',
    name: 'Windows',
    kind: 'folder',
    icon: 'windows',
    modified: '05/11/1998 08:00 AM',
    children: [
      'C:\\Windows\\System32',
      'C:\\Windows\\Command',
      'C:\\Windows\\Control Panel',
      'C:\\Windows\\Desktop',
      'C:\\Windows\\Fonts',
      'C:\\Windows\\Temp',
      'C:\\Windows\\WIN.INI',
      'C:\\Windows\\SYSTEM.INI',
      'C:\\Windows\\EXPLORER.EXE',
    ],
  },
  'C:\\Windows\\System32': {
    path: 'C:\\Windows\\System32',
    name: 'System32',
    kind: 'folder',
    icon: 'adminTools',
    modified: '05/11/1998 08:01 AM',
    children: [
      'C:\\Windows\\System32\\kernel32.dll',
      'C:\\Windows\\System32\\user32.dll',
      'C:\\Windows\\System32\\gdi32.dll',
      'C:\\Windows\\System32\\shell32.dll',
      'C:\\Windows\\System32\\advapi32.dll',
      'C:\\Windows\\System32\\comdlg32.dll',
      'C:\\Windows\\System32\\comctl32.dll',
      'C:\\Windows\\System32\\ole32.dll',
      'C:\\Windows\\System32\\msvcrt.dll',
      'C:\\Windows\\System32\\winsock.dll',
      'C:\\Windows\\System32\\wsock32.dll',
      'C:\\Windows\\System32\\wininet.dll',
      'C:\\Windows\\System32\\rasapi32.dll',
      'C:\\Windows\\System32\\setupapi.dll',
      'C:\\Windows\\System32\\mmsystem.dll',
      'C:\\Windows\\System32\\control.exe',
      'C:\\Windows\\System32\\rundll32.exe',
      'C:\\Windows\\System32\\regsvr32.exe',
      'C:\\Windows\\System32\\systray.exe',
      'C:\\Windows\\System32\\netcfg.dll',
      'C:\\Windows\\System32\\portfolio.sys',
      'C:\\Windows\\System32\\vmm32.vxd',
      'C:\\Windows\\System32\\configmg.vxd',
      'C:\\Windows\\System32\\vcomm.vxd',
      'C:\\Windows\\System32\\vflatd.vxd',
      'C:\\Windows\\System32\\gpu.vxd',
      'C:\\Windows\\System32\\display.drv',
      'C:\\Windows\\System32\\keyboard.drv',
      'C:\\Windows\\System32\\mouse.drv',
      'C:\\Windows\\System32\\sound.drv',
      'C:\\Windows\\System32\\Drivers',
      'C:\\Windows\\System32\\Config',
      'C:\\Windows\\System32\\Spool',
    ],
  },
  'C:\\Windows\\System32\\kernel32.dll': systemFile('C:\\Windows\\System32', 'kernel32.dll', 892928),
  'C:\\Windows\\System32\\user32.dll': systemFile('C:\\Windows\\System32', 'user32.dll', 577536),
  'C:\\Windows\\System32\\gdi32.dll': systemFile('C:\\Windows\\System32', 'gdi32.dll', 253952),
  'C:\\Windows\\System32\\shell32.dll': systemFile('C:\\Windows\\System32', 'shell32.dll', 1392640),
  'C:\\Windows\\System32\\advapi32.dll': systemFile('C:\\Windows\\System32', 'advapi32.dll', 65536),
  'C:\\Windows\\System32\\comdlg32.dll': systemFile('C:\\Windows\\System32', 'comdlg32.dll', 184320),
  'C:\\Windows\\System32\\comctl32.dll': systemFile('C:\\Windows\\System32', 'comctl32.dll', 557056),
  'C:\\Windows\\System32\\ole32.dll': systemFile('C:\\Windows\\System32', 'ole32.dll', 770048),
  'C:\\Windows\\System32\\msvcrt.dll': systemFile('C:\\Windows\\System32', 'msvcrt.dll', 278581),
  'C:\\Windows\\System32\\winsock.dll': systemFile('C:\\Windows\\System32', 'winsock.dll', 42160),
  'C:\\Windows\\System32\\wsock32.dll': systemFile('C:\\Windows\\System32', 'wsock32.dll', 66560),
  'C:\\Windows\\System32\\wininet.dll': systemFile('C:\\Windows\\System32', 'wininet.dll', 372736),
  'C:\\Windows\\System32\\rasapi32.dll': systemFile('C:\\Windows\\System32', 'rasapi32.dll', 217088),
  'C:\\Windows\\System32\\setupapi.dll': systemFile('C:\\Windows\\System32', 'setupapi.dll', 446464),
  'C:\\Windows\\System32\\mmsystem.dll': systemFile('C:\\Windows\\System32', 'mmsystem.dll', 71680),
  'C:\\Windows\\System32\\control.exe': systemFile('C:\\Windows\\System32', 'control.exe', 112640, 'controlPanel'),
  'C:\\Windows\\System32\\rundll32.exe': systemFile('C:\\Windows\\System32', 'rundll32.exe', 24576),
  'C:\\Windows\\System32\\regsvr32.exe': systemFile('C:\\Windows\\System32', 'regsvr32.exe', 36864),
  'C:\\Windows\\System32\\systray.exe': systemFile('C:\\Windows\\System32', 'systray.exe', 40960),
  'C:\\Windows\\System32\\netcfg.dll': systemFile('C:\\Windows\\System32', 'netcfg.dll', 94208),
  'C:\\Windows\\System32\\portfolio.sys': systemFile('C:\\Windows\\System32', 'portfolio.sys', 32768),
  'C:\\Windows\\System32\\vmm32.vxd': systemFile('C:\\Windows\\System32', 'vmm32.vxd', 932864),
  'C:\\Windows\\System32\\configmg.vxd': systemFile('C:\\Windows\\System32', 'configmg.vxd', 125952),
  'C:\\Windows\\System32\\vcomm.vxd': systemFile('C:\\Windows\\System32', 'vcomm.vxd', 65536),
  'C:\\Windows\\System32\\vflatd.vxd': systemFile('C:\\Windows\\System32', 'vflatd.vxd', 77824),
  'C:\\Windows\\System32\\gpu.vxd': systemFile('C:\\Windows\\System32', 'gpu.vxd', 49152),
  'C:\\Windows\\System32\\display.drv': systemFile('C:\\Windows\\System32', 'display.drv', 98304),
  'C:\\Windows\\System32\\keyboard.drv': systemFile('C:\\Windows\\System32', 'keyboard.drv', 28672),
  'C:\\Windows\\System32\\mouse.drv': systemFile('C:\\Windows\\System32', 'mouse.drv', 24576),
  'C:\\Windows\\System32\\sound.drv': systemFile('C:\\Windows\\System32', 'sound.drv', 53248),
  'C:\\Windows\\System32\\Drivers': systemFolder('C:\\Windows\\System32', 'Drivers', [
    'C:\\Windows\\System32\\Drivers\\ndis.vxd',
    'C:\\Windows\\System32\\Drivers\\tcpip.sys',
    'C:\\Windows\\System32\\Drivers\\el90xnd3.sys',
    'C:\\Windows\\System32\\Drivers\\vga.drv',
    'C:\\Windows\\System32\\Drivers\\mousehid.vxd',
  ]),
  'C:\\Windows\\System32\\Drivers\\ndis.vxd': systemFile('C:\\Windows\\System32\\Drivers', 'ndis.vxd', 159744),
  'C:\\Windows\\System32\\Drivers\\tcpip.sys': systemFile('C:\\Windows\\System32\\Drivers', 'tcpip.sys', 196608),
  'C:\\Windows\\System32\\Drivers\\el90xnd3.sys': systemFile('C:\\Windows\\System32\\Drivers', 'el90xnd3.sys', 45056),
  'C:\\Windows\\System32\\Drivers\\vga.drv': systemFile('C:\\Windows\\System32\\Drivers', 'vga.drv', 73728),
  'C:\\Windows\\System32\\Drivers\\mousehid.vxd': systemFile('C:\\Windows\\System32\\Drivers', 'mousehid.vxd', 40960),
  'C:\\Windows\\System32\\Config': systemFolder('C:\\Windows\\System32', 'Config', [
    'C:\\Windows\\System32\\Config\\system.dat',
    'C:\\Windows\\System32\\Config\\user.dat',
    'C:\\Windows\\System32\\Config\\network.reg',
    'C:\\Windows\\System32\\Config\\portfolio.ini',
  ]),
  'C:\\Windows\\System32\\Config\\system.dat': systemFile('C:\\Windows\\System32\\Config', 'system.dat', 1048576),
  'C:\\Windows\\System32\\Config\\user.dat': systemFile('C:\\Windows\\System32\\Config', 'user.dat', 524288),
  'C:\\Windows\\System32\\Config\\network.reg': systemFile('C:\\Windows\\System32\\Config', 'network.reg', 16384),
  'C:\\Windows\\System32\\Config\\portfolio.ini': systemFile('C:\\Windows\\System32\\Config', 'portfolio.ini', 8192),
  'C:\\Windows\\System32\\Spool': systemFolder('C:\\Windows\\System32', 'Spool', [
    'C:\\Windows\\System32\\Spool\\PRINTERS',
    'C:\\Windows\\System32\\Spool\\spoolss.dll',
  ]),
  'C:\\Windows\\System32\\Spool\\PRINTERS': systemFolder('C:\\Windows\\System32\\Spool', 'PRINTERS', []),
  'C:\\Windows\\System32\\Spool\\spoolss.dll': systemFile('C:\\Windows\\System32\\Spool', 'spoolss.dll', 180224),
  'C:\\Windows\\Command': {
    path: 'C:\\Windows\\Command',
    name: 'Command',
    kind: 'folder',
    icon: 'dos',
    modified: '05/11/1998 08:02 AM',
    children: ['C:\\Windows\\Command\\COMMAND.COM', 'C:\\Windows\\Command\\PING.EXE', 'C:\\Windows\\Command\\IPCONFIG.EXE'],
  },
  'C:\\Windows\\Command\\COMMAND.COM': systemFile('C:\\Windows\\Command', 'COMMAND.COM', 93890, 'terminal'),
  'C:\\Windows\\Command\\PING.EXE': systemFile('C:\\Windows\\Command', 'PING.EXE', 24576),
  'C:\\Windows\\Command\\IPCONFIG.EXE': systemFile('C:\\Windows\\Command', 'IPCONFIG.EXE', 28672),
  'C:\\Windows\\Control Panel': {
    path: 'C:\\Windows\\Control Panel',
    name: 'Control Panel',
    kind: 'folder',
    icon: 'controlPanel',
    modified: '05/11/1998 08:02 AM',
    children: [
      'C:\\Windows\\Control Panel\\Display.cpl',
      'C:\\Windows\\Control Panel\\Mouse.cpl',
      'C:\\Windows\\Control Panel\\Network.cpl',
      'C:\\Windows\\Control Panel\\System.cpl',
    ],
  },
  'C:\\Windows\\Control Panel\\Display.cpl': controlFile('Display.cpl', 'display'),
  'C:\\Windows\\Control Panel\\Mouse.cpl': controlFile('Mouse.cpl', 'mouse'),
  'C:\\Windows\\Control Panel\\Network.cpl': controlFile('Network.cpl', 'network'),
  'C:\\Windows\\Control Panel\\System.cpl': controlFile('System.cpl', 'system'),
  'C:\\Windows\\Desktop': {
    path: 'C:\\Windows\\Desktop',
    name: 'Desktop',
    kind: 'folder',
    icon: 'desktop',
    modified: '05/11/1998 08:04 AM',
    children: ['C:\\Windows\\Desktop\\Portfolio OS.lnk'],
  },
  'C:\\Windows\\Desktop\\Portfolio OS.lnk': {
    path: 'C:\\Windows\\Desktop\\Portfolio OS.lnk',
    name: 'Portfolio OS.lnk',
    kind: 'app',
    icon: 'projects',
    fileType: 'Shortcut',
    size: 1024,
    modified: '06/12/2026 12:14 AM',
    appId: 'projects',
  },
  'C:\\Windows\\Fonts': {
    path: 'C:\\Windows\\Fonts',
    name: 'Fonts',
    kind: 'folder',
    icon: 'folder',
    modified: '05/11/1998 08:04 AM',
    children: ['C:\\Windows\\Fonts\\MS Sans Serif.fon', 'C:\\Windows\\Fonts\\Terminal.fon'],
  },
  'C:\\Windows\\Fonts\\MS Sans Serif.fon': systemFile('C:\\Windows\\Fonts', 'MS Sans Serif.fon', 57344),
  'C:\\Windows\\Fonts\\Terminal.fon': systemFile('C:\\Windows\\Fonts', 'Terminal.fon', 28672),
  'C:\\Windows\\Temp': {
    path: 'C:\\Windows\\Temp',
    name: 'Temp',
    kind: 'folder',
    icon: 'folder',
    modified: '06/12/2026 12:14 AM',
    children: ['C:\\Windows\\Temp\\BOOTLOG.PRV', 'C:\\Windows\\Temp\\netsetup.tmp'],
  },
  'C:\\Windows\\Temp\\BOOTLOG.PRV': systemFile('C:\\Windows\\Temp', 'BOOTLOG.PRV', 4096),
  'C:\\Windows\\Temp\\netsetup.tmp': systemFile('C:\\Windows\\Temp', 'netsetup.tmp', 2048),
  'C:\\Windows\\WIN.INI': systemFile('C:\\Windows', 'WIN.INI', 8192),
  'C:\\Windows\\SYSTEM.INI': systemFile('C:\\Windows', 'SYSTEM.INI', 12288),
  'C:\\Windows\\EXPLORER.EXE': systemFile('C:\\Windows', 'EXPLORER.EXE', 220160, 'computer'),
  'C:\\Program Files': {
    path: 'C:\\Program Files',
    name: 'Program Files',
    kind: 'folder',
    icon: 'folder',
    modified: '06/12/2026 12:10 AM',
    children: ['C:\\Program Files\\Accessories', 'C:\\Program Files\\Internet Explorer'],
  },
  'C:\\Program Files\\Accessories': {
    path: 'C:\\Program Files\\Accessories',
    name: 'Accessories',
    kind: 'folder',
    icon: 'folder',
    modified: '06/12/2026 12:10 AM',
    children: [
      'C:\\Program Files\\Accessories\\MSPAINT.EXE',
      'C:\\Program Files\\Accessories\\NOTEPAD.EXE',
      'C:\\Program Files\\Accessories\\CALC.EXE',
      'C:\\Program Files\\Accessories\\SNDREC32.EXE',
    ],
  },
  'C:\\Program Files\\Accessories\\MSPAINT.EXE': appFile(
    'C:\\Program Files\\Accessories',
    'MSPAINT.EXE',
    'paint',
    'paint',
  ),
  'C:\\Program Files\\Accessories\\NOTEPAD.EXE': appFile(
    'C:\\Program Files\\Accessories',
    'NOTEPAD.EXE',
    'notepad',
    'notepad',
  ),
  'C:\\Program Files\\Accessories\\CALC.EXE': appFile(
    'C:\\Program Files\\Accessories',
    'CALC.EXE',
    'calculator',
    'calculator',
  ),
  'C:\\Program Files\\Accessories\\SNDREC32.EXE': appFile(
    'C:\\Program Files\\Accessories',
    'SNDREC32.EXE',
    'soundRecorder',
    'soundRecorder',
  ),
  'C:\\Program Files\\Internet Explorer': {
    path: 'C:\\Program Files\\Internet Explorer',
    name: 'Internet Explorer',
    kind: 'folder',
    icon: 'internet',
    modified: '06/12/2026 12:11 AM',
    children: ['C:\\Program Files\\Internet Explorer\\IEXPLORE.EXE'],
  },
  'C:\\Program Files\\Internet Explorer\\IEXPLORE.EXE': appFile(
    'C:\\Program Files\\Internet Explorer',
    'IEXPLORE.EXE',
    'internetExplorer',
    'internet',
  ),
  'C:\\Network': {
    path: 'C:\\Network',
    name: 'Network',
    kind: 'folder',
    icon: 'network',
    modified: '06/12/2026 12:12 AM',
    children: ['C:\\Network\\Portfolio.local', 'C:\\Network\\Ethernet Adapter'],
  },
  'C:\\Network\\Portfolio.local': {
    path: 'C:\\Network\\Portfolio.local',
    name: 'Portfolio.local',
    kind: 'app',
    icon: 'world',
    fileType: 'Network Location',
    size: 0,
    modified: '06/12/2026 12:12 AM',
    appId: 'projects',
  },
  'C:\\Network\\Ethernet Adapter': {
    path: 'C:\\Network\\Ethernet Adapter',
    name: 'Ethernet Adapter',
    kind: 'app',
    icon: 'modem',
    fileType: 'Network Device',
    size: 0,
    modified: '06/12/2026 12:12 AM',
    appId: 'network',
  },
}

export const criticalSystemRoot = 'C:\\Windows\\System32'

export function isPathWithin(path: string, root: string) {
  const normalizedPath = normalizePath(path).toLowerCase()
  const normalizedRoot = normalizePath(root).toLowerCase()
  return normalizedPath === normalizedRoot || normalizedPath.startsWith(`${normalizedRoot}\\`)
}

export function isCriticalSystemPath(path: string) {
  return isPathWithin(path, criticalSystemRoot) || normalizePath(path).toLowerCase() === 'c:\\windows'
}

function systemFolder(folder: string, name: string, children: string[]): FileSystemNode {
  return {
    path: `${folder}\\${name}`,
    name,
    kind: 'folder',
    icon: 'adminTools',
    modified: '05/11/1998 08:01 AM',
    children,
  }
}

function systemFile(folder: string, name: string, size: number, appId?: AppId): FileSystemNode {
  return {
    path: `${folder}\\${name}`,
    name,
    kind: appId ? 'app' : 'file',
    icon: appId ? 'windowsFile' : 'windowsFile',
    fileType: appId ? 'Application' : 'System File',
    size,
    modified: '05/11/1998 08:01 AM',
    appId,
    content: [
      `${name}`,
      'Simulated Windows 98 portfolio system component.',
      'This placeholder contains no Microsoft code or real operating system data.',
      'It exists only inside the browser filesystem model.',
    ].join('\n'),
  }
}

function controlFile(name: string, section: string): FileSystemNode {
  return {
    path: `C:\\Windows\\Control Panel\\${name}`,
    name,
    kind: 'app',
    icon: 'controlPanel',
    fileType: 'Control Panel Extension',
    size: 16384,
    modified: '05/11/1998 08:03 AM',
    appId: 'controlPanel',
    content: section,
  }
}

function appFile(folder: string, name: string, appId: AppId, icon: IconKey): FileSystemNode {
  return {
    path: `${folder}\\${name}`,
    name,
    kind: 'app',
    icon,
    fileType: 'Application',
    size: 65536,
    modified: '06/12/2026 12:13 AM',
    appId,
  }
}

export const fileSystemNodes = nodes

export function normalizePath(path: string) {
  const cleaned = path.trim().replace(/\//g, '\\')
  if (!cleaned || cleaned.toUpperCase() === 'C:') {
    return 'C:\\'
  }
  if (cleaned === '\\') {
    return 'C:\\'
  }
  const withDrive = /^[a-z]:/i.test(cleaned) ? cleaned : `C:\\${cleaned.replace(/^\\+/, '')}`
  const parts = withDrive.split('\\').filter(Boolean)
  const drive = parts.shift()?.toUpperCase().replace(':', '') ?? 'C'
  const stack: string[] = []
  parts.forEach((part) => {
    if (part === '.') return
    if (part === '..') stack.pop()
    else stack.push(part)
  })
  return stack.length ? `${drive}:\\${stack.join('\\')}` : `${drive}:\\`
}

export function getNode(path: string) {
  return fileSystemNodes[normalizePath(path)]
}

export function listDirectory(path: string) {
  const node = getNode(path)
  if (!node || node.kind !== 'folder') {
    return []
  }
  return (node.children ?? []).map((childPath) => fileSystemNodes[childPath]).filter(Boolean)
}

export function getParentPath(path: string) {
  const normalized = normalizePath(path)
  if (normalized === 'C:\\') {
    return 'C:\\'
  }
  const slash = normalized.lastIndexOf('\\')
  return slash <= 2 ? 'C:\\' : normalized.slice(0, slash)
}

export function resolvePath(currentPath: string, target: string) {
  if (!target || target === '.') {
    return normalizePath(currentPath)
  }
  if (/^[a-z]:/i.test(target)) {
    return normalizePath(target)
  }
  if (target === '..') {
    return getParentPath(currentPath)
  }
  const base = normalizePath(currentPath)
  return normalizePath(`${base === 'C:\\' ? base : `${base}\\`}${target}`)
}

export function getFileContent(path: string) {
  const node = getNode(path)
  return node?.content ?? ''
}
