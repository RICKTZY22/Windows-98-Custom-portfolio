# Windows 98 Portfolio OS — Architecture Contract (v2)

This document is the **binding contract** for the simulated-OS upgrade. Every module and
component must match the signatures and conventions here EXACTLY (names, types, props),
because separate agents build separate files in parallel and they only meet at compile time.

General rules for all agents:

- TypeScript strict. No `any`. No new npm dependencies (vitest is already installed for tests).
- React 19 function components only. Obey `eslint-plugin-react-hooks` rules.
- Do NOT run `npm install`, `npm run build`, `npm run lint`, or `npm run dev`. Just write code.
- Only create/modify the files assigned to you in the "File ownership" section.
- All Win98 chrome uses `98.css` classes (`.window`, `.title-bar`, `button`, `.field-row`,
  `.sunken-panel`, `.status-bar`, `.status-bar-field`, `.tree-view`, `menu[role=tablist]`, etc.)
  plus our CSS variables (below). Pixel fonts come from 98.css defaults.
- Everything is a browser-safe simulation: no real Microsoft binaries, sounds, or copyrighted
  assets. All sounds are synthesized with WebAudio. All "system files" contain placeholder text.
- Today's simulated date stamps use `nowStamp()` from `src/os/filesystem.ts`.

## Directory layout

```
src/
  os/                 # pure logic + the store (no app UI)
    filesystem.ts     # path utils + pure FS operations + file associations
    commands.ts       # MS-DOS command processor (pure, effect descriptors)
    network.ts        # network state helpers + ping simulation
    recovery.ts       # critical-file logic, scanreg/sfc simulation, boot health
    themes.ts         # applyTheme/applyCursorScheme/applyWallpaper (sets CSS vars)
    audio.ts          # WebAudio sound synth + WAV rendering
    persistence.ts    # localStorage save/load (versioned)
    store.tsx         # OsProvider + reducer + useOs() context hook
  components/
    shell/            # Desktop, Taskbar, StartMenu, WindowFrame, BootScreen, BootMenu,
                      # CrashScreen, DesktopIcon, DesktopContextMenu, MenuBar, Toolbar,
                      # StatusBar, FileDialog, MessageBox host, SafeModeBanner
    apps/             # one file per app + one css file per app + index.tsx renderer map
  data/
    portfolioData.ts  # portfolio content (kept, lightly extended)
    apps.ts           # app registry, desktop icons, start menu model
    initialFilesystem.ts # initial FsState builder (replaces old data/filesystem.ts)
    themes.ts         # theme + wallpaper + cursor scheme definitions
    icons.ts          # IconKey -> /icons path map
    system.ts         # boot steps, misc constants
  types.ts            # all shared types below
docs/OS_CONTRACT.md   # this file
public/cursors/*.svg  # pixel-style cursor assets
public/icons/win98/*  # existing PNG icons (do not rename)
```

Old files that are REPLACED (deleted by their new owner): `src/data/filesystem.ts`,
`src/components/*.tsx` (move to `shell/`), `src/components/apps/ComputerApp.tsx`,
`ThemesApp.tsx`, `SystemPropertiesApp.tsx` (folded into Control Panel).

## 1. Shared types — `src/types.ts` (owner: foundation)

```ts
import type { ReactNode } from 'react'

export type IconKey =
  | 'about' | 'projects' | 'resume' | 'contact' | 'computer' | 'terminal' | 'controlPanel'
  | 'taskManager' | 'network' | 'adminTools' | 'hardDrive' | 'windowsFile' | 'dos' | 'printer'
  | 'modem' | 'mouse' | 'keyboard' | 'display' | 'dateTime' | 'world' | 'notepad' | 'gears'
  | 'networkDrive' | 'recycleBin' | 'recycleBinFull' | 'windows' | 'windowsSmall' | 'shutdown'
  | 'internet' | 'folder' | 'folderOpen' | 'help' | 'paint' | 'hourglass' | 'calculator'
  | 'soundRecorder' | 'mediaPlayer' | 'programGroup' | 'favorites' | 'search'
  | 'shutdownComputer' | 'html' | 'desktop' | 'textFile' | 'imageFile' | 'audioFile'
  | 'videoFile' | 'urlFile' | 'sysFile' | 'batchFile' | 'explorer' | 'run'

export type AppId =
  | 'explorer' | 'recycleBin' | 'terminal' | 'notepad' | 'paint' | 'internetExplorer'
  | 'mediaPlayer' | 'soundRecorder' | 'controlPanel' | 'network' | 'run' | 'taskManager'
  | 'resume' | 'calculator' | 'about' | 'contact' | 'projects' | 'projectDetails' | 'credits'

export type WindowRect = { x: number; y: number; width: number; height: number }
export type Point = { x: number; y: number }

export type ControlPanelSectionId =
  | 'display' | 'mouse' | 'keyboard' | 'datetime' | 'network' | 'sounds' | 'system'
  | 'addremove' | 'printers'

export type WindowPayload = {
  path?: string                 // explorer folder path
  filePath?: string             // document to open (notepad/paint/media/resume)
  url?: string                  // internet explorer target
  projectId?: string
  controlPanelSection?: ControlPanelSectionId
}

export type WindowState = WindowRect & {
  instanceId: string
  appId: AppId
  title: string
  icon: IconKey
  zIndex: number
  minimized: boolean
  maximized: boolean
  payload?: WindowPayload
  previousRect?: WindowRect
}

export type AppDefinition = {
  id: AppId
  title: string
  icon: IconKey
  defaultRect: WindowRect
  singleton?: boolean           // default true
  safeModeAvailable?: boolean   // default true; network/media/sound apps set false
}

// ---------- filesystem ----------
export type FsNodeKind = 'folder' | 'file'

export type FsAttributes = {
  system?: boolean              // shown as System file, lives under C:\Windows
  critical?: boolean            // deleting it crashes Windows / blocks normal boot
  readOnly?: boolean
  hidden?: boolean
}

export type FsNode = {
  path: string                  // normalized: 'C:\\Dir\\File.txt'
  name: string
  kind: FsNodeKind
  icon: IconKey
  fileType: string              // 'Text Document', 'File Folder', 'Application', ...
  size: number                  // bytes (folders: 0)
  modified: string              // 'MM/DD/YYYY hh:mm AM'
  content?: string              // text payload
  dataUrl?: string              // media payload (images/audio/video as data: URL)
  attributes?: FsAttributes
  appId?: AppId                 // launcher nodes (.exe/.cpl/.lnk) open this app
  appPayload?: WindowPayload
  children?: string[]           // folders only: ordered normalized child paths
}

export type RecycleEntry = {
  id: string                    // unique
  rootPath: string              // original path of the deleted root
  name: string
  icon: IconKey
  fileType: string
  deletedAt: string
  critical: boolean
  nodes: Record<string, FsNode> // deleted root + all descendants keyed by ORIGINAL path
}

export type FsState = {
  nodes: Record<string, FsNode>
  recycle: RecycleEntry[]
}

// ---------- network ----------
export type NetworkState = {
  connected: boolean
  dhcp: boolean
  adapterName: string
  macAddress: string
  ipAddress: string
  subnetMask: string
  gateway: string
  dns: string
  packetsSent: number
  packetsReceived: number
  connectedSince?: string
}

// ---------- system / boot ----------
export type OsPhase = 'boot' | 'bootMenu' | 'desktop' | 'dosOnly' | 'recovery' | 'crashed' | 'shutdown'
export type BootMode = 'normal' | 'safe'

export type CrashState = {
  title: string                 // 'Windows protection error'
  message: string
  detail: string
  stopCode: string
  crashedAt: string
}

export type MessageBoxButton = 'ok' | 'cancel' | 'yes' | 'no' | 'retry' | 'abort'
export type MessageBoxRequest = {
  id: string
  title: string
  message: string
  detail?: string
  icon: 'error' | 'warning' | 'info' | 'question'
  buttons: MessageBoxButton[]   // e.g. ['yes','no'] or ['ok']
  onResult?: (button: MessageBoxButton) => void
}

export type ClipboardState = { mode: 'copy' | 'cut'; path: string } | null

export type AudioState = { enabled: boolean; muted: boolean; volume: number } // volume 0..1

export type DesktopIconDef = {
  id: string                    // stable key, e.g. 'myComputer'
  label: string
  icon: IconKey
  appId: AppId
  payload?: WindowPayload
}

export type ThemeDefinition = {
  id: string
  name: string
  vars: Record<string, string>  // CSS custom property name -> value (see §6)
  wallpaperId?: string          // default wallpaper for the theme
}

export type WallpaperDefinition = {
  id: string
  name: string
  css: string                   // value for the desktop `background` shorthand
}

export type CursorSchemeId = 'win98' | 'standard'

export type SoundId =
  | 'startup' | 'shutdown' | 'error' | 'warn' | 'click' | 'menuOpen' | 'recycle'
  | 'networkUp' | 'networkDown' | 'launch' | 'minimize' | 'restore' | 'ding' | 'tada'

export type OsState = {
  phase: OsPhase
  bootMode: BootMode
  bootTarget: 'normal' | 'safe' | 'dos' | 'recovery'   // what the next/current boot loads
  fs: FsState
  windows: WindowState[]
  activeWindowId?: string
  zCounter: number
  network: NetworkState
  themeId: string
  wallpaperId: string
  cursorScheme: CursorSchemeId
  audio: AudioState
  crash: CrashState | null
  desktopIcons: Record<string, Point>   // DesktopIconDef.id -> position
  clipboard: ClipboardState
  messageBoxes: MessageBoxRequest[]
  startMenuOpen: boolean
}

export type ShellChildren = { children?: ReactNode }
```

## 2. Filesystem engine — `src/os/filesystem.ts` (owner: foundation)

Pure functions; never mutate inputs. All paths are normalized internally.

```ts
export function normalizePath(path: string): string        // '/'->'\\', resolves '.', '..', drive default C:
export function joinPath(dir: string, name: string): string
export function parentPath(path: string): string           // parent of 'C:\\' is 'C:\\'
export function baseName(path: string): string
export function extensionOf(name: string): string          // lowercase, no dot, '' if none
export function resolvePath(cwd: string, target: string): string
export function nowStamp(): string                          // 'MM/DD/YYYY hh:mm AM'
export function formatSize(bytes: number): string           // dir '' ; files '12 KB' style (KB, rounded up)
export function getNode(fs: FsState, path: string): FsNode | undefined
export function listDirectory(fs: FsState, path: string): FsNode[]
export function uniqueChildName(fs: FsState, parent: string, desired: string): string // 'Copy of x', 'New Folder (2)'

export type FsResult = { fs: FsState; error: string | null; createdPath?: string }

export function createFolder(fs: FsState, parent: string, name: string): FsResult
export function createFile(
  fs: FsState, parent: string, name: string,
  opts?: { content?: string; dataUrl?: string; icon?: IconKey; fileType?: string },
): FsResult
export function writeFile(fs: FsState, path: string, data: { content?: string; dataUrl?: string }): FsResult // creates missing file
export function renameNode(fs: FsState, path: string, newName: string): FsResult
export function moveNode(fs: FsState, path: string, targetFolder: string): FsResult
export function copyNode(fs: FsState, path: string, targetFolder: string): FsResult
export function deleteNode(fs: FsState, path: string): { fs: FsState; error: string | null; criticalDeleted: boolean }
export function restoreEntry(fs: FsState, entryId: string): FsResult
export function emptyRecycleBin(fs: FsState): FsState

export function isProtectedPath(path: string): boolean   // anything under C:\Windows (incl. itself)
export function isCriticalPath(path: string): boolean    // in REQUIRED_SYSTEM_FILES, or a folder containing one

// File associations
export function openTargetFor(node: FsNode): { appId: AppId; payload: WindowPayload } | null
export function iconForFileName(name: string): IconKey
export function fileTypeForName(name: string): string
```

Behavior rules:

- **Protected scope** = `C:\Windows` and everything inside. `renameNode` / `moveNode` /
  `writeFile` / `createFile` / `createFolder` inside it return error
  `'Access is denied. The file is being used by Windows.'` — EXCEPT restore operations and
  recovery functions which bypass via internal helpers.
- **Delete inside protected scope is allowed** (that's the fun): the node moves to the recycle
  bin like any other delete, and `criticalDeleted` is true when `isCriticalPath(path)`.
  The STORE (not the fs layer) reacts to `criticalDeleted` by crashing.
- Deleting a folder captures its whole subtree into one `RecycleEntry.nodes`.
- `restoreEntry` recreates missing parent folders if needed; collision -> error
  `'Cannot restore: a file with that name already exists.'`
- Associations (in priority order):
  1. `node.appId` set -> `{ appId, payload: node.appPayload }`
  2. folder -> `explorer` with `{ path }`
  3. ext `txt|ini|log|inf|bat|md` -> `notepad` `{ filePath }`
  4. ext `bmp|png|jpg|jpeg|gif` -> `paint` `{ filePath }`
  5. ext `wav|mp3|mp4|avi|mid|webm|ogg` -> `mediaPlayer` `{ filePath }`
  6. ext `url|htm|html` -> `internetExplorer` `{ url: node.content ?? 'about:home' }`
  7. otherwise `null` (shell shows "is not a valid Win32 application" message box)

## 3. Initial filesystem — `src/data/initialFilesystem.ts` (owner: foundation)

```ts
export function createInitialFsState(): FsState
export const REQUIRED_SYSTEM_FILES: string[]   // re-exported by os/recovery.ts
```

Content: keep everything from the old `src/data/filesystem.ts` tree (C:\, My Documents,
My Pictures, Projects, Windows, Windows\System32 + Drivers/Config/Spool, Windows\Command,
Program Files, Network) and add:

- `C:\My Documents\Resume.txt` (content from portfolioData, `appId: 'resume'`)
- `C:\My Documents\Music` folder (empty; Media Player saves demo tunes here)
- `C:\My Pictures\Welcome.bmp` — a real drawable image: small data-URL PNG is NOT needed;
  leave `dataUrl` undefined and Paint treats missing dataUrl as blank canvas with the name.
- `C:\Windows\Media` folder with `.wav` launcher nodes for the synth sounds
  (name e.g. `Startup.wav`, content empty, `appId: 'mediaPlayer'`,
  `appPayload: { filePath: <own path> }`).
- `C:\AUTOEXEC.BAT` and `C:\CONFIG.SYS` (text files, editable, fun retro content).
- Every node under `C:\Windows` gets `attributes.system: true`; files in
  `REQUIRED_SYSTEM_FILES` also get `critical: true`.

`REQUIRED_SYSTEM_FILES` (exactly): `C:\Windows\System32\kernel32.dll`, `user32.dll`,
`gdi32.dll`, `shell32.dll`, `vmm32.vxd`, `display.drv`, `C:\Windows\EXPLORER.EXE`,
`C:\Windows\Command\COMMAND.COM`, `C:\Windows\WIN.INI`, `C:\Windows\SYSTEM.INI`
(full normalized paths).

## 4. Command processor — `src/os/commands.ts` (owner: foundation)

```ts
export type CommandEffect =
  | { type: 'openApp'; appId: AppId; payload?: WindowPayload }
  | { type: 'setFs'; fs: FsState }
  | { type: 'crash'; criticalPath: string }
  | { type: 'restart'; target: 'normal' | 'safe' | 'dos' | 'recovery' | 'bootMenu' }
  | { type: 'networkPing'; sent: number; received: number }
  | { type: 'setNetwork'; network: NetworkState }
  | { type: 'exitWindow' }   // 'exit' closes the terminal window / leaves dosOnly to bootMenu

export type CommandContext = {
  cwd: string
  fs: FsState
  network: NetworkState
  bootMode: BootMode
  dosOnly: boolean            // true when running in Command-Prompt-Only boot
}

export type CommandOutput = {
  lines: string[]             // immediate output lines
  newCwd?: string
  clear?: boolean
  effects?: CommandEffect[]
  stream?: Array<{ delayMs: number; lines: string[]; effects?: CommandEffect[] }> // for ping/scanreg/sfc progress
}

export function executeCommand(input: string, ctx: CommandContext): CommandOutput
export function autoCompletePath(input: string, ctx: CommandContext): string | null
```

Commands (case-insensitive; quoted paths like `cd "My Documents"` must work):
`cls help ver date time mem dir cd chdir md mkdir rd rmdir del erase copy move ren rename
type tree echo start notepad mspaint iexplore calc ping ipconfig winipcfg scanreg sfc
exit win shutdown`

- `dir [path] [/w]` — Win98-style listing: volume header, `<DIR>` entries, file sizes,
  `n file(s) x bytes`, `n dir(s)` footer.
- Unknown command -> exactly `Bad command or file name`.
- File ops route through the §2 functions and surface their errors; `del` of a critical path
  emits effect `{type:'crash', criticalPath}` after the deletion effect.
- `ping <host>`: emits `stream` with 4 replies at ~600ms apart + stats line; offline ->
  `Request timed out.` x4; known hosts: `portfolio.local`, `localhost`, gateway IP, DNS IP,
  `google.com`, `youtube.com`, `github.com`. Also emits `networkPing` effect.
- `ipconfig` / `winipcfg` `[/all|/release|/renew]` — uses/updates NetworkState via effects.
- `scanreg /restore` and `sfc /scannow`: stream progress lines, then `setFs` effect with
  restored system files (via `os/recovery.ts`); plain `scanreg` prints registry-ok text.
- `start <name>`: resolves apps (`notepad`, `mspaint`, `iexplore`, `calc`, `explorer`,
  `mediaplayer`, `sndrec32`) or a path (file association), else error.
- `win` (only meaningful when `dosOnly`): effect `{type:'restart', target:'normal'}`.
- `mem`, `ver` (`Windows 98 [Version 4.10.1998]`), `date`, `time` — flavor output.

## 5. Recovery — `src/os/recovery.ts` (owner: foundation)

```ts
export const REQUIRED_SYSTEM_FILES: string[]            // re-export from initialFilesystem
export function missingSystemFiles(fs: FsState): string[]   // initial C:\Windows nodes absent from fs
export function isSystemHealthy(fs: FsState): boolean
export function restoreSystemFiles(fs: FsState): { fs: FsState; restored: string[] }
  // re-inserts every missing initial C:\Windows node, removes matching recycle entries
export function scanregLines(restored: string[]): string[]  // themed output for the stream
export function sfcLines(restored: string[]): string[]
```

Boot flow (implemented in store + shell):
- Deleting a critical file => message box style crash: store sets `crash`, phase `crashed`.
- From `crashed`, restart -> phase `bootMenu` when `!isSystemHealthy`, else `boot`.
- BootMenu options: 1 Normal, 2 Safe Mode, 3 Command Prompt Only, 4 Recovery Console.
  Normal with unhealthy system: boot screen runs ~3s then fails back to `bootMenu` with an
  error note. Safe Mode boots desktop with `bootMode:'safe'`. Command Prompt Only -> phase
  `dosOnly` (fullscreen terminal). Recovery -> phase `recovery` (ScanReg wizard UI).
- Safe mode: 16-color look (theme override), no wallpaper, network forced disconnected,
  audio disabled, only apps with `safeModeAvailable !== false` launchable.
- After `restoreSystemFiles` makes the system healthy, normal boot succeeds.

## 6. Themes / wallpaper / cursors — `src/os/themes.ts` + `src/data/themes.ts` (owner: foundation)

`applyTheme(theme: ThemeDefinition)`, `applyWallpaper(w: WallpaperDefinition)`,
`applyCursorScheme(scheme: CursorSchemeId)` set CSS custom properties / data attributes on
`document.documentElement`. The store calls these in effects; components never touch the DOM
root directly.

CSS variables every theme must define (used by App.css and app css):

```
--w98-desktop            (desktop background color)
--w98-titlebar-1 --w98-titlebar-2          (active title bar gradient)
--w98-titlebar-inactive-1 --w98-titlebar-inactive-2
--w98-titlebar-text
--w98-highlight --w98-highlight-text       (selection)
--w98-surface --w98-text                   (window chrome)
--w98-font
```

Also override matching 98.css root vars when present (`--surface`, `--button-highlight`,
`--button-face`, `--button-shadow`, `--window-frame`, `--dialog-blue`, `--dialog-blue-light`,
`--dialog-gray`, `--dialog-gray-light`, `--link-blue`). Inspect
`node_modules/98.css/dist/98.css` for the exact list and mirror it.

Themes to ship in `src/data/themes.ts`: `windowsStandard` (classic teal+navy),
`desertSunset`, `eggplant`, `rainyDay`, `highContrast`, `safeMode16` (internal, used by safe
mode). Wallpapers: `none`, `teal`, `clouds98` (CSS gradient sky), `setupBlue` (gradient),
`grid` (repeating-linear-gradient). All pure CSS — no image downloads.

Cursor scheme `win98` sets `html[data-cursor='win98']`; App.css maps:
default/buttons -> `url('/cursors/arrow.svg') 1 1, default`; busy (html[data-busy='true'] *)
-> `url('/cursors/hourglass.svg') 8 8, wait`; text inputs -> native `text`; links/taskbar
buttons -> `url('/cursors/hand.svg') 5 1, pointer`; move -> `url('/cursors/move.svg') 8 8, move`;
resize handled with native `ns-resize`/`ew-resize`/`nwse-resize`/`nesw-resize`;
disabled -> `url('/cursors/no.svg') 8 8, not-allowed`; precision (Paint canvas) ->
`url('/cursors/cross.svg') 8 8, crosshair`. Foundation draws the SVGs (pixelated, black with
white outline, 24x24 or 32x32, `shape-rendering="crispEdges"`).

## 7. Audio — `src/os/audio.ts` (owner: foundation)

```ts
export function unlockAudio(): void            // create/resume AudioContext (user gesture)
export function isAudioUnlocked(): boolean
export function playSound(id: SoundId, volume: number): void   // no-op until unlocked
export async function renderSoundToWavDataUrl(id: SoundId): Promise<string>
  // OfflineAudioContext -> 16-bit PCM WAV data URL (used by soundboard 'save as file'
  // and by Media Player demo tunes)
export const soundCatalog: Array<{ id: SoundId; label: string; description: string }>
```

All sounds synthesized (oscillators, noise buffers, envelopes) — retro-feeling original
jingles, NOT recreations of Microsoft melodies. `startup` ~2.5s warm pad chord rise; `error`
short low square ding; `click` 10ms tick; `recycle` paper-crinkle noise sweep; etc.

## 8. Persistence — `src/os/persistence.ts` (owner: foundation)

```ts
export type PersistedState = {
  version: 2
  fs: FsState
  themeId: string
  wallpaperId: string
  cursorScheme: CursorSchemeId
  audio: AudioState
  network: NetworkState
  desktopIcons: Record<string, Point>
}
export function loadPersistedState(): PersistedState | null   // validate version; null on any error
export function persistState(state: OsState): void            // extract + save (call sites debounce)
export function clearPersistedState(): void
```
Key: `'win98-portfolio.v2'`.

## 9. Store — `src/os/store.tsx` (owner: foundation)

`OsProvider` (wraps app in `main.tsx`), `useOs()` hook. Reducer + `useReducer`, with a ref to
latest state so the imperative helpers below are synchronous. The provider:

- initializes from `loadPersistedState() ?? defaults`, phase `'boot'`
- debounce-persists on relevant changes (300ms)
- applies theme/wallpaper/cursor effects when those ids change
- plays sounds for: window open (`launch`), minimize, restore, error message box (`error`),
  recycle (`recycle`), network connect/disconnect, startup/shutdown on phase changes

```ts
export type OsContextValue = {
  state: OsState
  // windows
  openApp(appId: AppId, payload?: WindowPayload): void
  openNode(path: string): void          // association launch; error message box when null/missing
  closeWindow(id: string): void
  minimizeWindow(id: string): void
  focusWindow(id: string): void
  toggleMaximize(id: string): void
  moveWindow(id: string, rect: WindowRect): void
  setWindowTitle(id: string, title: string): void
  // desktop / shell
  setStartMenuOpen(open: boolean): void
  moveDesktopIcon(id: string, pos: Point): void
  arrangeDesktopIcons(): void
  showMessageBox(req: Omit<MessageBoxRequest, 'id'>): void
  dismissMessageBox(id: string, button: MessageBoxButton): void
  // filesystem (sync; return error string or null; internally dispatch + handle crash)
  fsOps: {
    createFolder(parent: string, name: string): string | null
    createFile(parent: string, name: string, opts?: { content?: string; dataUrl?: string }): string | null
    writeFile(path: string, data: { content?: string; dataUrl?: string }): string | null
    renameNode(path: string, newName: string): string | null
    moveNode(path: string, targetFolder: string): string | null
    copyNode(path: string, targetFolder: string): string | null
    deleteNode(path: string, opts?: { skipConfirm?: boolean }): string | null
    restoreEntry(entryId: string): string | null
    emptyRecycleBin(): void
    replaceFs(fs: FsState): void
  }
  setClipboard(c: ClipboardState): void
  // network
  networkOps: {
    connect(): void
    disconnect(): void
    renewDhcp(): void
    applyConfig(partial: Partial<NetworkState>): void
    recordTraffic(sent: number, received: number): void
  }
  // appearance
  setTheme(themeId: string): void
  setWallpaper(wallpaperId: string): void
  setCursorScheme(scheme: CursorSchemeId): void
  // audio
  enableAudio(): void           // unlockAudio + state.audio.enabled = true + play 'ding'
  setAudioMuted(muted: boolean): void
  setAudioVolume(volume: number): void
  playSound(id: SoundId): void  // respects enabled/muted/volume and safe mode
  // system
  crashSystem(crash: CrashState): void
  restart(target?: 'normal' | 'safe' | 'dos' | 'recovery' | 'bootMenu'): void
  shutDown(): void
  finishBoot(): void            // BootScreen calls when progress completes (store decides desktop vs bootMenu fail)
  resetEverything(): void       // clearPersistedState + reload defaults + phase 'boot'
}
export function OsProvider({ children }: { children: ReactNode }): ReactNode
export function useOs(): OsContextValue
```

`fsOps.deleteNode` behavior: when the target is critical, the store performs the delete, then
(after ~900ms, letting Explorer show the file disappear) calls `crashSystem` with a
'Windows protection error'. Non-critical deletes play `recycle`.

`restart(target)`: clears windows, sets `bootTarget`, phase `boot` (or `bootMenu` directly
when target is `'bootMenu'`). `finishBoot()`: if `bootTarget==='normal' && !isSystemHealthy` ->
phase `bootMenu` (failed boot flag passed via store state `crash` remaining set? NO — use a
dedicated transient: set `bootTarget:'normal'` and let BootMenu show a warning whenever
`!isSystemHealthy`). If healthy or safe -> `desktop` with proper `bootMode`; `dos` -> `dosOnly`;
`recovery` -> `recovery`.

## 10. App registry + desktop/start data — `src/data/apps.ts` (owner: foundation)

```ts
export const appDefinitions: Record<AppId, AppDefinition>
export const desktopIconDefs: DesktopIconDef[]   // My Computer, My Documents, Recycle Bin,
  // Network Neighborhood, Internet Explorer, MS-DOS Prompt, My Projects (explorer at C:\Projects),
  // Resume.txt, Paint, Media Player
export type StartMenuModel = Array<
  | { kind: 'item'; id: string; label: string; icon: IconKey; appId: AppId; payload?: WindowPayload }
  | { kind: 'submenu'; id: string; label: string; icon: IconKey; items: StartMenuModel }
  | { kind: 'separator'; id: string }
>
export const startMenuModel: StartMenuModel
  // Programs > (Accessories > Notepad/Paint/Calculator/Media Player/Sound Recorder),
  //            (MS-DOS Prompt, Internet Explorer, Windows Explorer)
  // Documents > Resume.txt + My Documents
  // Settings > Control Panel, Network, Taskbar...
  // Portfolio > About Me, Projects, Contact, Credits
  // Run..., Help, Shut Down handled by StartMenu component itself
```

Apps with `safeModeAvailable: false`: internetExplorer, mediaPlayer, soundRecorder, network.

## 11. Shell components — `src/components/shell/` (owner: shell)

All shell components consume `useOs()`. Files + key exports:

- `Desktop.tsx` — `export function Desktop()`: icons layer, windows layer, start menu,
  context menu, message boxes, safe-mode banner, "Enable sound" tray bubble.
- `WindowFrame.tsx` — drag/resize/min/max/close, double-click title to maximize,
  resize from all 8 edges/corners.
- `Taskbar.tsx` — Start button, quick-launch (IE, desktop), task buttons, tray:
  sound toggle (speaker icon, click = enableAudio/mute), network icon (two screens; red X
  when disconnected; click opens Network app), clock (tooltip with full date).
- `StartMenu.tsx` — renders `startMenuModel` with cascading submenus, Win98 sidebar banner,
  Run/Help/Shut Down items; Shut Down opens the shutdown dialog (Shut down / Restart /
  Restart in MS-DOS mode -> `restart('dos')`).
- `DesktopIcon.tsx`, `DesktopContextMenu.tsx` (Arrange Icons, Refresh, New Folder/Text
  Document on desktop?? — desktop is not a folder in v2: omit New, keep Arrange/Refresh/
  Properties -> Control Panel display).
- `BootScreen.tsx` — staged BIOS text then Windows 98 logo bar; calls `finishBoot()`;
  safe-mode boot shows "Safe mode" text; failed normal boot shows protection error lines first.
- `BootMenu.tsx` — keyboard-driven (arrows + Enter, also clickable) Microsoft Windows 98
  Startup Menu, options per §5, warning line when system unhealthy.
- `CrashScreen.tsx` — fullscreen blue screen, 'press any key' -> `restart('bootMenu')`.
- `RecoveryConsole.tsx` — Windows Registry Checker themed wizard: scan -> list missing files
  -> Restore button -> progress -> success -> Restart button (`restart('normal')`).
- `MenuBar.tsx`, `Toolbar.tsx`, `StatusBar.tsx`, `FileDialog.tsx`, `MessageBoxHost.tsx`:

```tsx
export type MenuEntry =
  | { kind: 'item'; label: string; shortcut?: string; disabled?: boolean; checked?: boolean; onSelect: () => void }
  | { kind: 'separator' }
  | { kind: 'submenu'; label: string; items: MenuEntry[] }
export function MenuBar(props: { menus: Array<{ label: string; items: MenuEntry[] }> })

export function Toolbar(props: { children: ReactNode })
export function ToolbarButton(props: {
  label?: string; icon?: IconKey; title?: string; disabled?: boolean; pressed?: boolean; onClick: () => void
})
export function ToolbarSeparator(): ReactNode

export function StatusBar(props: { fields: ReactNode[] })  // 98.css .status-bar

export type FileDialogProps = {
  mode: 'open' | 'save'
  title: string
  initialDir?: string            // default 'C:\\My Documents'
  initialName?: string
  extensions?: string[]          // filter + auto-append on save, e.g. ['txt']
  onSelect: (path: string) => void
  onCancel: () => void
}
export function FileDialog(props: FileDialogProps)   // absolute-positioned modal overlay
                                                     // INSIDE the app window content area
```

- `App.tsx` becomes thin: switch on `state.phase` -> BootScreen/BootMenu/Desktop/
  CrashScreen/RecoveryConsole/dosOnly fullscreen Terminal/shutdown screen.
- `main.tsx`: imports `98.css`, `index.css`, wraps `<OsProvider><App/></OsProvider>`.
- `App.css`: shell + shared styles ONLY (desktop, taskbar, windows, menus, toolbar, statusbar,
  dialogs, cursors, boot/crash screens, scanlines). Apps own their styles in per-app css.

## 12. Apps — `src/components/apps/` (one owner each)

Every app file exports `export function <Name>App(props: AppProps)`:

```ts
export type AppProps = { windowId: string; payload?: WindowPayload }   // defined in types.ts
```

`index.tsx` (owner: shell): `export function renderAppWindow(win: WindowState): ReactNode`
mapping appId -> component (explorer->ExplorerApp etc., recycleBin->RecycleBinApp,
terminal->TerminalApp, notepad->NotepadApp, paint->PaintApp, internetExplorer->
InternetExplorerApp, mediaPlayer->MediaPlayerApp, soundRecorder->SoundRecorderApp,
controlPanel->ControlPanelApp, network->NetworkApp, run->RunDialogApp, taskManager->
TaskManagerApp, resume->ResumeApp, calculator->CalculatorApp, about->AboutApp, contact->
ContactApp, projects->ProjectsApp, projectDetails->ProjectDetailsApp, credits->CreditsApp).

CSS prefixes (one css file per app, imported by its component):
explorer `ex-`, recycle bin `rb-`, terminal `dos-`, notepad `np-`, paint `pa-`, IE `ie-`,
media player `mp-`, sound recorder `sr-`, control panel `cp-`, network `nw-`, misc apps `ms-`.

App behavior specs live in the build prompts; the contract only fixes the interfaces above.

## 13. Icons — `src/data/icons.ts` (owner: foundation)

Extend `win98Icons: Record<IconKey, string>` mapping the new keys to EXISTING PNGs in
`/icons/win98/` (mediaPlayer->multimedia-3.png, explorer->search_file_2-3.png or
directory_open..., textFile->notepad_file-1.png, imageFile->paint_old-1.png,
audioFile->loudspeaker_rays-0.png, videoFile->multimedia-3.png, urlFile->html2-4.png,
sysFile->file_windows-1.png, batchFile->ms_dos_2-1.png, run->application_hourglass? no ->
file_windows-1.png, folderOpen->directory_open_file_mydocs-2.png,
recycleBinFull->recycle_bin_empty-1.png). Do not add binary files.

## 14. Tests (owner: tests agent)

Vitest (already in devDependencies; scripts: `npm test` -> `vitest run`). Pure-logic tests
only (no DOM): `src/os/__tests__/filesystem.test.ts`, `commands.test.ts`, `recovery.test.ts`,
`network.test.ts`, `associations.test.ts`. Use `createInitialFsState()` as fixture base.

## 15. File ownership

| Owner | Files |
|---|---|
| foundation | `src/types.ts`, `src/os/*` (except tests), `src/data/initialFilesystem.ts`, `src/data/apps.ts`, `src/data/themes.ts`, `src/data/icons.ts`, `src/data/system.ts`, `public/cursors/*.svg`; deletes `src/data/filesystem.ts` |
| shell | `src/components/shell/*`, `src/components/apps/index.tsx`, `src/App.tsx`, `src/App.css`, `src/main.tsx`, `src/index.css`; deletes old `src/components/*.tsx` |
| explorer | `apps/ExplorerApp.tsx` + `explorer.css`, `apps/RecycleBinApp.tsx` + `recyclebin.css`; deletes `apps/ComputerApp.tsx` |
| terminal | `apps/TerminalApp.tsx` + `terminal.css` |
| notepad | `apps/NotepadApp.tsx` + `notepad.css`, `apps/ResumeApp.tsx` + `resume.css` |
| paint | `apps/PaintApp.tsx` + `paint.css` |
| ie | `apps/InternetExplorerApp.tsx` + `ie.css`, `apps/NetworkApp.tsx` + `network.css` |
| media | `apps/MediaPlayerApp.tsx` + `mediaplayer.css`, `apps/SoundRecorderApp.tsx` + `soundrecorder.css` |
| controlpanel | `apps/ControlPanelApp.tsx` + `controlpanel.css`; deletes `apps/ThemesApp.tsx`, `apps/SystemPropertiesApp.tsx` |
| misc | `apps/TaskManagerApp.tsx`, `apps/RunDialogApp.tsx`, `apps/AboutApp.tsx`, `apps/ContactApp.tsx`, `apps/ProjectsApp.tsx`, `apps/ProjectDetailsApp.tsx`, `apps/CreditsApp.tsx`, `apps/CalculatorApp.tsx`, shared `misc.css` |
| tests | `src/os/__tests__/*`, `vitest.config.ts` |
| orchestrator | `package.json`, `docs/*`, `README.md`, `index.html` |
