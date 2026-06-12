import type { ReactNode } from 'react'

export type IconKey =
  | 'about'
  | 'projects'
  | 'resume'
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
  | 'gears'
  | 'networkDrive'
  | 'recycleBin'
  | 'windows'
  | 'windowsSmall'
  | 'shutdown'
  | 'internet'
  | 'folder'
  | 'help'
  | 'paint'
  | 'hourglass'
  | 'calculator'
  | 'soundRecorder'
  | 'programGroup'
  | 'favorites'
  | 'search'
  | 'shutdownComputer'
  | 'html'
  | 'desktop'

export type AppId =
  | 'about'
  | 'projects'
  | 'resume'
  | 'contact'
  | 'computer'
  | 'terminal'
  | 'controlPanel'
  | 'paint'
  | 'network'
  | 'run'
  | 'systemProperties'
  | 'taskManager'
  | 'recycleBin'
  | 'credits'
  | 'projectDetails'
  | 'documents'
  | 'pictures'
  | 'internetExplorer'
  | 'notepad'
  | 'calculator'
  | 'soundRecorder'
  | 'themes'

export type WindowRect = {
  x: number
  y: number
  width: number
  height: number
}

export type DesktopIconPosition = {
  x: number
  y: number
}

export type WindowPayload = {
  path?: string
  filePath?: string
  projectId?: string
  command?: string
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
  desktop?: boolean
  startMenu?: boolean
  singleton?: boolean
}

export type AppRendererProps = {
  window: WindowState
  openApp: (appId: AppId, payload?: WindowPayload) => void
}

export type FileSystemNodeKind = 'folder' | 'file' | 'app'

export type FileSystemNode = {
  path: string
  name: string
  kind: FileSystemNodeKind
  icon: IconKey
  size?: number
  modified: string
  appId?: AppId
  content?: string
  fileType?: string
  children?: string[]
}

export type DeletedFileEntry = {
  path: string
  name: string
  kind: FileSystemNodeKind
  icon: IconKey
  fileType?: string
  deletedAt: string
  critical: boolean
}

export type SystemCrashState = {
  path: string
  title: string
  message: string
  detail: string
  stopCode: string
  crashedAt: string
}

export type ControlPanelSectionId =
  | 'display'
  | 'mouse'
  | 'keyboard'
  | 'datetime'
  | 'network'
  | 'printers'
  | 'system'

export type NetworkStatus = {
  connected: boolean
  adapterName: string
  ipAddress: string
  subnetMask: string
  gateway: string
  dns: string
  packetsSent: number
  packetsReceived: number
  lastPing?: string
}

export type ShellMenuItem = {
  id: string
  label: string
  icon: IconKey
  content?: ReactNode
}
