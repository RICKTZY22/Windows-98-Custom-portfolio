import { useEffect } from 'react'
import type { CrashState } from '../types'
import { useOs } from '../os/useOs'

type CrashScreenProps = {
  crash: CrashState
  onRestart: () => void
}

export function CrashScreen({ crash, onRestart }: CrashScreenProps) {
  const { playSound } = useOs()

  useEffect(() => {
    function handleKeyDown() {
      onRestart()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onRestart])

  useEffect(() => {
    // Classic PC-speaker style panic beeps: three harsh error tones.
    playSound('error')
    const timers = [
      window.setTimeout(() => playSound('error'), 420),
      window.setTimeout(() => playSound('warn'), 840),
    ]
    return () => timers.forEach((timer) => window.clearTimeout(timer))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <main className="crash-screen" role="alert" aria-label="Windows protection error">
      <div className="crash-panel">
        <p className="crash-title">{crash.title}</p>
        <p>{crash.message}</p>
        <p>{crash.detail}</p>
        <p>
          STOP: <strong>{crash.stopCode}</strong>
        </p>
        <p className="crash-muted">
          A fatal exception occurred at {crash.crashedAt}. The current application will be terminated.
        </p>
        <p className="crash-muted">Press any key to restart, or use the button below.</p>
        <div className="crash-actions">
          <button type="button" onClick={onRestart}>
            Restart to Startup Menu
          </button>
        </div>
      </div>
    </main>
  )
}
