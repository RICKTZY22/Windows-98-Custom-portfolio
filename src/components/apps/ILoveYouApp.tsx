import './ILoveYouApp.css'
import { useEffect } from 'react'
import type { AppProps } from '../../types'
import { useOs } from '../../os/useOs'

// The ILOVEYOU worm simulation. The seeded LOVE-LETTER-FOR-YOU.TXT.vbs opens this
// instead of Notepad. It stages the historical double-extension trap, then lets
// the visitor deliberately "run" the script. Running it calls runWorm(), which
// overwrites the virtual disk and flips the infected flag. Nothing real is
// touched, and a BIOS factory reset fully restores the simulated PC.

export function ILoveYouApp({ windowId }: AppProps) {
  const { state, setWindowTitle, runWorm, showMessageBox } = useOs()
  const infected = state.infected

  useEffect(() => {
    setWindowTitle(windowId, 'LOVE-LETTER-FOR-YOU.TXT.vbs')
  }, [setWindowTitle, windowId])

  function confirmRun() {
    showMessageBox({
      title: 'Windows Script Host',
      message: 'Run LOVE-LETTER-FOR-YOU.TXT.vbs?',
      detail:
        'This looks like a text file but is actually a script. In this simulation, running it overwrites the virtual disk and disables features until you restore the PC from BIOS Setup. Your real computer is never touched.',
      icon: 'warning',
      buttons: ['yes', 'no'],
      onResult: (button) => {
        if (button === 'yes') runWorm()
      },
    })
  }

  if (infected) {
    return (
      <div className="iloveyou-app is-infected">
        <div className="iloveyou-header">
          <span className="iloveyou-heart">&lt;3</span>
          <h2>I LOVE YOU</h2>
        </div>
        <p className="iloveyou-lead">The simulated disk has been overwritten.</p>
        <p>
          Every file now contains a copy of the worm, and the shell shows the worm name in place of
          your programs. This is exactly how the real ILOVEYOU spread in May 2000.
        </p>
        <div className="iloveyou-cure">
          <strong>To restore the simulated PC:</strong>
          <ol>
            <li>Open Start and choose Shut Down, then Restart.</li>
            <li>At the first screen, press the key for BIOS Setup (shown as F2 / Del).</li>
            <li>Choose <em>Restore System (Factory Reset)</em> and confirm.</li>
          </ol>
        </div>
        <p className="iloveyou-note">
          Simulation only. Nothing on your real machine was read, changed, or sent.
        </p>
      </div>
    )
  }

  return (
    <div className="iloveyou-app">
      <div className="iloveyou-header">
        <span className="iloveyou-heart">&lt;3</span>
        <h2>ILOVEYOU</h2>
      </div>
      <p className="iloveyou-lead">kindly check the attached LOVELETTER coming from me.</p>

      <div className="iloveyou-trap">
        <div className="iloveyou-trap-title">Why this was so dangerous</div>
        <p>
          The attachment looked like <code>LOVE-LETTER-FOR-YOU.TXT</code>, a harmless text file,
          because Windows 98 hid the real <code>.vbs</code> extension by default. Double-clicking it
          ran a script instead of opening a document.
        </p>
        <p>
          The real worm overwrote documents, pictures and scripts with copies of itself, changed the
          browser home page, and emailed itself to every Outlook contact. Millions of PCs in hours.
        </p>
      </div>

      <button type="button" className="iloveyou-run" onClick={confirmRun}>
        Run this file (simulate the infection)
      </button>

      <p className="iloveyou-note">
        Safe simulation. Running it only rewrites the virtual disk in this tab and can be fully
        undone from BIOS Setup. Your real files, accounts and network are never touched.
      </p>
    </div>
  )
}
