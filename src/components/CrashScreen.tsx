import type { SystemCrashState } from '../types'

type CrashScreenProps = {
  crash: SystemCrashState
  onRestart: () => void
}

export function CrashScreen({ crash, onRestart }: CrashScreenProps) {
  return (
    <main className="crash-screen" role="alert" aria-label="Windows protection error">
      <div className="crash-panel">
        <p className="crash-title">{crash.title}</p>
        <p>{crash.message}</p>
        <p>{crash.detail}</p>
        <p>
          File affected: <strong>{crash.path}</strong>
        </p>
        <p>
          STOP: <strong>{crash.stopCode}</strong>
        </p>
        <p className="crash-muted">A fatal exception occurred at {crash.crashedAt}. The current application will be terminated.</p>
        <div className="crash-actions">
          <button type="button" onClick={onRestart}>
            Restart with last known good configuration
          </button>
        </div>
      </div>
    </main>
  )
}
