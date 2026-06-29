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
import { aiUprisingDocHtml } from './aiUprisingDoc'
import { galleryMusic, galleryPhotos, galleryVideos } from './media'

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

function escapeResumeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

/**
 * Render Resume.doc as styled WordPad HTML. The layout intentionally mirrors the
 * real dark two-column resume, while staying editable inside the simulated app.
 */
function resumeInlineList(items: string[]): string {
  return `<ul style="margin:4px 0 9px 18px; padding:0; line-height:1.34">${items
    .map((item) => `<li style="margin:2px 0">${escapeResumeHtml(item)}</li>`)
    .join('')}</ul>`
}

function resumeSidebarGroup(title: string, items: string[]): string {
  return [
    `<div style="margin:6px 0 2px; color:#c7c7c7; font-style:italic">${escapeResumeHtml(title)}</div>`,
    resumeInlineList(items),
  ].join('')
}

function resumeSection(title: string, body: string): string {
  return [
    `<div style="margin:0 0 11px">`,
    `<div style="color:#8fb4ff; font-weight:700; font-size:16px; letter-spacing:.2px; border-bottom:1px solid #8fb4ff; padding-bottom:5px; margin-bottom:7px">${escapeResumeHtml(title)}</div>`,
    body,
    '</div>',
  ].join('')
}

function resumeProject(title: string, meta: string, bullets: string[]): string {
  return [
    '<div style="margin:0 0 12px">',
    `<div style="font-weight:700; color:#f4f4f4; font-size:16px">${escapeResumeHtml(title)}</div>`,
    `<div style="color:#c7c7c7; font-style:italic; margin:1px 0 3px">${escapeResumeHtml(meta)}</div>`,
    resumeInlineList(bullets),
    '</div>',
  ].join('')
}

function resumeToHtml(): string {
  const contactLinks = [
    'Email: johnerickmendoza567@gmail.com',
    'GitHub: RICKTZY22',
    'LinkedIn Profile',
    'Facebook Profile',
  ]
  const frontendSkills = [
    'React 18 / Vite',
    'JavaScript (ES6+)',
    'HTML5 / Tailwind CSS',
    'Vanilla CSS / Bootstrap',
    'React Router / Zustand',
    'Axios (API client)',
    'GSAP / ScrollTrigger',
    'Rive / Lottie / Motion',
    'Recharts / jsPDF',
  ]
  const backendSkills = [
    'Node.js / Express.js',
    'Python / Django / DRF',
    'REST APIs / JWT Auth',
    'PostgreSQL / SQLite',
    'WebSockets (Channels)',
  ]
  const aiSkills = ['Gemini API', 'Local Ollama']
  const toolingSkills = ['Git / GitHub Actions', 'ESLint / Vitest', 'React Testing Library', 'Render / Deployment', 'CodeQL / pip-audit']

  const contactHtml = contactLinks
    .map((item) => `<div style="margin:2px 0; color:#a9c7ff; text-decoration:underline">${escapeResumeHtml(item)}</div>`)
    .join('')

  return [
    '<div data-resume-template="dark-sidebar-v1" style="font-family:Arial,Helvetica,sans-serif; margin:-42px -48px; min-height:760px; background:#242424; color:#f0f0f0; line-height:1.22; font-size:14px; overflow:hidden">',
    '<div style="background:#bcccf6; color:#252525; text-align:center; padding:34px 28px 30px">',
    '<div style="font-size:42px; line-height:1; font-weight:800; letter-spacing:1px">JOHN ERICK MENDOZA</div>',
    '<div style="font-size:18px; color:#3d4a5a; margin-top:8px">BS Computer <span style="text-decoration:underline">Science</span> | Frontend Developer</div>',
    '</div>',
    '<div style="display:grid; grid-template-columns:242px minmax(0,1fr); align-items:stretch">',
    '<aside style="background:#2f3640; padding:38px 22px 28px; color:#f0f3f8">',
    '<div style="color:#8fb4ff; font-weight:700; font-size:16px; border-bottom:1px solid #8fb4ff; padding-bottom:6px; margin-bottom:7px">CONTACT</div>',
    '<div style="line-height:1.25; margin-bottom:17px">Parañaque, PH' + contactHtml + '</div>',
    '<div style="color:#8fb4ff; font-weight:700; font-size:16px; border-bottom:1px solid #8fb4ff; padding-bottom:6px; margin-bottom:7px">SKILLS</div>',
    resumeSidebarGroup('Frontend (Proficient)', frontendSkills),
    resumeSidebarGroup('Backend (Familiar, AI-assisted)', backendSkills),
    resumeSidebarGroup('AI Integration', aiSkills),
    resumeSidebarGroup('Dev & Tools', toolingSkills),
    '</aside>',
    '<main style="padding:38px 28px 34px 38px; background:#242424; min-width:0">',
    resumeSection(
      'PROFESSIONAL SUMMARY',
      '<p style="margin:0">Computer Science student at PLMun specializing in frontend development: building polished, interactive React interfaces and creative browser experiences with JavaScript, Tailwind CSS, and animation libraries like GSAP and Rive. On full-stack projects the Django and PostgreSQL backend work is AI-assisted, not an area I claim independent proficiency in; the frontend is where I work on my own and to a high bar. Seeking internship opportunities to contribute on the frontend while growing as a developer.</p>',
    ),
    resumeSection(
      'PROJECT EXPERIENCE',
      [
        resumeProject('Windows 98 Portfolio Edition', 'Creative Frontend Developer • React • TypeScript • Virtual Filesystem • Browser OS', [
          'Built a fully interactive browser-based Windows 98-style portfolio OS with a virtual filesystem, movable windows, and simulated desktop apps.',
          'Implemented startup and recovery flows, custom themes, and sound design, reframing portfolio presentation as a navigable OS.',
          'Demonstrates depth in React architecture, creative state management, and frontend engineering.',
        ]),
        resumeProject('Between Two Ruins', 'Visual Novel / Interactive Experience Developer • React • GSAP • ScrollTrigger • TypeScript', [
          'Designed and built a browser-based visual novel with cinematic scroll-driven transitions, reusable story components, and scene-pacing logic.',
          'Blends frontend engineering with narrative craft, showcasing animation fluency and component design.',
        ]),
        resumeProject('PLMun Inventory Nexus', 'Frontend Developer (Capstone) • React • Vite • Tailwind CSS • Django • PostgreSQL • SQLite • JWT', [
          'Built the React frontend: role-based access UI, JWT auth flows, the analytics dashboard, QR code rendering, and PDF export.',
          'Integrated real-time WebSocket chat and AI-assisted messaging (local Ollama and Gemini) into the interface.',
          'The Django backend and the database design (PostgreSQL for production, SQLite for local development) were built with Claude Opus.',
        ]),
        resumeProject('Canlas Inventory System', 'Full-Stack Developer, AI-assisted • React • Django • Daphne • Redis • GitHub Actions • Render', [
          'Built the full package, frontend, backend, and deployment, with Gemini 3.1 as the AI assistant.',
          'Includes CI/CD via GitHub Actions, OpenAPI documentation, and security scanning with CodeQL and pip-audit.',
        ]),
      ].join(''),
    ),
    resumeSection(
      'EDUCATION',
      [
        '<p style="margin:0 0 6px"><b>Pamantasan ng Lungsod ng Muntinlupa (PLMun)</b> — <span style="text-decoration:underline">BS</span> Computer Science (2023–2027, Expected)</p>',
        '<p style="margin:0 0 6px"><b>Holy Rosary Academy</b> — <span style="text-decoration:underline">HUMSS</span> Strand (2021–2023)</p>',
        '<p style="margin:0"><b>Las Piñas National High School</b> — <span style="text-decoration:underline">Junior</span> High School (2017–2021)</p>',
      ].join(''),
    ),
    '</main>',
    '</div>',
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

const BETWEEN_TWO_RUINS_WEB_ROOT = 'C:\\Projects\\Between Two Ruins\\between-two-ruins-web'
const BETWEEN_TWO_RUINS_WEB_STAMP = '06/15/2026 12:00 AM'
const COVER_ART_DATA_URL =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII='
const PLMUN_NEXUS_ROOT = 'C:\\Projects\\PLMun Inventory Nexus'
const PLMUN_NEXUS_STAMP = '06/16/2026 10:30 PM'
const WIN98_PORTFOLIO_ROOT = 'C:\\Projects\\Windows 98 Portfolio OS'
const WIN98_PORTFOLIO_STAMP = '06/17/2026 09:18 PM'

type ScaffoldFile = FileOpts & { path: string }

const SAMPLE_PICTURE_FILES: ScaffoldFile[] = []

function projectDocumentationContent(project: (typeof portfolioData.projects)[number], doc: 'Overview' | 'Features' | 'Architecture'): string {
  if (doc === 'Features') {
    return [
      `# ${project.name} Features`,
      '',
      project.summary,
      '',
      '## Highlights',
      ...project.details
        .split('. ')
        .map((line) => line.trim().replace(/\.$/, ''))
        .filter(Boolean)
        .slice(0, 6)
        .map((line) => `- ${line}.`),
      '',
      `## Stack`,
      project.stack.map((item) => `- ${item}`).join('\n'),
    ].join('\n')
  }

  if (doc === 'Architecture') {
    return [
      `# ${project.name} Architecture`,
      '',
      '## Purpose',
      project.details,
      '',
      '## Main building blocks',
      '- User-facing screens and workflows.',
      '- Data/state layer for project behavior.',
      '- Integration points documented through the project files in this folder.',
      '- Quality checks and deployment notes where applicable.',
    ].join('\n')
  }

  return [
    `# ${project.name}`,
    '',
    project.summary,
    '',
    '## What to inspect',
    '- README.txt for a short project brief.',
    '- Features.md for user-facing capabilities.',
    '- Architecture.md for implementation patterns and structure.',
    '- Source folders/files when this virtual disk includes the project tree.',
  ].join('\n')
}

function win98PortfolioPath(relativePath: string): string {
  return `${WIN98_PORTFOLIO_ROOT}\\${relativePath}`
}

// The documentation PDFs (the AI case study plus the docx-derived PDFs) are
// confidential and must never ship inside the portfolio OS, so nothing is seeded
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
  'src\\components\\apps\\AboutApp.tsx',
  'src\\components\\apps\\AboutApp.css',
  'src\\components\\apps\\ContactApp.tsx',
  'src\\components\\apps\\ContactApp.css',
  'src\\components\\apps\\ExplorerApp.tsx',
  'src\\components\\apps\\ExplorerApp.css',
  'src\\components\\apps\\InternetExplorerApp.tsx',
  'src\\components\\apps\\PaintApp.tsx',
  'src\\components\\apps\\PdfViewerApp.tsx',
  'src\\components\\apps\\PdfViewerApp.css',
  'src\\components\\apps\\ProjectsApp.tsx',
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
  'src\\data\\portfolioData.ts',
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
      '# Windows 98 Portfolio OS',
      '',
      'Interactive React portfolio presented as a nostalgic Windows 98-style desktop.',
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
        name: 'windows-portfolio',
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
      '- PDF exports are bundled for reading inside the portfolio OS.',
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
    'Windows 98 Portfolio OS project file shown inside the virtual C: drive.',
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

function plmunNexusPath(relativePath: string): string {
  return `${PLMUN_NEXUS_ROOT}\\${relativePath}`
}

const PLMUN_NEXUS_FOLDER_PATHS = [
  '.github',
  '.github\\workflows',
  'Backend',
  'Backend\\config',
  'Backend\\apps',
  'Backend\\apps\\authentication',
  'Backend\\apps\\authentication\\migrations',
  'Backend\\apps\\authentication\\management',
  'Backend\\apps\\authentication\\management\\commands',
  'Backend\\apps\\inventory',
  'Backend\\apps\\inventory\\migrations',
  'Backend\\apps\\requests',
  'Backend\\apps\\requests\\migrations',
  'Backend\\apps\\requests\\management',
  'Backend\\apps\\requests\\management\\commands',
  'Backend\\apps\\messaging',
  'Backend\\apps\\messaging\\migrations',
  'Backend\\apps\\users',
  'Backend\\apps\\common',
  'frontend',
  'frontend\\public',
  'frontend\\src',
  'frontend\\src\\assets',
  'frontend\\src\\assets\\images',
  'frontend\\src\\assets\\rive',
  'frontend\\src\\components',
  'frontend\\src\\components\\auth',
  'frontend\\src\\components\\dashboard',
  'frontend\\src\\components\\inventory',
  'frontend\\src\\components\\layout',
  'frontend\\src\\components\\settings',
  'frontend\\src\\components\\ui',
  'frontend\\src\\components\\users',
  'frontend\\src\\pages',
  'frontend\\src\\pages\\settings',
  'frontend\\src\\hooks',
  'frontend\\src\\services',
  'frontend\\src\\store',
  'frontend\\src\\routes',
  'frontend\\src\\utils',
  'frontend\\src\\data',
  'frontend\\src\\test',
].map(plmunNexusPath)

const PLMUN_NEXUS_FILE_PATHS = [
  '.github\\workflows\\ci.yml',
  '.github\\workflows\\codeql.yml',
  'Backend\\.env.example',
  'Backend\\manage.py',
  'Backend\\requirements.txt',
  'Backend\\build.sh',
  'Backend\\Procfile',
  'Backend\\config\\settings.py',
  'Backend\\config\\urls.py',
  'Backend\\config\\asgi.py',
  'Backend\\config\\wsgi.py',
  'Backend\\config\\middleware.py',
  'Backend\\apps\\authentication\\models.py',
  'Backend\\apps\\authentication\\serializers.py',
  'Backend\\apps\\authentication\\views.py',
  'Backend\\apps\\authentication\\urls.py',
  'Backend\\apps\\authentication\\tests.py',
  'Backend\\apps\\authentication\\management\\commands\\seed_admin.py',
  'Backend\\apps\\authentication\\management\\commands\\seed_demo.py',
  'Backend\\apps\\inventory\\models.py',
  'Backend\\apps\\inventory\\serializers.py',
  'Backend\\apps\\inventory\\views.py',
  'Backend\\apps\\inventory\\urls.py',
  'Backend\\apps\\inventory\\tests.py',
  'Backend\\apps\\requests\\models.py',
  'Backend\\apps\\requests\\serializers.py',
  'Backend\\apps\\requests\\views.py',
  'Backend\\apps\\requests\\notifications.py',
  'Backend\\apps\\requests\\overdue.py',
  'Backend\\apps\\requests\\auto_decision.py',
  'Backend\\apps\\requests\\urls.py',
  'Backend\\apps\\requests\\tests.py',
  'Backend\\apps\\requests\\management\\commands\\check_overdue.py',
  'Backend\\apps\\requests\\management\\commands\\seed_traffic.py',
  'Backend\\apps\\messaging\\models.py',
  'Backend\\apps\\messaging\\views.py',
  'Backend\\apps\\messaging\\consumers.py',
  'Backend\\apps\\messaging\\routing.py',
  'Backend\\apps\\messaging\\middleware.py',
  'Backend\\apps\\messaging\\services.py',
  'Backend\\apps\\messaging\\presence.py',
  'Backend\\apps\\messaging\\assistant.py',
  'Backend\\apps\\messaging\\urls.py',
  'Backend\\apps\\messaging\\tests.py',
  'Backend\\apps\\users\\models.py',
  'Backend\\apps\\users\\views.py',
  'Backend\\apps\\users\\urls.py',
  'Backend\\apps\\users\\tests.py',
  'Backend\\apps\\common\\drf.py',
  'Backend\\apps\\common\\images.py',
  'Backend\\apps\\common\\uploads.py',
  'frontend\\.env.example',
  'frontend\\package.json',
  'frontend\\package-lock.json',
  'frontend\\index.html',
  'frontend\\vite.config.js',
  'frontend\\tailwind.config.js',
  'frontend\\postcss.config.js',
  'frontend\\eslint.config.js',
  'frontend\\public\\logo.png',
  'frontend\\src\\main.jsx',
  'frontend\\src\\App.jsx',
  'frontend\\src\\index.css',
  'frontend\\src\\pages\\Dashboard.jsx',
  'frontend\\src\\pages\\Inventory.jsx',
  'frontend\\src\\pages\\Requests.jsx',
  'frontend\\src\\pages\\Messages.jsx',
  'frontend\\src\\pages\\Reports.jsx',
  'frontend\\src\\pages\\Users.jsx',
  'frontend\\src\\pages\\AuditLogs.jsx',
  'frontend\\src\\pages\\Settings.jsx',
  'frontend\\src\\pages\\Login.jsx',
  'frontend\\src\\pages\\Register.jsx',
  'README.md',
  'render.yaml',
  'start.ps1',
  'pyrightconfig.json',
  'AI_ASSIST_PLAN.md',
  'PATCH_NOTES_v2-beta-0.5-stable.md',
].map(plmunNexusPath)

const PLMUN_NEXUS_SEED_PATHS = [PLMUN_NEXUS_ROOT, ...PLMUN_NEXUS_FOLDER_PATHS, ...PLMUN_NEXUS_FILE_PATHS]

function plmunNexusFileType(relativePath: string): string | undefined {
  const lower = relativePath.toLowerCase()
  if (lower.endsWith('.env.example')) return 'Environment Example'
  if (lower.endsWith('.yml') || lower.endsWith('.yaml')) return 'YAML File'
  if (lower.endsWith('.py')) return 'Python Source'
  if (lower.endsWith('.jsx')) return 'React Component'
  if (lower.endsWith('.js')) return 'JavaScript Source'
  if (lower.endsWith('.json')) return 'JSON File'
  if (lower.endsWith('.css')) return 'Style Sheet'
  if (lower.endsWith('.sh')) return 'Shell Script'
  if (lower.endsWith('.ps1')) return 'PowerShell Script'
  if (lower.endsWith('procfile')) return 'Process File'
  return undefined
}

function plmunNexusPythonContent(relativePath: string): string {
  const modulePath = relativePath.replace(/\\/g, '/').replace(/^Backend\//, '').replace(/\.py$/, '')
  return [
    `"""${modulePath} module for PLMun Inventory Nexus."""`,
    '',
    '# Representative source file for the portfolio filesystem.',
    '# The real capstone uses Django, DRF, Channels, JWT auth, and PostgreSQL.',
    '',
    'def describe() -> str:',
    `    return "${modulePath}"`,
    '',
  ].join('\n')
}

function plmunNexusPageContent(relativePath: string): string {
  const name = relativePath.slice(relativePath.lastIndexOf('\\') + 1).replace('.jsx', '')
  return [
    `export default function ${name}() {`,
    '  return (',
    `    <section className="page page-${name.toLowerCase()}">`,
    `      <h1>${name}</h1>`,
    '      <p>PLMun Inventory Nexus workspace screen.</p>',
    '    </section>',
    '  )',
    '}',
    '',
  ].join('\n')
}

function plmunNexusFileContent(relativePath: string): string {
  const normalized = relativePath.replace(/\\/g, '/')
  const name = normalized.slice(normalized.lastIndexOf('/') + 1)

  if (normalized === '.github/workflows/ci.yml') {
    return [
      'name: CI',
      '',
      'on:',
      '  push:',
      '  pull_request:',
      '',
      'jobs:',
      '  test:',
      '    runs-on: ubuntu-latest',
      '    steps:',
      '      - uses: actions/checkout@v4',
      '      - name: Install backend dependencies',
      '        run: pip install -r Backend/requirements.txt',
      '      - name: Run backend tests',
      '        run: python Backend/manage.py test',
      '      - name: Install frontend dependencies',
      '        run: npm ci --prefix frontend',
      '      - name: Build frontend',
      '        run: npm run build --prefix frontend',
    ].join('\n')
  }

  if (normalized === '.github/workflows/codeql.yml') {
    return [
      'name: CodeQL',
      '',
      'on:',
      '  push:',
      '  pull_request:',
      '',
      'jobs:',
      '  analyze:',
      '    runs-on: ubuntu-latest',
      '    permissions:',
      '      security-events: write',
      '      contents: read',
      '    steps:',
      '      - uses: actions/checkout@v4',
      '      - uses: github/codeql-action/init@v3',
      '        with:',
      '          languages: javascript-typescript, python',
      '      - uses: github/codeql-action/analyze@v3',
    ].join('\n')
  }

  if (normalized === 'README.md') {
    return [
      '# PLMun Inventory Nexus',
      '',
      'Full-stack inventory and request management system for PLMun-style asset workflows.',
      '',
      '## Main areas',
      '- Django REST Framework backend with JWT authentication.',
      '- Inventory, requests, users, messaging, reports, and audit-focused modules.',
      '- React and Vite frontend with dashboard pages, reusable UI, and service layers.',
      '- WebSocket messaging support through Django Channels.',
      '- CI, CodeQL, Render deployment config, and environment examples.',
    ].join('\n')
  }

  if (normalized === 'Backend/.env.example') {
    return [
      'DJANGO_SECRET_KEY=change-me',
      'DJANGO_DEBUG=False',
      'DATABASE_URL=postgres://user:password@localhost:5432/plmun_nexus',
      'ALLOWED_HOSTS=localhost,127.0.0.1',
      'CORS_ALLOWED_ORIGINS=http://localhost:5173',
      'GEMINI_API_KEY=optional',
      'OLLAMA_BASE_URL=http://localhost:11434',
    ].join('\n')
  }

  if (normalized === 'frontend/.env.example') {
    return ['VITE_API_BASE_URL=http://localhost:8000/api', 'VITE_WS_BASE_URL=ws://localhost:8000/ws'].join('\n')
  }

  if (normalized === 'Backend/manage.py') {
    return [
      '#!/usr/bin/env python',
      '"""Django management utility for PLMun Inventory Nexus."""',
      'import os',
      'import sys',
      '',
      "if __name__ == '__main__':",
      "    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')",
      '    from django.core.management import execute_from_command_line',
      '    execute_from_command_line(sys.argv)',
    ].join('\n')
  }

  if (normalized === 'Backend/requirements.txt') {
    return [
      'Django>=5.0',
      'djangorestframework',
      'djangorestframework-simplejwt',
      'django-cors-headers',
      'channels',
      'channels-redis',
      'psycopg[binary]',
      'gunicorn',
      'whitenoise',
      'drf-spectacular',
    ].join('\n')
  }

  if (normalized === 'Backend/build.sh') return ['#!/usr/bin/env bash', 'python manage.py collectstatic --noinput', 'python manage.py migrate'].join('\n')
  if (normalized === 'Backend/Procfile') return 'web: daphne config.asgi:application --port $PORT --bind 0.0.0.0'

  if (normalized === 'frontend/package.json') {
    return JSON.stringify(
      {
        name: 'plmun-inventory-nexus-frontend',
        private: true,
        scripts: { dev: 'vite', build: 'vite build', lint: 'eslint .', test: 'vitest run' },
        dependencies: {
          '@vitejs/plugin-react': 'latest',
          axios: 'latest',
          react: 'latest',
          'react-dom': 'latest',
          'react-router-dom': 'latest',
          zustand: 'latest',
        },
        devDependencies: { vite: 'latest', tailwindcss: 'latest', eslint: 'latest', vitest: 'latest' },
      },
      null,
      2,
    )
  }

  if (normalized === 'frontend/package-lock.json') return JSON.stringify({ name: 'plmun-inventory-nexus-frontend', lockfileVersion: 3, packages: {} }, null, 2)
  if (normalized === 'frontend/index.html') return '<div id="root"></div><script type="module" src="/src/main.jsx"></script>'
  if (normalized === 'frontend/vite.config.js') return "import react from '@vitejs/plugin-react'\nimport { defineConfig } from 'vite'\n\nexport default defineConfig({ plugins: [react()] })\n"
  if (normalized === 'frontend/tailwind.config.js') return "export default { content: ['./index.html', './src/**/*.{js,jsx}'], theme: { extend: {} }, plugins: [] }\n"
  if (normalized === 'frontend/postcss.config.js') return "export default { plugins: { tailwindcss: {}, autoprefixer: {} } }\n"
  if (normalized === 'frontend/eslint.config.js') return "export default [{ ignores: ['dist'] }]\n"
  if (normalized === 'frontend/src/main.jsx') return "import React from 'react'\nimport { createRoot } from 'react-dom/client'\nimport App from './App.jsx'\nimport './index.css'\n\ncreateRoot(document.getElementById('root')).render(<App />)\n"
  if (normalized === 'frontend/src/App.jsx') return "import Dashboard from './pages/Dashboard.jsx'\n\nexport default function App() {\n  return <Dashboard />\n}\n"
  if (normalized === 'frontend/src/index.css') return '@tailwind base;\n@tailwind components;\n@tailwind utilities;\n'

  if (normalized === 'render.yaml') return ['services:', '  - type: web', '    name: plmun-inventory-nexus-api', '    env: python', '    buildCommand: ./Backend/build.sh', '    startCommand: daphne Backend.config.asgi:application'].join('\n')
  if (normalized === 'start.ps1') return ['Set-Location Backend', 'python manage.py runserver'].join('\n')
  if (normalized === 'pyrightconfig.json') return JSON.stringify({ include: ['Backend'], typeCheckingMode: 'basic' }, null, 2)
  if (normalized === 'AI_ASSIST_PLAN.md') return '# AI Assist Plan\n\nRead-only assistant support for inventory lookups, request guidance, and messaging summaries.\n'
  if (normalized === 'PATCH_NOTES_v2-beta-0.5-stable.md') return '# Patch Notes v2 beta 0.5 stable\n\n- Stabilized dashboard flows.\n- Added request automation notes.\n- Documented assistant and messaging structure.\n'
  if (normalized.startsWith('frontend/src/pages/') && name.endsWith('.jsx')) return plmunNexusPageContent(relativePath)
  if (name.endsWith('.py')) return plmunNexusPythonContent(relativePath)

  return [
    name,
    '',
    `Path: ${normalized}`,
    'PLMun Inventory Nexus project file inside the Windows 98 portfolio filesystem.',
  ].join('\n')
}

function plmunNexusFileOpts(path: string): FileOpts {
  const relativePath = path.slice(PLMUN_NEXUS_ROOT.length + 1)
  if (relativePath === 'frontend\\public\\logo.png') {
    return {
      dataUrl: COVER_ART_DATA_URL,
      icon: 'imageFile',
      fileType: 'PNG Image',
      appId: 'imageViewer',
      appPayload: { filePath: path },
      modified: PLMUN_NEXUS_STAMP,
    }
  }
  return {
    content: plmunNexusFileContent(relativePath),
    icon: 'textFile',
    fileType: plmunNexusFileType(relativePath),
    appId: 'notepad',
    appPayload: { filePath: path },
    modified: PLMUN_NEXUS_STAMP,
  }
}

// Local/hosted media configured in .env.local (see src/data/media.ts). Each becomes a virtual
// file whose dataUrl is the external URL, so nothing heavy lives in this repo.
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

function btrPath(...parts: string[]): string {
  return `${BETWEEN_TWO_RUINS_WEB_ROOT}\\${parts.join('\\')}`
}

const BETWEEN_TWO_RUINS_WEB_FOLDERS = [
  btrPath('.claude'),
  btrPath('public'),
  btrPath('src'),
  btrPath('src', 'components'),
  btrPath('src', 'components', 'pages'),
  btrPath('src', 'components', 'reader'),
  btrPath('src', 'components', 'ui'),
  btrPath('src', 'content'),
  btrPath('src', 'content', 'chapters'),
  btrPath('src', 'hooks'),
  btrPath('src', 'store'),
  btrPath('src', 'styles'),
  btrPath('src', 'types'),
]

function chapterFile(chapter: number): ScaffoldFile {
  const id = String(chapter).padStart(2, '0')
  const title = `Chapter ${chapter}: Josef`
  return {
    path: btrPath('src', 'content', 'chapters', `ch${id}-josef.tsx`),
    content: [
      "import type { Chapter } from '../../types'",
      "import { ProseReveal } from '../../components/reader/ProseReveal'",
      "import { BloodWord } from '../../components/reader/BloodWord'",
      '',
      `export const ch${id}Josef: Chapter = {`,
      `  id: 'ch${id}-josef',`,
      `  title: '${title}',`,
      `  slug: 'ch${id}-josef',`,
      "  narrator: 'Josef',",
      `  summary: 'Josef follows another trace through the ruined city in scene ${chapter}.',`,
      '  render: () => (',
      '    <ProseReveal>',
      `      <p>Josef marks ruin ${chapter} on the map and listens for the hallway to answer.</p>`,
      `      <p>The city remembers in fragments, each one colder than the last <BloodWord>signal</BloodWord>.</p>`,
      '    </ProseReveal>',
      '  ),',
      '}',
    ].join('\n'),
  }
}

const BETWEEN_TWO_RUINS_WEB_FILES: ScaffoldFile[] = [
  {
    path: btrPath('public', 'cover-art.png'),
    dataUrl: COVER_ART_DATA_URL,
    icon: 'imageFile',
    fileType: 'PNG Image',
    appId: 'imageViewer',
    appPayload: { filePath: btrPath('public', 'cover-art.png') },
  },
  {
    path: btrPath('src', 'components', 'pages', 'CoverPage.tsx'),
    content: [
      "import { PhotoCover } from './PhotoCover'",
      "import { WoundCover } from './WoundCover'",
      '',
      'export function CoverPage() {',
      '  return (',
      '    <main className="cover-page">',
      '      <PhotoCover />',
      '      <WoundCover />',
      '    </main>',
      '  )',
      '}',
    ].join('\n'),
  },
  {
    path: btrPath('src', 'components', 'pages', 'PhotoCover.tsx'),
    content: [
      'export function PhotoCover() {',
      '  return (',
      '    <section className="photo-cover" aria-label="Between Two Ruins cover photograph">',
      '      <img src="/cover-art.png" alt="Between Two Ruins cover art" />',
      '      <p>Between Two Ruins</p>',
      '    </section>',
      '  )',
      '}',
    ].join('\n'),
  },
  {
    path: btrPath('src', 'components', 'pages', 'WoundCover.tsx'),
    content: [
      'export function WoundCover() {',
      '  return <div className="wound-cover" aria-hidden="true" />',
      '}',
    ].join('\n'),
  },
  {
    path: btrPath('src', 'components', 'reader', 'Anchor.tsx'),
    content: [
      "import type { PropsWithChildren } from 'react'",
      '',
      'export function Anchor({ children }: PropsWithChildren) {',
      '  return <span className="reader-anchor">{children}</span>',
      '}',
    ].join('\n'),
  },
  {
    path: btrPath('src', 'components', 'reader', 'BloodWord.tsx'),
    content: [
      "import type { PropsWithChildren } from 'react'",
      '',
      'export function BloodWord({ children }: PropsWithChildren) {',
      '  return <span className="blood-word">{children}</span>',
      '}',
    ].join('\n'),
  },
  {
    path: btrPath('src', 'components', 'reader', 'ChapterNav.tsx'),
    content: [
      "import type { Chapter } from '../../types'",
      '',
      'type Props = {',
      '  chapters: Chapter[]',
      '  activeId: string',
      '  onSelect: (id: string) => void',
      '}',
      '',
      'export function ChapterNav({ chapters, activeId, onSelect }: Props) {',
      '  return (',
      '    <nav className="chapter-nav" aria-label="Chapters">',
      '      {chapters.map((chapter) => (',
      '        <button key={chapter.id} className={chapter.id === activeId ? "active" : ""} onClick={() => onSelect(chapter.id)}>',
      '          {chapter.title}',
      '        </button>',
      '      ))}',
      '    </nav>',
      '  )',
      '}',
    ].join('\n'),
  },
  {
    path: btrPath('src', 'components', 'reader', 'ChapterReader.tsx'),
    content: [
      "import type { Chapter } from '../../types'",
      "import { ProgressBar } from '../ui/ProgressBar'",
      '',
      'type Props = { chapter: Chapter; progress: number }',
      '',
      'export function ChapterReader({ chapter, progress }: Props) {',
      '  return (',
      '    <article className="chapter-reader">',
      '      <ProgressBar value={progress} />',
      '      <p className="chapter-kicker">{chapter.narrator}</p>',
      '      <h1>{chapter.title}</h1>',
      '      {chapter.render()}',
      '    </article>',
      '  )',
      '}',
    ].join('\n'),
  },
  {
    path: btrPath('src', 'components', 'reader', 'DecayEngine.tsx'),
    content: [
      "import type { PropsWithChildren } from 'react'",
      '',
      'type Props = PropsWithChildren<{ amount: number }>',
      '',
      'export function DecayEngine({ amount, children }: Props) {',
      '  return <div className="decay-engine" style={{ "--decay": amount } as React.CSSProperties}>{children}</div>',
      '}',
    ].join('\n'),
  },
  {
    path: btrPath('src', 'components', 'reader', 'FogCanvas.tsx'),
    content: [
      "import { useEffect, useRef } from 'react'",
      '',
      'export function FogCanvas() {',
      '  const ref = useRef<HTMLCanvasElement>(null)',
      '',
      '  useEffect(() => {',
      '    const canvas = ref.current',
      '    const ctx = canvas?.getContext("2d")',
      '    if (!canvas || !ctx) return',
      '    ctx.fillStyle = "rgba(218, 225, 229, 0.15)"',
      '    ctx.fillRect(0, 0, canvas.width, canvas.height)',
      '  }, [])',
      '',
      '  return <canvas ref={ref} className="fog-canvas" width={960} height={540} aria-hidden="true" />',
      '}',
    ].join('\n'),
  },
  {
    path: btrPath('src', 'components', 'reader', 'GlitchLine.tsx'),
    content: [
      "import type { PropsWithChildren } from 'react'",
      '',
      'export function GlitchLine({ children }: PropsWithChildren) {',
      '  return <p className="glitch-line">{children}</p>',
      '}',
    ].join('\n'),
  },
  {
    path: btrPath('src', 'components', 'reader', 'ProseReveal.tsx'),
    content: [
      "import type { PropsWithChildren } from 'react'",
      '',
      'export function ProseReveal({ children }: PropsWithChildren) {',
      '  return <div className="prose-reveal">{children}</div>',
      '}',
    ].join('\n'),
  },
  {
    path: btrPath('src', 'components', 'ui', 'ProgressBar.tsx'),
    content: [
      'type Props = { value: number }',
      '',
      'export function ProgressBar({ value }: Props) {',
      '  const width = `${Math.max(0, Math.min(100, value))}%`',
      '  return <div className="progress-bar"><span style={{ width }} /></div>',
      '}',
    ].join('\n'),
  },
  ...Array.from({ length: 10 }, (_, index) => chapterFile(index + 1)),
  {
    path: btrPath('src', 'content', 'chapters', 'index.ts'),
    content: [
      "import { ch01Josef } from './ch01-josef'",
      "import { ch02Josef } from './ch02-josef'",
      "import { ch03Josef } from './ch03-josef'",
      "import { ch04Josef } from './ch04-josef'",
      "import { ch05Josef } from './ch05-josef'",
      "import { ch06Josef } from './ch06-josef'",
      "import { ch07Josef } from './ch07-josef'",
      "import { ch08Josef } from './ch08-josef'",
      "import { ch09Josef } from './ch09-josef'",
      "import { ch10Josef } from './ch10-josef'",
      '',
      'export const chapters = [',
      '  ch01Josef,',
      '  ch02Josef,',
      '  ch03Josef,',
      '  ch04Josef,',
      '  ch05Josef,',
      '  ch06Josef,',
      '  ch07Josef,',
      '  ch08Josef,',
      '  ch09Josef,',
      '  ch10Josef,',
      ']',
    ].join('\n'),
  },
  {
    path: btrPath('src', 'hooks', 'useChapter.ts'),
    content: [
      "import { useMemo } from 'react'",
      "import { chapters } from '../content/chapters'",
      '',
      'export function useChapter(id: string) {',
      '  return useMemo(() => chapters.find((chapter) => chapter.id === id) ?? chapters[0], [id])',
      '}',
    ].join('\n'),
  },
  {
    path: btrPath('src', 'hooks', 'useScrollDecayModifier.ts'),
    content: [
      "import { useEffect, useState } from 'react'",
      '',
      'export function useScrollDecayModifier() {',
      '  const [decay, setDecay] = useState(0)',
      '',
      '  useEffect(() => {',
      '    function update() {',
      '      const max = document.body.scrollHeight - window.innerHeight',
      '      setDecay(max > 0 ? Math.min(1, window.scrollY / max) : 0)',
      '    }',
      '    update()',
      '    window.addEventListener("scroll", update, { passive: true })',
      '    return () => window.removeEventListener("scroll", update)',
      '  }, [])',
      '',
      '  return decay',
      '}',
    ].join('\n'),
  },
  {
    path: btrPath('src', 'store', 'readerStore.ts'),
    content: [
      "import { create } from 'zustand'",
      '',
      'type ReaderStore = {',
      '  activeChapterId: string',
      '  progress: number',
      '  setActiveChapterId: (id: string) => void',
      '  setProgress: (progress: number) => void',
      '}',
      '',
      'export const useReaderStore = create<ReaderStore>((set) => ({',
      "  activeChapterId: 'ch01-josef',",
      '  progress: 0,',
      '  setActiveChapterId: (activeChapterId) => set({ activeChapterId }),',
      '  setProgress: (progress) => set({ progress }),',
      '}))',
    ].join('\n'),
  },
  {
    path: btrPath('src', 'styles', 'globals.css'),
    content: [
      '@tailwind base;',
      '@tailwind components;',
      '@tailwind utilities;',
      '',
      ':root {',
      '  color: #ece7df;',
      '  background: #090807;',
      '  font-family: Georgia, "Times New Roman", serif;',
      '}',
      '',
      '.cover-page, .chapter-reader {',
      '  min-height: 100svh;',
      '  padding: clamp(24px, 6vw, 88px);',
      '}',
      '',
      '.photo-cover img {',
      '  width: min(420px, 70vw);',
      '  image-rendering: auto;',
      '}',
      '',
      '.blood-word { color: #b91c1c; }',
      '.glitch-line { filter: blur(calc(var(--decay, 0) * 1px)); }',
      '.progress-bar { height: 4px; background: #2a2522; }',
      '.progress-bar span { display: block; height: 100%; background: #b91c1c; }',
    ].join('\n'),
  },
  {
    path: btrPath('src', 'types', 'index.ts'),
    content: [
      'export type Chapter = {',
      '  id: string',
      '  title: string',
      '  slug: string',
      '  narrator: string',
      '  summary: string',
      '  render: () => JSX.Element',
      '}',
    ].join('\n'),
  },
  {
    path: btrPath('src', 'App.tsx'),
    content: [
      "import { CoverPage } from './components/pages/CoverPage'",
      "import { ChapterNav } from './components/reader/ChapterNav'",
      "import { ChapterReader } from './components/reader/ChapterReader'",
      "import { DecayEngine } from './components/reader/DecayEngine'",
      "import { FogCanvas } from './components/reader/FogCanvas'",
      "import { chapters } from './content/chapters'",
      "import { useScrollDecayModifier } from './hooks/useScrollDecayModifier'",
      "import { useReaderStore } from './store/readerStore'",
      '',
      'export function App() {',
      '  const decay = useScrollDecayModifier()',
      '  const { activeChapterId, setActiveChapterId, progress } = useReaderStore()',
      '  const chapter = chapters.find((item) => item.id === activeChapterId) ?? chapters[0]',
      '',
      '  return (',
      '    <DecayEngine amount={decay}>',
      '      <FogCanvas />',
      '      <CoverPage />',
      '      <ChapterNav chapters={chapters} activeId={chapter.id} onSelect={setActiveChapterId} />',
      '      <ChapterReader chapter={chapter} progress={progress} />',
      '    </DecayEngine>',
      '  )',
      '}',
    ].join('\n'),
  },
  {
    path: btrPath('src', 'main.tsx'),
    content: [
      "import React from 'react'",
      "import ReactDOM from 'react-dom/client'",
      "import { App } from './App'",
      "import './styles/globals.css'",
      '',
      "ReactDOM.createRoot(document.getElementById('root')!).render(",
      '  <React.StrictMode>',
      '    <App />',
      '  </React.StrictMode>,',
      ')',
    ].join('\n'),
  },
  {
    path: btrPath('.gitignore'),
    content: ['node_modules', 'dist', '.env', 'vite-dev.log'].join('\n'),
  },
  {
    path: btrPath('index.html'),
    content: [
      '<!doctype html>',
      '<html lang="en">',
      '  <head>',
      '    <meta charset="UTF-8" />',
      '    <meta name="viewport" content="width=device-width, initial-scale=1.0" />',
      '    <title>Between Two Ruins</title>',
      '  </head>',
      '  <body>',
      '    <div id="root"></div>',
      '    <script type="module" src="/src/main.tsx"></script>',
      '  </body>',
      '</html>',
    ].join('\n'),
  },
  {
    path: btrPath('package.json'),
    content: [
      '{',
      '  "name": "between-two-ruins-web",',
      '  "private": true,',
      '  "version": "0.0.0",',
      '  "type": "module",',
      '  "scripts": {',
      '    "dev": "vite",',
      '    "build": "tsc -b && vite build",',
      '    "preview": "vite preview"',
      '  },',
      '  "dependencies": {',
      '    "@vitejs/plugin-react": "^6.0.1",',
      '    "gsap": "^3.13.0",',
      '    "react": "^19.2.6",',
      '    "react-dom": "^19.2.6",',
      '    "zustand": "^5.0.9"',
      '  },',
      '  "devDependencies": {',
      '    "typescript": "~6.0.2",',
      '    "vite": "^8.0.12"',
      '  }',
      '}',
    ].join('\n'),
  },
  {
    path: btrPath('package-lock.json'),
    content: [
      '{',
      '  "name": "between-two-ruins-web",',
      '  "version": "0.0.0",',
      '  "lockfileVersion": 3,',
      '  "requires": true,',
      '  "packages": {',
      '    "": {',
      '      "name": "between-two-ruins-web",',
      '      "version": "0.0.0"',
      '    }',
      '  }',
      '}',
    ].join('\n'),
  },
  {
    path: btrPath('postcss.config.js'),
    content: [
      'export default {',
      '  plugins: {',
      '    tailwindcss: {},',
      '    autoprefixer: {},',
      '  },',
      '}',
    ].join('\n'),
  },
  {
    path: btrPath('README.md'),
    content: [
      '# Between Two Ruins Web',
      '',
      'Interactive visual novel / reader scaffold for Between Two Ruins.',
      '',
      '## Structure',
      '',
      '- `components/pages` contains cover scenes.',
      '- `components/reader` contains reader effects and prose tools.',
      '- `content/chapters` contains Josef chapter files.',
      '- `store/readerStore.ts` keeps the active reader state.',
    ].join('\n'),
  },
  {
    path: btrPath('tailwind.config.ts'),
    content: [
      "import type { Config } from 'tailwindcss'",
      '',
      'export default {',
      "  content: ['./index.html', './src/**/*.{ts,tsx}'],",
      '  theme: {',
      '    extend: {},',
      '  },',
      '  plugins: [],',
      '} satisfies Config',
    ].join('\n'),
  },
  {
    path: btrPath('tsconfig.json'),
    content: [
      '{',
      '  "files": [],',
      '  "references": [',
      '    { "path": "./tsconfig.node.json" }',
      '  ]',
      '}',
    ].join('\n'),
  },
  {
    path: btrPath('tsconfig.node.json'),
    content: [
      '{',
      '  "compilerOptions": {',
      '    "composite": true,',
      '    "module": "ESNext",',
      '    "moduleResolution": "Bundler",',
      '    "jsx": "react-jsx",',
      '    "strict": true',
      '  },',
      '  "include": ["src", "vite.config.ts"]',
      '}',
    ].join('\n'),
  },
  {
    path: btrPath('vite.config.ts'),
    content: [
      "import { defineConfig } from 'vite'",
      "import react from '@vitejs/plugin-react'",
      '',
      'export default defineConfig({',
      '  plugins: [react()],',
      '})',
    ].join('\n'),
  },
  {
    path: btrPath('vite-dev.log'),
    content: 'Vite dev log placeholder for the simulated project folder.\n',
  },
]

const BETWEEN_TWO_RUINS_WEB_SEED_PATHS = [
  BETWEEN_TWO_RUINS_WEB_ROOT,
  ...BETWEEN_TWO_RUINS_WEB_FOLDERS,
  ...BETWEEN_TWO_RUINS_WEB_FILES.map((file) => file.path),
]

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
    icon: 'iniFile',
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
    content: resumeToHtml(),
    icon: 'wordpad',
    appId: 'wordpad',
    appPayload: { filePath: 'C:\\My Documents\\Resume.doc' },
    modified: '06/13/2026 12:34 AM',
  })
  file('C:\\My Documents\\The AI Uprising.doc', {
    content: aiUprisingDocHtml,
    icon: 'wordpad',
    appId: 'wordpad',
    appPayload: { filePath: 'C:\\My Documents\\The AI Uprising.doc' },
    fileType: 'WordPad Document',
    modified: '06/27/2026 10:00 AM',
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

  // ----- Projects: one folder per project -----
  folder('C:\\Projects', 'projects', '06/13/2026 12:35 AM')
  for (const project of portfolioData.projects) {
    const projectDir = `C:\\Projects\\${project.name}`
    folder(projectDir, 'folder', '06/13/2026 12:35 AM')
    const documentationDir = `${projectDir}\\Documentation`
    folder(documentationDir, 'folder', '06/13/2026 12:36 AM')
    file(`${projectDir}\\README.txt`, {
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
    file(`${projectDir}\\${project.fileName}`, {
      content: project.links.demo,
      icon: 'urlFile',
      fileType: 'Internet Shortcut',
      appId: 'projectDetails',
      appPayload: { projectId: project.id },
      size: 512,
      modified: '06/13/2026 12:35 AM',
    })
    for (const doc of ['Overview', 'Features', 'Architecture'] as const) {
      file(`${documentationDir}\\${doc}.md`, {
        content: projectDocumentationContent(project, doc),
        icon: 'textFile',
        fileType: 'Markdown Document',
        appId: 'notepad',
        appPayload: { filePath: `${documentationDir}\\${doc}.md` },
        modified: '06/13/2026 12:36 AM',
      })
    }
  }

  if (!nodes[PLMUN_NEXUS_ROOT]) {
    folder(PLMUN_NEXUS_ROOT, 'folder', PLMUN_NEXUS_STAMP)
  }
  for (const path of PLMUN_NEXUS_FOLDER_PATHS) {
    if (!nodes[path]) {
      folder(path, 'folder', PLMUN_NEXUS_STAMP)
    }
  }
  for (const path of PLMUN_NEXUS_FILE_PATHS) {
    if (!nodes[path]) {
      file(path, plmunNexusFileOpts(path))
    }
  }

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

  folder(BETWEEN_TWO_RUINS_WEB_ROOT, 'folder', BETWEEN_TWO_RUINS_WEB_STAMP)
  for (const path of BETWEEN_TWO_RUINS_WEB_FOLDERS) {
    folder(path, 'folder', BETWEEN_TWO_RUINS_WEB_STAMP)
  }
  for (const { path, ...opts } of BETWEEN_TWO_RUINS_WEB_FILES) {
    file(path, { ...opts, modified: opts.modified ?? BETWEEN_TWO_RUINS_WEB_STAMP })
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
  file('C:\\Network\\Portfolio.local', {
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
  'C:\\My Documents\\Resume.doc',
  'C:\\My Documents\\The AI Uprising.doc',
  'C:\\Projects',
  ...portfolioData.projects.flatMap((project) => [
    `C:\\Projects\\${project.name}`,
    `C:\\Projects\\${project.name}\\Documentation`,
    `C:\\Projects\\${project.name}\\Documentation\\Overview.md`,
    `C:\\Projects\\${project.name}\\Documentation\\Features.md`,
    `C:\\Projects\\${project.name}\\Documentation\\Architecture.md`,
    `C:\\Projects\\${project.name}\\README.txt`,
    `C:\\Projects\\${project.name}\\${project.fileName}`,
  ]),
  ...PLMUN_NEXUS_SEED_PATHS,
  ...WIN98_PORTFOLIO_SEED_PATHS,
  ...BETWEEN_TWO_RUINS_WEB_SEED_PATHS,
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
  ...portfolioData.projects.flatMap((project) => [
    `C:\\Projects\\${project.name}.txt`,
    `C:\\Projects\\${project.fileName}`,
  ]),
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
  const launcherPaths = ['C:\\Windows\\Desktop\\Portfolio OS.lnk', 'C:\\Network\\Portfolio.local']
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

function removePortfolioDocArtifacts(fs: FsState): FsState {
  let next = fs
  for (const root of PURGED_PORTFOLIO_DOC_ROOTS) {
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
  const systemIconPaths = ['C:\\Windows\\Desktop']
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
