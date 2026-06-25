import './BootDisclaimer.css'
import { useState } from 'react'
import { win98Icons } from '../../data/icons'
import { osCreditName, osCreditYear, osProductName } from '../../data/system'

/**
 * Copyright / non-affiliation disclaimer shown on every boot.
 *
 * State lives locally and starts open, so the dialog appears each time the
 * Desktop mounts (i.e. every cold or warm boot) and nothing is persisted —
 * exactly the "every boot" behavior requested. It must make clear that this is
 * an original fan tribute, unaffiliated with Microsoft, to avoid trademark
 * confusion. The Microsoft and Windows marks are shown nominatively, alongside
 * a "Not affiliated" stamp, purely so the disclaimer is unmistakable.
 */

// The four-square Microsoft logo, drawn inline so no external trademarked asset
// is bundled. Shown only to make the non-affiliation notice clear (fair use).
function MicrosoftLogo() {
  return (
    <span className="brand-mark brand-microsoft">
      <svg viewBox="0 0 23 23" width="22" height="22" aria-hidden="true" focusable="false">
        <rect x="1" y="1" width="10" height="10" fill="#f25022" />
        <rect x="12" y="1" width="10" height="10" fill="#7fba00" />
        <rect x="1" y="12" width="10" height="10" fill="#00a4ef" />
        <rect x="12" y="12" width="10" height="10" fill="#ffb900" />
      </svg>
      <span className="brand-word">Microsoft</span>
    </span>
  )
}

function WindowsLogo() {
  return (
    <span className="brand-mark brand-windows">
      <img src={win98Icons.windows} alt="" aria-hidden="true" />
      <span className="brand-word">
        Windows<sup>98</sup>
      </span>
    </span>
  )
}

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
          <div className="title-bar-text">Notice: Please read before continuing</div>
        </div>
        <div className="window-body disclaimer-body">
          <div
            className="disclaimer-brands"
            role="img"
            aria-label="Microsoft and Windows logos, marked Not Affiliated"
          >
            <MicrosoftLogo />
            <WindowsLogo />
            <span className="disclaimer-stamp" aria-hidden="true">
              Not Affiliated
            </span>
          </div>

          <div className="disclaimer-copy">
            <span className="disclaimer-icon" aria-hidden="true">
              i
            </span>
            <div>
              <p>
                <strong>This is a fan-made tribute, not a Microsoft product.</strong>
              </p>
              <p>
                {osProductName} is an original, independently built web application. It recreates
                the look and feel of the late-1990s desktop, coded from scratch with React and the
                98.css stylesheet. It is a personal portfolio piece and learning exercise, not a
                copy, emulator, or redistribution of any Microsoft software.
              </p>
              <p>
                &ldquo;Microsoft&rdquo;, &ldquo;Windows&rdquo;, &ldquo;Windows&nbsp;98&rdquo;, the
                Windows flag, the Microsoft logo, and related names and imagery are trademarks and
                the property of Microsoft Corporation. They appear here only for nostalgic,
                educational, commentary, and portfolio purposes (nominative fair use). This project
                is <strong>not affiliated with, endorsed by, sponsored by, certified by, or
                connected to</strong> Microsoft Corporation in any way, and no such association is
                implied.
              </p>
              <p>
                No real operating system is installed or running. Nothing in this app can read,
                modify, download, install, or harm your computer, files, accounts, or network.
                Every window, file, and setting is simulated entirely inside this browser tab and
                disappears when you close it.
              </p>
              <p>
                By continuing you acknowledge that you understand this is an unofficial tribute. If
                you represent a rights holder and have any concern, please reach out and it will be
                addressed promptly.
              </p>
              <p className="disclaimer-credit">
                An original creation by {osCreditName} &middot; {osCreditYear} &middot; built for
                fun and to showcase front-end engineering.
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
