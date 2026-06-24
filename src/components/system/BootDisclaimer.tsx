import './BootDisclaimer.css'
import { useState } from 'react'
import { osCreditName, osCreditYear, osProductName } from '../../data/system'

/**
 * Copyright / non-affiliation disclaimer shown on every boot.
 *
 * State lives locally and starts open, so the dialog appears each time the
 * Desktop mounts (i.e. every cold or warm boot) and nothing is persisted —
 * exactly the "every boot" behavior requested. It must make clear that this is
 * an original fan tribute, unaffiliated with Microsoft, to avoid trademark
 * confusion.
 */
export function BootDisclaimer() {
  const [open, setOpen] = useState(true)
  if (!open) return null

  return (
    <div
      className="disclaimer-layer"
      role="presentation"
      onPointerDown={(event) => event.stopPropagation()}
    >
      <section
        className="window disclaimer-dialog"
        role="alertdialog"
        aria-modal="true"
        aria-label="Disclaimer"
      >
        <div className="title-bar">
          <div className="title-bar-text">Disclaimer &mdash; {osProductName}</div>
        </div>
        <div className="window-body disclaimer-body">
          <div className="disclaimer-copy">
            <span className="disclaimer-icon" aria-hidden="true">
              i
            </span>
            <div>
              <p>
                <strong>This is a fan-made tribute &mdash; not a Microsoft product.</strong>
              </p>
              <p>
                {osProductName} is an original web application built with React and 98.css. It is
                not affiliated with, endorsed by, sponsored by, or connected to Microsoft
                Corporation in any way. &ldquo;Microsoft&rdquo;, &ldquo;Windows&rdquo;, and
                &ldquo;Windows&nbsp;98&rdquo; are trademarks of Microsoft Corporation, referenced
                here purely for nostalgic, educational, and portfolio purposes under fair use.
              </p>
              <p>
                No real operating system is installed or running. Nothing in this app can read,
                modify, download, or harm your computer, files, or network &mdash; everything is
                simulated entirely inside your browser.
              </p>
              <p className="disclaimer-credit">
                An original creation by {osCreditName} &middot; {osCreditYear}
              </p>
            </div>
          </div>
          <div className="button-row run-buttons disclaimer-actions">
            <button type="button" className="default" onClick={() => setOpen(false)} autoFocus>
              I Understand
            </button>
          </div>
        </div>
      </section>
    </div>
  )
}
