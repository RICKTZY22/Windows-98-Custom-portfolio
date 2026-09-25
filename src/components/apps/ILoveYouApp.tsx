import './ILoveYouApp.css'
import { useEffect } from 'react'
import type { AppProps } from '../../types'
import { useOs } from '../../os/useOs'

export function ILoveYouApp({ windowId }: AppProps) {
  const { state, setWindowTitle, runWorm } = useOs()
  const infected = state.infected

  useEffect(() => {
    setWindowTitle(windowId, 'LOVE-LETTER-FOR-YOU.TXT.vbs')
    if (!infected) {
      runWorm()
    }
  }, [setWindowTitle, windowId, infected, runWorm])

  return (
    <div className="iloveyou-app is-infected">
      <div className="iloveyou-header">
        <span className="iloveyou-heart">&lt;3</span>
        <h2>I LOVE YOU</h2>
      </div>
      <p className="iloveyou-lead">System Infected with LOVELETTER Worm.</p>
      <p className="iloveyou-desc">
        Every file on the drive has been overwritten by LOVE-LETTER-FOR-YOU.TXT.vbs. Outlook contacts have been sent copies of the worm.
      </p>
      <div className="iloveyou-cure">
        <strong>To restore system:</strong>
        <ol>
          <li>Open Start and choose Shut Down, then Restart.</li>
          <li>At boot, press the key for BIOS Setup (F2 / Del).</li>
          <li>Choose <em>Restore System (Factory Reset)</em> and confirm.</li>
        </ol>
      </div>
    </div>
  )
}


