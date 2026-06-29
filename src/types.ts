import type { ReactNode } from 'react'

export type IconKey =
  | 'about'
  | 'student'
  | 'projects'
  | 'contact'
  | 'computer'
  | 'terminal'
  | 'controlPanel'
  | 'taskManager'
  | 'network'
  | 'adminTools'
  | 'hardDrive'
  | 'windowsFile'
  | 'dos'
  | 'printer'
  | 'modem'
  | 'mouse'
  | 'keyboard'
  | 'display'
  | 'dateTime'
  | 'world'
  | 'notepad'
  | 'wordpad'
  | 'gears'
  | 'networkDrive'
  | 'recycleBin'
  | 'recycleBinFull'
  | 'windows'
  | 'windowsSmall'
  | 'shutdown'
  | 'internet'
  | 'folder'
  | 'folderOpen'
  | 'help'
  | 'paint'
  | 'hourglass'
  | 'calculator'
  | 'soundRecorder'
  | 'mediaPlayer'
  | 'programGroup'
  | 'favorites'
  | 'search'
  | 'shutdownComputer'
  | 'html'
  | 'desktop'
  | 'textFile'
  | 'imageFile'
  | 'gallery'
  | 'audioFile'
  | 'videoPlayer'
  | 'videoFile'
  | 'urlFile'
  | 'sysFile'
  | 'execFile'
  | 'dllFile'
  | 'driverFile'
  | 'cplFile'
  | 'regFile'
  | 'iniFile'
  | 'fontFile'
  | 'batchFile'
  | 'explorer'
  | 'run'
  | 'minesweeper'
  | 'wolfenstein'
  | 'doom'
  | 'inbox'

export type AppId =
  | 'explorer'
  | 'recycleBin'
  | 'terminal'
  | 'notepad'
  | 'wordpad'
  | 'pdfViewer'
  | 'paint'
  | 'imageViewer'
  | 'internetExplorer'
  | 'mediaPlayer'
  | 'videoPlayer'
  | 'gallery'
  | 'soundRecorder'
  | 'controlPanel'
  | 'network'
  | 'run'
  | 'taskManager'
  | 'systemInfo'
  | 'deviceManager'
  | 'msconfig'
  | 'registryEditor'
  | 'scandisk'
  | 'defrag'
  | 'calculator'
  | 'minesweeper'
  | 'dosGame'
  | 'antivirus'
  | 'setupSafety'
  | 'about'
  | 'contact'
  | 'projects'
  | 'projectDetails'
  | 'credits'
  | 'help'
  | 'inbox'

export type WindowRect = { x: number; y: number; width: number; height: number }
export type Point = { x: number; y: number }

export type ControlPanelSectionId =
  | 'display'
  | 'mouse'
  | 'keyboard'
  | 'datetime'
  | 'network'
  | 'sounds'
  | 'system'
  | 'addremove'
  | 'printers'

export type WindowPayload = {
  path?: string // explorer folder path
  filePath?: string // document to open (notepad/paint/media/resume)
  url?: string // internet explorer target
  windowTitle?: string // overrides the app definition title in the window title bar
  command?: string // terminal: a command to run on open (Run dialog routes commands here)
  projectId?: string
  controlPanelSection?: ControlPanelSectionId
}

export type AppProps = { windowId: string; payload?: WindowPayload }

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
  singleton?: boolean // default true
  safeModeAvailable?: boolean // default true; network/media/sound apps set false
  systemDependencies?: string[] // protected system files required before the app can launch
  driverDependencies?: DriverType[] // simulated driver categories required before the app can launch
  memoryCost?: number // simulated RAM (MB) this app occupies while open; defaults applied in the store
}

// ---------- filesystem ----------
export type FsNodeKind = 'folder' | 'file'
export type DriverType = 'network' | 'audio' | 'video' | 'input' | 'storage'

export type FsAttributes = {
  system?: boolean // shown as System file, lives under C:\Windows
  critical?: boolean // deleting it crashes Windows / blocks normal boot
  driverType?: DriverType // simulated device driver category; missing drivers degrade related portfolio OS features only
  readOnly?: boolean
  hidden?: boolean
  passcode?: string // folders only: opening prompts for this code before contents show
}

export type FsNode = {
  path: string // normalized: 'C:\\Dir\\File.txt'
  name: string
  kind: FsNodeKind
  icon: IconKey
  fileType: string // 'Text Document', 'File Folder', 'Application', ...
  size: number // bytes (folders: 0)
  modified: string // 'MM/DD/YYYY hh:mm AM'
  content?: string // text payload
  dataUrl?: string // media payload URL/data URL, or indexeddb:// ref for local imports
  attributes?: FsAttributes
  appId?: AppId // launcher nodes (.exe/.cpl/.lnk) open this app
  appPayload?: WindowPayload
  children?: string[] // folders only: ordered normalized child paths
}

export type RecycleEntry = {
  id: string // unique
  rootPath: string // original path of the deleted root
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
export type BootDeviceId = 'hardDisk' | 'cdrom' | 'floppy' | 'network'
export type BiosSettings = {
  quickPost: boolean
  floppyEnabled: boolean
  cdromEnabled: boolean
  networkBootEnabled: boolean
  soundEnabled: boolean
  virusWarning: boolean
  pnpOsInstalled: boolean
  resetConfigurationData: boolean
  assignIrqForVga: boolean
  cmosDate: string
  cmosTime: string
  displayMode: 'egaVga' | 'cga80' | 'mono'
  powerManagement: 'userDefine' | 'maxSaving' | 'minSaving' | 'disabled'
  apmEnabled: boolean
  videoOffMethod: 'vhSyncBlank' | 'blankScreen' | 'dpms'
  modemIrq: '3' | '4' | '5' | '7' | 'NA'
  softOffMode: 'instantOff' | 'delay4Sec'
  haltOn: 'allErrors' | 'noErrors' | 'allButKeyboard'
  bootOrder: BootDeviceId[]
}

export type OsPhase =
  | 'boot'
  | 'biosSetup'
  | 'bootMenu'
  | 'desktop'
  | 'dosOnly'
  | 'recovery'
  | 'crashed'
  | 'loadFailed'
  | 'safetyTraining'
  | 'startupScan'
  | 'shutdown'
export type BootMode = 'normal' | 'safe'
export type BootProfile = 'cold' | 'warm'

export type CrashState = {
  title: string // 'Windows protection error'
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
  buttons: MessageBoxButton[] // e.g. ['yes','no'] or ['ok']
  errorCode?: string
  recoveryHint?: string
  onResult?: (button: MessageBoxButton) => void
}

export type OsNotification = { id: string; title: string; body: string }

export type ClipboardState = { mode: 'copy' | 'cut'; path: string } | null

export type AudioState = { enabled: boolean; muted: boolean; volume: number } // volume 0..1

export type DesktopIconDef = {
  id: string // stable key, e.g. 'myComputer'
  label: string
  icon: IconKey
  appId: AppId
  payload?: WindowPayload
}

export type ThemeDefinition = {
  id: string
  name: string
  description?: string
  vars: Record<string, string> // CSS custom property name -> value
  wallpaperId?: string // default wallpaper for the theme
}

export type WallpaperDefinition = {
  id: string
  name: string
  description?: string
  css: string // value for the desktop `background` shorthand
}

export type WallpaperMode = 'stretch' | 'center' | 'tile'

export type AppearanceEffects = {
  mouseTrails: boolean
  menuShadows: boolean
  windowAnimations: boolean
}

export type CursorSchemeId = 'win98' | 'standard'

export type SoundId =
  | 'startup'
  | 'shutdown'
  | 'error'
  | 'warn'
  | 'click'
  | 'menuOpen'
  | 'recycle'
  | 'networkUp'
  | 'networkDown'
  | 'launch'
  | 'minimize'
  | 'restore'
  | 'ding'
  | 'tada'

export type OsState = {
  phase: OsPhase
  bootMode: BootMode
  bootProfile: BootProfile
  bootTarget: 'normal' | 'safe' | 'dos' | 'recovery' // what the next/current boot loads
  bios: BiosSettings
  fs: FsState
  windows: WindowState[]
  activeWindowId?: string
  zCounter: number
  network: NetworkState
  themeId: string
  wallpaperId: string
  wallpaperMode: WallpaperMode
  appearanceEffects: AppearanceEffects
  cursorScheme: CursorSchemeId
  audio: AudioState
  crash: CrashState | null
  pendingSafetyTraining: boolean
  pendingStartupScan: boolean // true after an improper exit -> shows the startup ScanDisk screen
  pendingSystemRestore: boolean // SFC/SCANREG scheduled a protected-file restore; applied on next restart
  desktopIcons: Record<string, Point> // DesktopIconDef.id -> position
  clipboard: ClipboardState
  messageBoxes: MessageBoxRequest[]
  notifications: OsNotification[] // transient taskbar balloons (e.g. driver removed)
  startMenuOpen: boolean
}

export type ShellChildren = { children?: ReactNode }
