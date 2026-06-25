import './RunDialogApp.css'
import type { AppProps } from '../../types'
import { win98Icons } from '../../data/icons'
import { useOs } from '../../os/useOs'

// Run is intentionally disabled / work-in-progress: the old version was just a thin
// shortcut that forwarded to the MS-DOS Prompt. A proper Run / shell is planned.
export function RunDialogApp({ windowId }: AppProps) {
  const { closeWindow } = useOs()

  return (
    <div className="run-dialog-app">
      <div className="identity-row">
        <img src={win98Icons.run} alt="" />
        <p>
          Run is under construction. A redesigned Run / shell is coming in a future update. For
          now, open the <strong>MS-DOS Prompt</strong> from Start &gt; Programs to run commands.
        </p>
      </div>
      <div className="field-row">
        <label htmlFor="run-command">Open:</label>
        <input id="run-command" disabled placeholder="(work in progress)" />
      </div>
      <div className="button-row run-buttons">
        <button type="button" className="default" disabled>
          OK
        </button>
        <button type="button" onClick={() => closeWindow(windowId)}>
          Cancel
        </button>
      </div>
    </div>
  )
}
