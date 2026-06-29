// Windows 98 Portfolio Edition (c) 2026 John Erick Mendoza (github.com/RICKTZY22) - MIT, attribution required. origin-fingerprint: JEM-W98P-ORIGIN-7f3a9c1e2b5d
import { Suspense, lazy } from 'react'
import { useOs } from './os/useOs'
import { Desktop } from './components/shell/Desktop'
import { BiosSetupScreen } from './components/system/BiosSetupScreen'
import { BootMenu } from './components/system/BootMenu'
import { BootScreen } from './components/system/BootScreen'
import { CrashScreen } from './components/system/CrashScreen'
import { LoadFailureScreen } from './components/system/LoadFailureScreen'
import { RecoveryConsole } from './components/system/RecoveryConsole'
import { SafetyTrainingScreen } from './components/system/SafetyTrainingScreen'
import { ShutdownScreen } from './components/system/ShutdownScreen'
import { StartupScanScreen } from './components/system/StartupScanScreen'

const TerminalApp = lazy(() => import('./components/apps/TerminalApp').then((m) => ({ default: m.TerminalApp })))

function App() {
  const { state, restart } = useOs()

  switch (state.phase) {
    case 'boot':
      return <BootScreen />
    case 'biosSetup':
      return <BiosSetupScreen />
    case 'bootMenu':
      return <BootMenu />
    case 'desktop':
      return <Desktop />
    case 'dosOnly':
      return (
        <main className="dos-only-screen">
          <Suspense fallback={<div className="window-loading-placeholder">Loading...</div>}>
            <TerminalApp windowId="dos-only" payload={{ path: 'C:\\' }} />
          </Suspense>
        </main>
      )
    case 'recovery':
      return <RecoveryConsole />
    case 'crashed':
      return (
        <CrashScreen
          crash={
            state.crash ?? {
              title: 'Windows protection error',
              message: 'Windows could not continue.',
              detail: 'A simulated fatal exception occurred.',
              stopCode: '0E : 0028 : C0011E36',
              crashedAt: new Date().toLocaleString(),
            }
          }
          onRestart={() => restart('normal', { bootProfile: 'warm' })}
        />
      )
    case 'loadFailed':
      return <LoadFailureScreen />
    case 'safetyTraining':
      return <SafetyTrainingScreen />
    case 'startupScan':
      return <StartupScanScreen />
    case 'shutdown':
      return <ShutdownScreen />
    default:
      return <Desktop />
  }
}

export default App
