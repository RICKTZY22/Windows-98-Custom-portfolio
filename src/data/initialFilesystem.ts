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
import { aiUprisingDocHtml } from './aiUprisingDoc'
import { galleryMusic, galleryPhotos, galleryVideos } from './media'
import { SYSTEM_FILE_CATALOG } from './systemFileCatalog'

export const REQUIRED_SYSTEM_FILES: string[] = REQUIRED

const MODERN_STAMP = '06/12/2026 12:00 AM'
const RETRO_STAMP = '05/11/1998 08:01 AM'

function systemFileContent(name: string): string {
  return [
    name,
    'Simulated Windows 98 system component.',
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
  'REM  Windows 98 - tuned for maximum nostalgia',
  'REM ------------------------------------------',
  'ECHO Loading Windows 98...',
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
  'REM 64 MB ought to be enough for anybody',
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

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function persistenceNotesDocHtml(): string {
  const block = (line: string) =>
    line.trim().startsWith('<')
      ? line
      : `<p style="margin:0 0 7px; line-height:1.42">${escapeHtml(line)}</p>`
  const section = (title: string, body: string[]) =>
    [
      '<div style="margin:0 0 18px">',
      `<div style="font-size:18px; font-weight:700; color:#003399; border-bottom:1px solid #b5b5b5; padding-bottom:4px; margin-bottom:8px">${escapeHtml(title)}</div>`,
      ...body.map(block),
      '</div>',
    ].join('')

  const bulletList = (items: string[]) =>
    `<ul style="margin:6px 0 0 22px; padding:0; line-height:1.4">${items
      .map((item) => `<li style="margin:3px 0">${escapeHtml(item)}</li>`)
      .join('')}</ul>`

  return [
    '<div style="font-family:Arial,Helvetica,sans-serif; color:#111; font-size:14px; line-height:1.35">',
    '<div style="border:2px solid #003399; padding:16px 18px; margin-bottom:18px; background:#f7f9ff">',
    '<div style="font-size:26px; font-weight:700; color:#003399; margin-bottom:4px">Persistence and Loading Notes</div>',
    '<div style="font-size:13px; color:#555">Windows 98 Web Edition technical note - browser-only storage, lazy loading, and optimization work.</div>',
    '</div>',
    section('What persistence means in this simulated OS', [
      'The simulation keeps a Windows 98 disk in the visitor browser so actions can feel real between sessions.',
      'If a visitor deletes a simulated file, changes a theme, moves icons, or imports local media, that state can be restored the next time they open the same browser profile.',
      'This is not a real operating system. It cannot repair, scan, or modify the visitor actual Windows files.',
    ]),
    section('Where data is stored', [
      'Small simulated OS state is saved in browser storage. This includes the virtual filesystem tree, desktop layout, settings, window state, and safe app preferences.',
      'Large user-imported media is stored separately in IndexedDB. The simulated disk only keeps a lightweight reference, so localStorage does not get filled with large base64 files.',
      bulletList([
        'localStorage: small settings and simulated filesystem metadata.',
        'IndexedDB: user-dropped images, audio, and video blobs.',
        'Vercel / Blob storage: only project-owned hosted assets, not private user imports.',
      ]),
    ]),
    section('How user media imports work', [
      'When a visitor drags a picture, sound, or video into the Gallery app, the file stays on that visitor device inside the browser sandbox.',
      'The file is not uploaded to any server, Vercel Blob, GitHub, or any backend endpoint.',
      'Imported media is private to that browser profile. If the visitor clears site data, switches browsers, or uses another device, those local imports are gone.',
    ]),
    section('Lazy chunk loading', [
      'The app uses lazy loading so heavier programs are loaded only when the visitor opens them.',
      'This keeps the first boot lighter and lets the desktop appear faster while apps like Paint, WordPad, media players, system tools, and games can load as separate chunks.',
      'The goal is to preserve the nostalgic OS feeling without forcing every feature to download before the visitor can interact with the desktop.',
    ]),
    section('Current optimization work', [
      'The next optimization pass focuses on clearer module boundaries, smaller app bundles, and keeping UI markup separate from OS state rules.',
      'Media handling is being moved toward safer browser-native storage patterns, with IndexedDB handling large local files and the virtual filesystem handling names, paths, and metadata.',
      bulletList([
        'Keep large media out of localStorage.',
        'Load app chunks only when needed.',
        'Keep simulated OS state predictable and recoverable.',
        'Make driver, BIOS, recovery, and error behavior educational and browser-only.',
      ]),
    ]),
    section('Safety notes', [
      'All recovery, driver, BIOS, malware-awareness, and system-file behavior is simulated for education and storytelling.',
      'The app may display warnings or disabled features when simulated drivers are missing, but those effects stay inside the simulation.',
      'Nothing here has access to the visitor real operating system, private folders, installed drivers, or hardware.',
    ]),
    '</div>',
  ].join('')
}

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

const WIN98_PORTFOLIO_ROOT = 'C:\\Projects\\Windows 98 Web Edition'
const WIN98_PORTFOLIO_STAMP = '06/17/2026 09:18 PM'

type ScaffoldFile = FileOpts & { path: string }

const SAMPLE_PICTURE_FILES: ScaffoldFile[] = []

function win98PortfolioPath(relativePath: string): string {
  return `${WIN98_PORTFOLIO_ROOT}\\${relativePath}`
}

// The documentation PDFs (the AI case study plus the docx-derived PDFs) are
// confidential and must never ship inside the simulated OS, so nothing is seeded
// here. removePortfolioDocArtifacts() also strips them from older persisted disks.
const WIN98_PORTFOLIO_PDF_FILES: ScaffoldFile[] = []

const WIN98_PORTFOLIO_FOLDER_PATHS = [
  'public',
  'public\\cursors',
  'public\\games',
  'public\\icons',
  'public\\icons\\win98',
  'public\\js-dos',
  'public\\media',
  'public\\sounds',
  'src',
  'src\\components',
  'src\\components\\apps',
  'src\\components\\shell',
  'src\\components\\system',
  'src\\data',
  'src\\os',
  'src\\os\\__tests__',
  'src\\styles',
  'tools',
].map(win98PortfolioPath)

const WIN98_PORTFOLIO_FILE_PATHS = [
  '.env.example',
  'eslint.config.js',
  'index.html',
  'LICENSE',
  'package.json',
  'package-lock.json',
  'README.md',
  'tsconfig.app.json',
  'tsconfig.json',
  'tsconfig.node.json',
  'vite.config.ts',
  'public\\sounds\\README.txt',
  'src\\App.tsx',
  'src\\index.css',
  'src\\main.tsx',
  'src\\types.ts',
  'src\\vite-env.d.ts',
  'src\\components\\apps\\ExplorerApp.tsx',
  'src\\components\\apps\\ExplorerApp.css',
  'src\\components\\apps\\InternetExplorerApp.tsx',
  'src\\components\\apps\\PaintApp.tsx',
  'src\\components\\apps\\PdfViewerApp.tsx',
  'src\\components\\apps\\PdfViewerApp.css',
  'src\\components\\apps\\TerminalApp.tsx',
  'src\\components\\apps\\WordPadApp.tsx',
  'src\\components\\shell\\DesktopIcon.tsx',
  'src\\components\\shell\\StartMenu.tsx',
  'src\\components\\shell\\Taskbar.tsx',
  'src\\components\\shell\\WindowFrame.tsx',
  'src\\components\\system\\BootScreen.tsx',
  'src\\components\\system\\CrashScreen.tsx',
  'src\\data\\apps.ts',
  'src\\data\\bios.ts',
  'src\\data\\icons.ts',
  'src\\data\\initialFilesystem.ts',
  'src\\data\\themes.ts',
  'src\\os\\audio.ts',
  'src\\os\\commands.ts',
  'src\\os\\filesystem.ts',
  'src\\os\\persistence.ts',
  'src\\os\\recovery.ts',
  'src\\os\\store.tsx',
  'src\\os\\useOs.ts',
  'src\\os\\wordpadFormatting.ts',
  'src\\os\\__tests__\\os.test.ts',
  'src\\styles\\base.css',
  'src\\styles\\common.css',
  'src\\styles\\desktop.css',
  'src\\styles\\file-manager.css',
  'src\\styles\\responsive.css',
  'tools\\generate_apps_features_explained.py',
  'tools\\generate_build_documentation_explained.py',
].map(win98PortfolioPath)

const WIN98_PORTFOLIO_SEED_PATHS = [
  WIN98_PORTFOLIO_ROOT,
  ...WIN98_PORTFOLIO_FOLDER_PATHS,
  ...WIN98_PORTFOLIO_FILE_PATHS,
  ...WIN98_PORTFOLIO_PDF_FILES.map((file) => file.path),
]

function win98PortfolioFileType(relativePath: string): string | undefined {
  const lower = relativePath.toLowerCase()
  if (lower.endsWith('.tsx')) return 'React TypeScript Source'
  if (lower.endsWith('.ts')) return 'TypeScript Source'
  if (lower.endsWith('.css')) return 'Style Sheet'
  if (lower.endsWith('.json')) return 'JSON File'
  if (lower.endsWith('.md')) return 'Markdown Document'
  if (lower.endsWith('.py')) return 'Python Source'
  if (lower.endsWith('.docx')) return 'Microsoft Word Document'
  if (lower.endsWith('.pdf')) return 'PDF Document'
  if (lower.endsWith('.env.example')) return 'Environment Example'
  return undefined
}

function win98PortfolioFileContent(relativePath: string): string {
  const normalized = relativePath.replace(/\\/g, '/')
  const name = normalized.slice(normalized.lastIndexOf('/') + 1)

  if (normalized === 'README.md') {
    return [
      '# Windows 98 Web Edition',
      '',
      'Interactive React OS simulation presented as a nostalgic Windows 98-style desktop.',
      '',
      '## What is inside',
      '- Virtual filesystem seeded from src/data/initialFilesystem.ts.',
      '- Movable/resizable windows and a taskbar-driven shell.',
      '- Apps for Explorer, WordPad, Paint, Terminal, Internet Explorer, media, games, contact, projects, and system tools.',
      '- Documentation files under Documentation/, docs/, generated DOCX files, and bundled PDF exports.',
    ].join('\n')
  }

  if (normalized === 'package.json') {
    return JSON.stringify(
      {
        name: 'windows-98-web-edition',
        type: 'module',
        scripts: { dev: 'vite', build: 'tsc -b && vite build', lint: 'eslint .', test: 'vitest run' },
        dependencies: { react: '^19.2.6', 'react-dom': '^19.2.6', '98.css': '^0.1.21', 'js-dos': '^8.3.20' },
      },
      null,
      2,
    )
  }

  if (normalized === 'docs/README.md') {
    return [
      '# Documentation Index',
      '',
      '- Build documentation explains how the project was assembled.',
      '- Algorithms and patterns explain state, filesystem, command, and UI patterns.',
      '- Apps and features explains each app and how it connects to the OS shell.',
      '- PDF exports are bundled for reading inside the simulated OS.',
    ].join('\n')
  }

  if (normalized === 'docs/apps/README.md') {
    return [
      '# App Documentation',
      '',
      'Each app document explains user behavior, component boundaries, OS integration, and notable implementation details.',
    ].join('\n')
  }

  if (normalized.endsWith('.docx')) {
    return `${name}\n\nGenerated documentation artifact stored in docs/docx in the real project.`
  }

  if (normalized === 'vite.config.ts') return "import { defineConfig } from 'vite'\nimport react from '@vitejs/plugin-react'\n\nexport default defineConfig({ plugins: [react()] })\n"
  if (normalized === 'index.html') return '<div id="root"></div><script type="module" src="/src/main.tsx"></script>'
  if (normalized === 'src/main.tsx') return "import { createRoot } from 'react-dom/client'\nimport App from './App.tsx'\nimport './index.css'\n\ncreateRoot(document.getElementById('root')!).render(<App />)\n"
  if (normalized === 'src/App.tsx') return "export default function App() {\n  return <Desktop />\n}\n"
  if (normalized === 'src/data/initialFilesystem.ts') return 'Seeds C:\\\\, My Documents, Projects, Windows, Program Files, media folders, and project source trees.'
  if (normalized === 'src/os/filesystem.ts') return 'Pure immutable virtual filesystem engine with DOS-style path handling, file associations, recycle bin, and protected system paths.'
  if (normalized === 'src/os/store.tsx') return 'React OS provider for windows, startup, persistence, filesystem operations, networking, themes, audio, and message boxes.'
  if (normalized === 'src/os/commands.ts') return 'Command interpreter for the simulated MS-DOS Prompt.'

  return [
    name,
    '',
    `Path: ${normalized}`,
    'Windows 98 Web Edition project file shown inside the virtual C: drive.',
  ].join('\n')
}

function win98PortfolioFileOpts(path: string): FileOpts {
  const relativePath = path.slice(WIN98_PORTFOLIO_ROOT.length + 1)
  const isDocument = relativePath.toLowerCase().endsWith('.docx')
  return {
    content: win98PortfolioFileContent(relativePath),
    icon: isDocument ? 'wordpad' : 'textFile',
    fileType: win98PortfolioFileType(relativePath),
    appId: isDocument ? 'wordpad' : 'notepad',
    appPayload: { filePath: path },
    modified: WIN98_PORTFOLIO_STAMP,
  }
}

const GALLERY_PHOTO_FILES: ScaffoldFile[] = galleryPhotos.map((item) => ({
  path: `C:\\My Pictures\\${item.name}`,
  dataUrl: item.src,
  icon: 'imageFile',
  fileType: 'Image',
  size: 0,
  modified: MODERN_STAMP,
}))
const GALLERY_MUSIC_FILES: ScaffoldFile[] = galleryMusic.map((item) => ({
  path: `C:\\My Documents\\Music\\${item.name}`,
  dataUrl: item.src,
  icon: 'audioFile',
  fileType: 'Audio File',
  size: 0,
  modified: MODERN_STAMP,
}))
const GALLERY_VIDEO_FILES: ScaffoldFile[] = galleryVideos.map((item) => ({
  path: `C:\\My Videos\\${item.name}`,
  dataUrl: item.src,
  icon: 'videoFile',
  fileType: 'Video Clip',
  size: 0,
  modified: MODERN_STAMP,
}))

const EXTERNAL_MEDIA_SEED_PATHS = new Set([
  ...GALLERY_PHOTO_FILES.map((file) => file.path),
  ...GALLERY_MUSIC_FILES.map((file) => file.path),
  ...GALLERY_VIDEO_FILES.map((file) => file.path),
])

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

  function systemIconFor(path: string, name: string, attributes?: FsAttributes): IconKey {
    switch (attributes?.driverType) {
      case 'audio':
        return 'audioDriverFile'
      case 'video':
        return 'videoDriverFile'
      case 'network':
        return 'networkDriverFile'
      case 'input':
        return 'inputDriverFile'
      case 'storage':
        return 'driverFile'
    }
    if (REQUIRED.includes(path)) return 'coreSystemFile'
    return iconForFileName(name)
  }

  function sysFile(path: string, size: number, opts: FileOpts = {}): FsNode {
    const name = path.slice(path.lastIndexOf('\\') + 1)
    return file(path, {
      size,
      content: opts.content ?? systemFileContent(name),
      icon: opts.icon ?? systemIconFor(path, name, opts.attributes),
      modified: RETRO_STAMP,
      ...opts,
    })
  }

  // ----- drive root -----
  const root = folder('C:\\', 'hardDrive')
  root.name = 'Windows 98 (C:)'

  file('C:\\AUTOEXEC.BAT', { content: AUTOEXEC_BAT, modified: RETRO_STAMP })
  file('C:\\CONFIG.SYS', {
    content: CONFIG_SYS,
    modified: RETRO_STAMP,
    icon: 'iniFile',
    fileType: 'System File',
  })

  // ----- My Documents -----
  folder('C:\\My Documents', 'projects', '06/12/2026 12:03 AM')
  file('C:\\My Documents\\The AI Uprising.doc', {
    content: aiUprisingDocHtml,
    icon: 'wordpad',
    appId: 'wordpad',
    appPayload: { filePath: 'C:\\My Documents\\The AI Uprising.doc' },
    fileType: 'WordPad Document',
    modified: '06/27/2026 10:00 AM',
  })
  file('C:\\My Documents\\Persistence and Loading Notes.doc', {
    content: persistenceNotesDocHtml(),
    icon: 'wordpad',
    appId: 'wordpad',
    appPayload: { filePath: 'C:\\My Documents\\Persistence and Loading Notes.doc' },
    fileType: 'WordPad Document',
    modified: '06/29/2026 11:15 AM',
  })
  folder('C:\\My Documents\\Music', 'folder', '06/12/2026 12:07 AM')
  for (const { path, ...opts } of GALLERY_MUSIC_FILES) {
    file(path, opts)
  }
  // Sound Recorder saves .wav clips here; Media Player lists them for playback.
  folder('C:\\My Documents\\My Recordings', 'folder', '06/12/2026 12:07 AM')
  // Paint saves its bitmaps here (kept out of My Pictures / the Gallery).
  folder('C:\\My Documents\\Paint', 'folder', '06/12/2026 12:07 AM')
  // Hidden, passcode-protected folder: Explorer ghosts the icon and prompts for
  // the code before revealing the contents (see ExplorerApp's lock gate).
  const privateFolder = folder('C:\\My Documents\\Private', 'folder', '06/12/2026 12:08 AM')
  privateFolder.attributes = { hidden: true, passcode: '0722' }
  file('C:\\My Documents\\Private\\Secret Note.txt', {
    content: [
      'Private',
      '=======',
      '',
      'This folder is locked with a passcode.',
      'Only someone who knows the code can read what is kept here.',
    ].join('\n'),
    modified: '06/12/2026 12:08 AM',
  })
  // Harmless awareness easter egg: a deliberately tempting "do not touch" file
  // tucked inside the locked folder. Opening it launches a SIMULATED runaway
  // dialog storm (SetupSafetyApp) that ends in a fake crash, then recovers with
  // a do's-and-don'ts safety lesson. No real files, downloads, network traffic,
  // or host commands are ever touched — it lives entirely in this React app.
  file('C:\\My Documents\\Private\\testdontouch.exe', {
    content: 'Simulated program. This is a harmless in-browser awareness demo.',
    icon: 'sysFile',
    fileType: 'Application',
    appId: 'setupSafety',
    modified: '06/22/2026 12:45 PM',
  })

  // ----- Projects -----
  folder('C:\\Projects', 'projects', '06/13/2026 12:35 AM')

  if (!nodes[WIN98_PORTFOLIO_ROOT]) {
    folder(WIN98_PORTFOLIO_ROOT, 'folder', WIN98_PORTFOLIO_STAMP)
  }
  for (const path of WIN98_PORTFOLIO_FOLDER_PATHS) {
    if (!nodes[path]) {
      folder(path, 'folder', WIN98_PORTFOLIO_STAMP)
    }
  }
  for (const path of WIN98_PORTFOLIO_FILE_PATHS) {
    if (!nodes[path]) {
      file(path, win98PortfolioFileOpts(path))
    }
  }
  for (const { path, ...opts } of WIN98_PORTFOLIO_PDF_FILES) {
    if (!nodes[path]) {
      file(path, opts)
    }
  }

  // ----- My Pictures (cleaned out - drop your own images here) -----
  folder('C:\\My Pictures', 'folder', '06/12/2026 12:04 AM')
  for (const { path, ...opts } of [...SAMPLE_PICTURE_FILES, ...GALLERY_PHOTO_FILES]) {
    file(path, opts)
  }

  // ----- My Videos (drop your own clips here) -----
  folder('C:\\My Videos', 'folder', '06/12/2026 12:04 AM')
  for (const { path, ...opts } of GALLERY_VIDEO_FILES) {
    file(path, opts)
  }

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
  sysFile('C:\\Windows\\System32\\winsock.dll', 42160, { attributes: { driverType: 'network' } })
  sysFile('C:\\Windows\\System32\\wsock32.dll', 66560, { attributes: { driverType: 'network' } })
  sysFile('C:\\Windows\\System32\\wininet.dll', 372736)
  sysFile('C:\\Windows\\System32\\rasapi32.dll', 217088)
  sysFile('C:\\Windows\\System32\\setupapi.dll', 446464)
  sysFile('C:\\Windows\\System32\\mmsystem.dll', 71680, { attributes: { driverType: 'audio' } })
  sysFile('C:\\Windows\\System32\\control.exe', 112640, { appId: 'controlPanel' })
  sysFile('C:\\Windows\\System32\\rundll32.exe', 24576)
  sysFile('C:\\Windows\\System32\\regsvr32.exe', 36864)
  sysFile('C:\\Windows\\System32\\systray.exe', 40960)
  sysFile('C:\\Windows\\System32\\netcfg.dll', 94208, { attributes: { driverType: 'network' } })
  sysFile('C:\\Windows\\System32\\portfolio.sys', 32768)
  sysFile('C:\\Windows\\System32\\vmm32.vxd', 932864)
  sysFile('C:\\Windows\\System32\\configmg.vxd', 125952)
  sysFile('C:\\Windows\\System32\\vcomm.vxd', 65536)
  sysFile('C:\\Windows\\System32\\vflatd.vxd', 77824)
  sysFile('C:\\Windows\\System32\\gpu.vxd', 49152, { attributes: { driverType: 'video' } })
  sysFile('C:\\Windows\\System32\\display.drv', 98304, { attributes: { driverType: 'video' } })
  sysFile('C:\\Windows\\System32\\keyboard.drv', 28672, { attributes: { driverType: 'input' } })
  sysFile('C:\\Windows\\System32\\mouse.drv', 24576, { attributes: { driverType: 'input' } })
  sysFile('C:\\Windows\\System32\\sound.drv', 53248, { attributes: { driverType: 'audio' } })
  // Core libraries
  sysFile('C:\\Windows\\System32\\oleaut32.dll', 593920)
  sysFile('C:\\Windows\\System32\\olepro32.dll', 90112)
  sysFile('C:\\Windows\\System32\\shlwapi.dll', 286720)
  sysFile('C:\\Windows\\System32\\shdocvw.dll', 1175552)
  sysFile('C:\\Windows\\System32\\mshtml.dll', 2342912)
  sysFile('C:\\Windows\\System32\\urlmon.dll', 446464)
  sysFile('C:\\Windows\\System32\\version.dll', 49152)
  sysFile('C:\\Windows\\System32\\imm32.dll', 110592)
  sysFile('C:\\Windows\\System32\\lz32.dll', 20480)
  sysFile('C:\\Windows\\System32\\mpr.dll', 53248)
  sysFile('C:\\Windows\\System32\\netapi32.dll', 184320)
  sysFile('C:\\Windows\\System32\\secur32.dll', 65536)
  sysFile('C:\\Windows\\System32\\crypt32.dll', 372736)
  sysFile('C:\\Windows\\System32\\msvcp60.dll', 401408)
  sysFile('C:\\Windows\\System32\\msvcirt.dll', 274432)
  sysFile('C:\\Windows\\System32\\riched20.dll', 434176)
  sysFile('C:\\Windows\\System32\\riched32.dll', 245760)
  sysFile('C:\\Windows\\System32\\mapi32.dll', 712704)
  sysFile('C:\\Windows\\System32\\winmm.dll', 176128, { attributes: { driverType: 'audio' } })
  sysFile('C:\\Windows\\System32\\dsound.dll', 311296, { attributes: { driverType: 'audio' } })
  sysFile('C:\\Windows\\System32\\ddraw.dll', 282624, { attributes: { driverType: 'video' } })
  sysFile('C:\\Windows\\System32\\dplayx.dll', 204800)
  sysFile('C:\\Windows\\System32\\opengl32.dll', 696320)
  sysFile('C:\\Windows\\System32\\glu32.dll', 122880)
  sysFile('C:\\Windows\\System32\\twain32.dll', 86016)
  sysFile('C:\\Windows\\System32\\msgsm32.acm', 24576)
  sysFile('C:\\Windows\\System32\\wdmaud.drv', 28672, { attributes: { driverType: 'audio' } })
  sysFile('C:\\Windows\\System32\\msmixmgr.dll', 16384)
  // 16-bit core (kept for legacy apps)
  sysFile('C:\\Windows\\System32\\krnl386.exe', 126976)
  sysFile('C:\\Windows\\System32\\gdi.exe', 342016)
  sysFile('C:\\Windows\\System32\\user.exe', 503808)
  sysFile('C:\\Windows\\System32\\mmtask.tsk', 1184)
  sysFile('C:\\Windows\\System32\\ddhelp.exe', 53248)

  folder('C:\\Windows\\System32\\Drivers', 'adminTools', RETRO_STAMP)
  sysFile('C:\\Windows\\System32\\Drivers\\ndis.vxd', 159744, { attributes: { driverType: 'network' } })
  sysFile('C:\\Windows\\System32\\Drivers\\tcpip.sys', 196608, { attributes: { driverType: 'network' } })
  sysFile('C:\\Windows\\System32\\Drivers\\el90xnd3.sys', 45056, { attributes: { driverType: 'network' } })
  sysFile('C:\\Windows\\System32\\Drivers\\vga.drv', 73728, { attributes: { driverType: 'video' } })
  sysFile('C:\\Windows\\System32\\Drivers\\mousehid.vxd', 40960, { attributes: { driverType: 'input' } })
  sysFile('C:\\Windows\\System32\\Drivers\\printer.drv', 36864)

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
  folder('C:\\Windows\\Desktop', 'computer', '05/11/1998 08:04 AM')
  sysFile('C:\\Windows\\Desktop\\Portfolio OS.lnk', 1024, {
    icon: 'projects',
    fileType: 'Shortcut',
    appId: 'explorer',
    appPayload: { path: WIN98_PORTFOLIO_ROOT },
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
  file('C:\\Program Files\\Accessories\\KODAKIMG.EXE', {
    size: 73728,
    icon: 'imageFile',
    appId: 'imageViewer',
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
  file('C:\\Program Files\\Accessories\\VIDPLAY.EXE', {
    size: 65536,
    icon: 'videoFile',
    appId: 'videoPlayer',
    modified: '06/12/2026 12:13 AM',
  })
  folder('C:\\Program Files\\Games', 'folder', '06/12/2026 12:14 AM')
  file('C:\\Program Files\\Games\\WOLF3D.EXE', {
    size: 1457664,
    icon: 'wolfenstein',
    fileType: 'Application',
    appId: 'dosGame',
    appPayload: { url: '/games/wolf3d.jsdos?v=2', windowTitle: 'Wolfenstein 3D' },
    modified: '05/05/1992 12:00 AM',
  })
  file('C:\\Program Files\\Games\\DOOM.EXE', {
    size: 2094592,
    icon: 'doom',
    fileType: 'Application',
    appId: 'dosGame',
    appPayload: { url: '/games/doom.jsdos?v=2', windowTitle: 'DOOM' },
    modified: '12/10/1993 12:00 AM',
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
  file('C:\\Network\\Win98.local', {
    size: 0,
    icon: 'world',
    fileType: 'Network Location',
    appId: 'explorer',
    appPayload: { path: WIN98_PORTFOLIO_ROOT },
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
  'C:\\My Pictures',
  ...SAMPLE_PICTURE_FILES.map((file) => file.path),
  ...GALLERY_PHOTO_FILES.map((file) => file.path),
  'C:\\My Videos',
  ...GALLERY_VIDEO_FILES.map((file) => file.path),
  'C:\\My Documents\\Music',
  ...GALLERY_MUSIC_FILES.map((file) => file.path),
  'C:\\My Documents\\My Recordings',
  'C:\\My Documents\\Paint',
  'C:\\My Documents\\Private',
  'C:\\My Documents\\Private\\Secret Note.txt',
  'C:\\My Documents\\Private\\testdontouch.exe',
  'C:\\My Documents\\The AI Uprising.doc',
  'C:\\My Documents\\Persistence and Loading Notes.doc',
  'C:\\Projects',
  ...WIN98_PORTFOLIO_SEED_PATHS,
  'C:\\Program Files\\Accessories\\WORDPAD.EXE',
  'C:\\Program Files\\Accessories\\KODAKIMG.EXE',
  'C:\\Program Files\\Accessories\\VIDPLAY.EXE',
  'C:\\Program Files\\Games',
  'C:\\Program Files\\Games\\WOLF3D.EXE',
  'C:\\Program Files\\Games\\DOOM.EXE',
]

// Seed artifacts from older disk layouts. A persisted disk migrated forward
// keeps these stale files forever (the seed top-up only ADDS), so we explicitly
// remove them: the demo images that used to fill My Pictures, the old duplicate
// Resume.txt, and the flat C:\Projects files now organized into per-project folders.
const LEGACY_ARTIFACT_PATHS = [
  'C:\\My Pictures\\Welcome.bmp',
  'C:\\My Pictures\\desktop-clouds.bmp',
  'C:\\My Pictures\\portfolio-sketch.bmp',
  'C:\\My Pictures\\project-preview.url',
  'C:\\Windows\\Desktop\\setup.bat',
  'C:\\Windows\\Command\\setup.bat',
  'C:\\My Documents\\Resume.txt',
  'C:\\My Documents\\Education.txt',
  // Personal files dropped when the personal content was removed. They are no
  // longer seeded, but a disk saved by an older build still carries them.
  'C:\\My Documents\\Resume.doc',
  'C:\\My Documents\\About Me.txt',
  'C:\\My Documents\\Contact.url',
]

const USER_MEDIA_ROOTS = ['C:\\My Pictures\\', 'C:\\My Videos\\', 'C:\\My Documents\\Music\\']

function removeNodeByPath(fs: FsState, path: string): FsState {
  if (!fs.nodes[path]) return fs
  const nodes = { ...fs.nodes }
  delete nodes[path]
  const parent = parentPath(path)
  const parentNode = nodes[parent]
  if (parentNode?.children?.includes(path)) {
    nodes[parent] = { ...parentNode, children: parentNode.children.filter((child) => child !== path) }
  }
  return { ...fs, nodes }
}

function removeSeededUserMedia(fs: FsState): FsState {
  let next = fs
  for (const node of Object.values(fs.nodes)) {
    const isSeededUserMedia =
      node.kind === 'file' &&
      typeof node.dataUrl === 'string' &&
      node.dataUrl.startsWith('/media/user/') &&
      USER_MEDIA_ROOTS.some((root) => node.path.startsWith(root))
    if (isSeededUserMedia) {
      next = removeNodeByPath(next, node.path)
    }
  }
  return next
}

function removeStaleHostedMediaSeeds(fs: FsState): FsState {
  let next = fs
  for (const node of Object.values(fs.nodes)) {
    const isStaleHostedSeed =
      node.kind === 'file' &&
      typeof node.dataUrl === 'string' &&
      /^https?:\/\//i.test(node.dataUrl) &&
      USER_MEDIA_ROOTS.some((root) => node.path.startsWith(root)) &&
      !EXTERNAL_MEDIA_SEED_PATHS.has(node.path)
    if (isStaleHostedSeed) {
      next = removeNodeByPath(next, node.path)
    }
  }
  return next
}

function normalizePortfolioLaunchers(fs: FsState): FsState {
  const launcherPaths = [
    'C:\\Windows\\Desktop\\Portfolio OS.lnk',
    'C:\\Network\\Portfolio.local',
    'C:\\Network\\Win98.local',
  ]
  let changed = false
  const nodes = { ...fs.nodes }
  for (const path of launcherPaths) {
    const node = nodes[path]
    if (!node || node.appId === 'explorer' && node.appPayload?.path === WIN98_PORTFOLIO_ROOT) continue
    nodes[path] = {
      ...node,
      appId: 'explorer',
      appPayload: { path: WIN98_PORTFOLIO_ROOT },
    }
    changed = true
  }
  return changed ? { ...fs, nodes } : fs
}

function normalizeBitmapIcons(fs: FsState): FsState {
  let changed = false
  const nodes = { ...fs.nodes }
  for (const [path, node] of Object.entries(nodes)) {
    if (node.kind === 'file' && path.toLowerCase().endsWith('.bmp') && node.icon !== 'paint') {
      nodes[path] = { ...node, icon: 'paint' }
      changed = true
    }
  }
  return changed ? { ...fs, nodes } : fs
}

function shouldRefreshExternalMediaSeed(existing: FsNode, seedNode: FsNode): boolean {
  if (existing.kind !== 'file' || seedNode.kind !== 'file') return false
  if (!EXTERNAL_MEDIA_SEED_PATHS.has(seedNode.path)) return false
  if (!seedNode.dataUrl || existing.dataUrl === seedNode.dataUrl) return false

  // Paint/user-created images are saved as data: URLs and should stay personal.
  // Blob/hosted seed entries are safe to refresh when their public URL changes.
  return !existing.dataUrl || /^https?:\/\//i.test(existing.dataUrl)
}

// Confidential documentation subtrees that must never ship inside the portfolio
// OS. They are no longer seeded (see WIN98_PORTFOLIO_PDF_FILES / FOLDER_PATHS),
// and this strips them from disks seeded by older builds so they cannot reappear.
// Note: only the case-study PDFs (Documentation\PDFs) and the docs/ source dump
// are confidential — the per-project Documentation\*.md showcase markdown stays.
const PURGED_PORTFOLIO_DOC_ROOTS = [
  `${WIN98_PORTFOLIO_ROOT}\\docs`,
  `${WIN98_PORTFOLIO_ROOT}\\Documentation\\PDFs`,
  `${WIN98_PORTFOLIO_ROOT}\\public\\docs`,
]

// The project folder was renamed from "Windows 98 Portfolio OS" to
// "Windows 98 Web Edition". A disk saved by an older build still carries the old
// subtree, so Explorer would show the project twice. Strip the old root; the new
// one is seeded by WIN98_PORTFOLIO_SEED_PATHS in the normal pass.
const RENAMED_PROJECT_ROOTS = [
  'C:\\Projects\\Windows 98 Portfolio OS',
  // Personal project folders, removed when the personal content was stripped out.
  'C:\\Projects\\Between Two Ruins',
  'C:\\Projects\\PLMun Inventory Nexus',
  'C:\\Projects\\Canlas Inventory System',
]

function removePortfolioDocArtifacts(fs: FsState): FsState {
  let next = fs
  for (const root of [...PURGED_PORTFOLIO_DOC_ROOTS, ...RENAMED_PROJECT_ROOTS]) {
    const prefix = `${root}\\`
    for (const path of Object.keys(next.nodes)) {
      if (path === root || path.startsWith(prefix)) {
        next = removeNodeByPath(next, path)
      }
    }
  }
  return next
}

// A saved disk from an older build can carry a folder whose child list names the
// same path twice (e.g. a duplicate "Resume.doc" in My Documents). attachChild
// dedupes on new inserts but never cleaned existing lists, so the duplicate
// persists and Explorer shows the file twice. Strip repeated entries from every
// folder's child list. This removes only redundant references; no real node or
// file content is touched.
function dedupeFolderChildren(fs: FsState): FsState {
  let changed = false
  const nodes = { ...fs.nodes }
  for (const [path, node] of Object.entries(nodes)) {
    if (node.kind !== 'folder' || !node.children) continue
    const seen = new Set<string>()
    const deduped = node.children.filter((child) => {
      if (seen.has(child)) return false
      seen.add(child)
      return true
    })
    if (deduped.length !== node.children.length) {
      nodes[path] = { ...node, children: deduped }
      changed = true
    }
  }
  return changed ? { ...fs, nodes } : fs
}

export function ensurePortfolioSeedFiles(fs: FsState): FsState {
  const seed = createInitialFsState()
  // Clean any stale duplicate file-list entries a saved disk picked up from an
  // older build (e.g. a doubled "Resume.doc") before topping up the seeds.
  let next = dedupeFolderChildren(fs)
  // Purge stale artifacts from older disk layouts before topping up the seeds.
  for (const path of LEGACY_ARTIFACT_PATHS) {
    next = removeNodeByPath(next, path)
  }
  next = removePortfolioDocArtifacts(next)
  next = removeSeededUserMedia(next)
  next = removeStaleHostedMediaSeeds(next)
  next = normalizePortfolioLaunchers(next)
  for (const path of PORTFOLIO_SEEDED_PATHS) {
    const seedNode = getNode(seed, path)
    if (!seedNode) continue
    const existing = getNode(next, seedNode.path)
    if (existing?.kind === 'folder') continue
    if (existing && shouldRefreshExternalMediaSeed(existing, seedNode)) {
      const refreshed: FsNode = {
        ...existing,
        icon: seedNode.icon,
        fileType: seedNode.fileType,
        size: seedNode.size,
        dataUrl: seedNode.dataUrl,
        appId: seedNode.appId,
        appPayload: seedNode.appPayload,
      }
      next = internalInsertNode(next, refreshed)
      continue
    }
    if (existing) continue
    next = internalInsertNode(next, {
      ...seedNode,
      children: seedNode.kind === 'folder' ? seedNode.children ?? [] : undefined,
    })
  }
  // The fs is restored wholesale, so a changed icon on a system folder would only
  // reach fresh boots. Re-apply the current seed icon for these paths (children and
  // everything else preserved) so icon updates also land on existing persisted disks.
  const systemIconPaths = Array.from(new Set(['C:\\Windows\\Desktop', ...SYSTEM_FILE_CATALOG]))
  const iconNodes = { ...next.nodes }
  let iconChanged = false
  for (const path of systemIconPaths) {
    const node = iconNodes[path]
    const seedNode = getNode(seed, path)
    if (node && seedNode && node.icon !== seedNode.icon) {
      iconNodes[path] = { ...node, icon: seedNode.icon }
      iconChanged = true
    }
  }
  if (iconChanged) next = { ...next, nodes: iconNodes }
  return normalizeBitmapIcons(next)
}
