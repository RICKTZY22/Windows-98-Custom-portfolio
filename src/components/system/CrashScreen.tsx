import { useCallback, useEffect, useState } from 'react'
import type { CrashState } from '../../types'
import { useOs } from '../../os/useOs'

type CrashScreenProps = {
  crash: CrashState
  onRestart: () => void
}

const MIN_CRASH_DISPLAY_MS = 3800

function exceptionFromStopCode(stopCode: string): { code: string; address: string } {
  const match = stopCode.match(/([0-9a-f]{2})\s*:\s*([0-9a-f]{4})\s*:\s*([0-9a-f]{8})/i)
  if (!match) return { code: '0E', address: '0028:C0011E36' }
  return { code: match[1].toUpperCase(), address: `${match[2].toUpperCase()}:${match[3].toUpperCase()}` }
}

export function CrashScreen({ crash, onRestart }: CrashScreenProps) {
  const { playSound } = useOs()
  const [canContinue, setCanContinue] = useState(false)
  const exception = exceptionFromStopCode(crash.stopCode)

  const continueIfReady = useCallback(() => {
    if (canContinue) {
      onRestart()
    }
  }, [canContinue, onRestart])

  useEffect(() => {
    const timer = window.setTimeout(() => setCanContinue(true), MIN_CRASH_DISPLAY_MS)
    return () => window.clearTimeout(timer)
  }, [crash.crashedAt])

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      event.preventDefault()
      continueIfReady()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [continueIfReady])

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
    <main className="crash-screen" role="alert" aria-label="Windows fatal exception screen" onClick={continueIfReady}>
      <p className="crash-title">Windows</p>

      <div className="crash-panel">
        <p>
          A fatal exception {exception.code} has occurred at {exception.address} in VXD VMM(01) + 00010E36. The current
          application will be terminated.
        </p>

        <p className="crash-bullet">Press any key to terminate the current application.</p>
        <p className="crash-bullet">
          Press CTRL+ALT+DEL again to restart your computer. You will lose any unsaved information in all applications.
        </p>

        <p className="crash-detail">{crash.message}</p>
        <p className="crash-detail">{crash.detail}</p>
        <p className="crash-detail">Reference: {crash.title} at {crash.crashedAt}</p>
      </div>

      <p className="crash-continue">
        {canContinue ? 'Press any key to continue' : 'System halted. Please wait...'} <span aria-hidden="true" />
      </p>
    </main>
  )
}
