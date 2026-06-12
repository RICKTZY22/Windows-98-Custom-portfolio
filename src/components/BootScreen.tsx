import { useEffect, useState } from 'react'
import { win98Icons } from '../data/icons'
import { bootSteps } from '../data/system'

type BootScreenProps = {
  durationMs: number
}

export function BootScreen({ durationMs }: BootScreenProps) {
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    const startedAt = Date.now()
    const interval = window.setInterval(() => {
      setElapsed(Math.min(durationMs, Date.now() - startedAt))
    }, 120)
    return () => window.clearInterval(interval)
  }, [durationMs])

  const progress = Math.min(100, Math.round((elapsed / durationMs) * 100))
  const activeStep = Math.min(bootSteps.length - 1, Math.floor((progress / 100) * bootSteps.length))

  return (
    <main className="boot-screen booting" aria-live="polite">
      <section className="boot-card window">
        <div className="title-bar">
          <div className="title-bar-text">Windows 98 Startup</div>
        </div>
        <div className="window-body boot-window-body">
          <img className="boot-logo" src={win98Icons.windows} alt="" />
          <div className="boot-heading">
            <h1>Windows 98</h1>
            <p>Portfolio Edition</p>
          </div>
          <div className="progress-indicator segmented boot-progress" aria-label={`${progress}% loaded`}>
            <span className="progress-indicator-bar" style={{ width: `${progress}%` }}></span>
          </div>
          <div className="boot-percent">{progress}%</div>
          <pre className="boot-log">
            {bootSteps.slice(0, activeStep + 1).join('\n')}
            {'\n'}
            C:\&gt;WIN
          </pre>
        </div>
      </section>
    </main>
  )
}
