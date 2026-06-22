import { useEffect, useState } from 'react'
import { win98Icons } from '../../data/icons'
import { osCreditName, osCreditYear, osProductName, shutdownLines } from '../../data/system'
import { useOs } from '../../os/useOs'

export function ShutdownScreen() {
  const { restart, playSound } = useOs()
  const [stage, setStage] = useState<'wait' | 'crt' | 'safe'>('wait')

  useEffect(() => {
    playSound('shutdown')
    const crtTimer = window.setTimeout(() => setStage('crt'), 2400)
    const safeTimer = window.setTimeout(() => setStage('safe'), 2950)
    return () => {
      window.clearTimeout(crtTimer)
      window.clearTimeout(safeTimer)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (stage === 'wait') {
    return (
      <main className="shutdown-screen shutdown-wait">
        <div className="shutdown-wait-card">
          <img src={win98Icons.windows} alt="" />
          <h1>{osProductName}</h1>
          <p className="shutdown-dots">Windows is shutting down</p>
        </div>
      </main>
    )
  }

  if (stage === 'crt') {
    return (
      <main className="shutdown-screen">
        <div className="crt-off" aria-hidden="true" />
      </main>
    )
  }

  return (
    <main className="shutdown-screen shutdown-safe">
      <div className="shutdown-safe-copy">
        {shutdownLines.map((line) => (
          <p key={line}>{line}</p>
        ))}
        <p className="shutdown-credit">
          {osCreditName} - {osCreditYear}
        </p>
        <button type="button" onClick={() => restart('normal')}>
          Turn on again
        </button>
      </div>
    </main>
  )
}
