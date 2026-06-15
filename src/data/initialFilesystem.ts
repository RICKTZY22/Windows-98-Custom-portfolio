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

function escapeResumeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

/**
 * Render the plain-text resume into formatted WordPad HTML so Resume.doc opens
 * with a real heading, bold navy section titles, bold role lines, and bullets
 * (WordPad stores rich text as HTML — see wordpadFormatting.ts).
 */
function resumeToHtml(content: string): string {
  return content
    .split(/\r?\n/)
    .map((line, index) => {
      const text = line.trim()
      if (index === 0) {
        return `<div><span style="font-family:Arial; font-size:18pt; font-weight:bold">${escapeResumeHtml(text)}</span></div>`
      }
      if (text === '') return '<div><br></div>'
      const isSectionHeader = text === text.toUpperCase() && /[A-Z]/.test(text) && text.length <= 40
      if (isSectionHeader) {
        return `<div><span style="font-family:Arial; font-size:13pt; font-weight:bold; color:#000080">${escapeResumeHtml(text)}</span></div>`
      }
      if (text.startsWith('- ')) {
        return `<div style="font-family:Arial; margin-left:18px">&bull; ${escapeResumeHtml(text.slice(2))}</div>`
      }
      if (/ - /.test(text) && text.length < 80) {
        return `<div style="font-family:Arial; font-weight:bold">${escapeResumeHtml(text)}</div>`
      }
      return `<div style="font-family:Arial">${escapeResumeHtml(text)}</div>`
    })
    .join('')
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

type ScaffoldFile = FileOpts & { path: string }

const SAMPLE_PICTURE_FILES: ScaffoldFile[] = []

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
    content: resumeToHtml(portfolioData.resume.documentContent),
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

  // ----- Projects: one folder per project -----
  folder('C:\\Projects', 'projects', '06/13/2026 12:35 AM')
  for (const project of portfolioData.projects) {
    const projectDir = `C:\\Projects\\${project.name}`
    folder(projectDir, 'folder', '06/13/2026 12:35 AM')
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
  for (const { path, ...opts } of SAMPLE_PICTURE_FILES) {
    file(path, opts)
  }

  // ----- My Videos (drop your own clips here) -----
  folder('C:\\My Videos', 'folder', '06/12/2026 12:04 AM')

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
  sysFile('C:\\Windows\\System32\\winmm.dll', 176128)
  sysFile('C:\\Windows\\System32\\dsound.dll', 311296)
  sysFile('C:\\Windows\\System32\\ddraw.dll', 282624)
  sysFile('C:\\Windows\\System32\\dplayx.dll', 204800)
  sysFile('C:\\Windows\\System32\\opengl32.dll', 696320)
  sysFile('C:\\Windows\\System32\\glu32.dll', 122880)
  sysFile('C:\\Windows\\System32\\twain32.dll', 86016)
  sysFile('C:\\Windows\\System32\\msgsm32.acm', 24576)
  sysFile('C:\\Windows\\System32\\wdmaud.drv', 28672)
  sysFile('C:\\Windows\\System32\\msmixmgr.dll', 16384)
  // 16-bit core (kept for legacy apps)
  sysFile('C:\\Windows\\System32\\krnl386.exe', 126976)
  sysFile('C:\\Windows\\System32\\gdi.exe', 342016)
  sysFile('C:\\Windows\\System32\\user.exe', 503808)
  sysFile('C:\\Windows\\System32\\mmtask.tsk', 1184)
  sysFile('C:\\Windows\\System32\\ddhelp.exe', 53248)

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
  'C:\\My Pictures',
  ...SAMPLE_PICTURE_FILES.map((file) => file.path),
  'C:\\My Videos',
  'C:\\My Documents\\Resume.doc',
  'C:\\My Documents\\Education.txt',
  'C:\\Projects',
  ...portfolioData.projects.flatMap((project) => [
    `C:\\Projects\\${project.name}`,
    `C:\\Projects\\${project.name}\\README.txt`,
    `C:\\Projects\\${project.name}\\${project.fileName}`,
  ]),
  ...BETWEEN_TWO_RUINS_WEB_SEED_PATHS,
  'C:\\Program Files\\Accessories\\WORDPAD.EXE',
  'C:\\Program Files\\Accessories\\KODAKIMG.EXE',
  'C:\\Program Files\\Accessories\\VIDPLAY.EXE',
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
  'C:\\My Documents\\Resume.txt',
  ...portfolioData.projects.flatMap((project) => [
    `C:\\Projects\\${project.name}.txt`,
    `C:\\Projects\\${project.fileName}`,
  ]),
]

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

export function ensurePortfolioSeedFiles(fs: FsState): FsState {
  const seed = createInitialFsState()
  let next = fs
  // Purge stale artifacts from older disk layouts before topping up the seeds.
  for (const path of LEGACY_ARTIFACT_PATHS) {
    next = removeNodeByPath(next, path)
  }
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
  return normalizeBitmapIcons(next)
}
