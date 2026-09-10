import { Suspense, lazy } from 'react'
import type { AppId, WindowPayload, WindowState } from '../../types'

const CalculatorApp = lazy(() => import('../apps/CalculatorApp').then((m) => ({ default: m.CalculatorApp })))
const ControlPanelApp = lazy(() => import('../apps/ControlPanelApp').then((m) => ({ default: m.ControlPanelApp })))
const CreditsApp = lazy(() => import('../apps/CreditsApp').then((m) => ({ default: m.CreditsApp })))
const ExplorerApp = lazy(() => import('../apps/ExplorerApp').then((m) => ({ default: m.ExplorerApp })))
const GalleryApp = lazy(() => import('../apps/GalleryApp').then((m) => ({ default: m.GalleryApp })))
const HelpApp = lazy(() => import('../apps/HelpApp').then((m) => ({ default: m.HelpApp })))
const ImageViewerApp = lazy(() => import('../apps/ImageViewerApp').then((m) => ({ default: m.ImageViewerApp })))
const InternetExplorerApp = lazy(() =>
  import('../apps/InternetExplorerApp').then((m) => ({ default: m.InternetExplorerApp })),
)
const InboxApp = lazy(() => import('../apps/InboxApp').then((m) => ({ default: m.InboxApp })))
const MediaPlayerApp = lazy(() => import('../apps/MediaPlayerApp').then((m) => ({ default: m.MediaPlayerApp })))
const JsDosGameApp = lazy(() => import('../apps/JsDosGameApp').then((m) => ({ default: m.JsDosGameApp })))
const MinesweeperApp = lazy(() => import('../apps/MinesweeperApp').then((m) => ({ default: m.MinesweeperApp })))
const NetworkApp = lazy(() => import('../apps/NetworkApp').then((m) => ({ default: m.NetworkApp })))
const NotepadApp = lazy(() => import('../apps/NotepadApp').then((m) => ({ default: m.NotepadApp })))
const PaintApp = lazy(() => import('../apps/PaintApp').then((m) => ({ default: m.PaintApp })))
const PdfViewerApp = lazy(() => import('../apps/PdfViewerApp').then((m) => ({ default: m.PdfViewerApp })))
const RecycleBinApp = lazy(() => import('../apps/RecycleBinApp').then((m) => ({ default: m.RecycleBinApp })))
const RegistryEditorApp = lazy(() =>
  import('../apps/RegistryEditorApp').then((m) => ({ default: m.RegistryEditorApp })),
)
const ScanDiskApp = lazy(() => import('../apps/ScanDiskApp').then((m) => ({ default: m.ScanDiskApp })))
const DefragApp = lazy(() => import('../apps/DefragApp').then((m) => ({ default: m.DefragApp })))
const RunDialogApp = lazy(() => import('../apps/RunDialogApp').then((m) => ({ default: m.RunDialogApp })))
const SetupSafetyApp = lazy(() => import('../apps/SetupSafetyApp').then((m) => ({ default: m.SetupSafetyApp })))
const SoundRecorderApp = lazy(() =>
  import('../apps/SoundRecorderApp').then((m) => ({ default: m.SoundRecorderApp })),
)
const TaskManagerApp = lazy(() => import('../apps/TaskManagerApp').then((m) => ({ default: m.TaskManagerApp })))
const SystemLogApp = lazy(() => import('../apps/SystemLogApp').then((m) => ({ default: m.SystemLogApp })))
const SystemInfoApp = lazy(() => import('../apps/SystemInfoApp').then((m) => ({ default: m.SystemInfoApp })))
const DeviceManagerApp = lazy(() => import('../apps/DeviceManagerApp').then((m) => ({ default: m.DeviceManagerApp })))
const MsConfigApp = lazy(() => import('../apps/MsConfigApp').then((m) => ({ default: m.MsConfigApp })))
const TerminalApp = lazy(() => import('../apps/TerminalApp').then((m) => ({ default: m.TerminalApp })))
const VideoPlayerApp = lazy(() => import('../apps/VideoPlayerApp').then((m) => ({ default: m.VideoPlayerApp })))
const AntivirusApp = lazy(() => import('../apps/AntivirusApp').then((m) => ({ default: m.AntivirusApp })))
const WordPadApp = lazy(() => import('../apps/WordPadApp').then((m) => ({ default: m.WordPadApp })))
const Happy99App = lazy(() => import('../apps/Happy99App').then((m) => ({ default: m.Happy99App })))
const BonziBuddyApp = lazy(() => import('../apps/BonziBuddyApp').then((m) => ({ default: m.BonziBuddyApp })))
const CascadeApp = lazy(() => import('../apps/CascadeApp').then((m) => ({ default: m.CascadeApp })))
const NetBusApp = lazy(() => import('../apps/NetBusApp').then((m) => ({ default: m.NetBusApp })))

type AppWindowContentProps = {
  windowState: WindowState
  openApp: (appId: AppId, payload?: WindowPayload) => void
}

function appWindowBody(windowState: WindowState) {
  const props = { windowId: windowState.instanceId, payload: windowState.payload }
  switch (windowState.appId) {
    case 'explorer':
      return <ExplorerApp {...props} />
    case 'recycleBin':
      return <RecycleBinApp />
    case 'terminal':
      return <TerminalApp {...props} />
    case 'notepad':
      return <NotepadApp {...props} />
    case 'wordpad':
      return <WordPadApp {...props} />
    case 'pdfViewer':
      return <PdfViewerApp key={windowState.payload?.filePath ?? windowState.instanceId} {...props} />
    case 'paint':
      return <PaintApp {...props} />
    case 'imageViewer':
      return <ImageViewerApp key={windowState.payload?.filePath ?? windowState.instanceId} {...props} />
    case 'internetExplorer':
      return <InternetExplorerApp {...props} />
    case 'inbox':
      return <InboxApp />
    case 'mediaPlayer':
      return <MediaPlayerApp key={windowState.payload?.filePath ?? windowState.payload?.url ?? windowState.instanceId} {...props} />
    case 'videoPlayer':
      return <VideoPlayerApp key={windowState.payload?.filePath ?? windowState.payload?.url ?? windowState.instanceId} {...props} />
    case 'gallery':
      return <GalleryApp />
    case 'soundRecorder':
      return <SoundRecorderApp />
    case 'controlPanel':
      return <ControlPanelApp key={windowState.payload?.controlPanelSection ?? 'controlPanel'} {...props} />
    case 'network':
      return <NetworkApp />
    case 'run':
      return <RunDialogApp {...props} />
    case 'taskManager':
      return <TaskManagerApp />
    case 'systemLog':
      return <SystemLogApp />
    case 'systemInfo':
      return <SystemInfoApp />
    case 'deviceManager':
      return <DeviceManagerApp />
    case 'msconfig':
      return <MsConfigApp />
    case 'registryEditor':
      return <RegistryEditorApp />
    case 'scandisk':
      return <ScanDiskApp {...props} />
    case 'defrag':
      return <DefragApp {...props} />
    case 'calculator':
      return <CalculatorApp />
    case 'minesweeper':
      return <MinesweeperApp />
    case 'dosGame':
      return <JsDosGameApp {...props} />
    case 'antivirus':
      return <AntivirusApp {...props} />
    case 'setupSafety':
      return <SetupSafetyApp {...props} />
    case 'credits':
      return <CreditsApp />
    case 'help':
      return <HelpApp />
    case 'happy99':
      return <Happy99App {...props} />
    case 'bonzi':
      return <BonziBuddyApp {...props} />
    case 'cascade':
      return <CascadeApp {...props} />
    case 'netbus':
      return <NetBusApp {...props} />
    default:
      return null
  }
}

export function AppWindowContent({ windowState }: AppWindowContentProps) {
  return (
    <Suspense fallback={<div className="window-loading-placeholder">Loading...</div>}>
      {appWindowBody(windowState)}
    </Suspense>
  )
}
