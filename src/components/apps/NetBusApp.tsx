import './NetBusApp.css'
import { useEffect, useState } from 'react'
import type { AppProps } from '../../types'
import { useOs } from '../../os/useOs'

export function NetBusApp({ windowId }: AppProps) {
  const { playSound, setWindowTitle, showMessageBox } = useOs()
  const [cdOpen, setCdOpen] = useState(false)
  const [inverted, setInverted] = useState(false)
  const [customMsg, setCustomMsg] = useState('Greetings from cyberspace!')
  const [log, setLog] = useState<string[]>([
    'NetBus 1.70 Server Engine initialized.',
    'Listening on TCP port 12345...',
    'Incoming connection from 127.0.0.1 accepted.',
    'Ready for commands.',
  ])

  useEffect(() => {
    setWindowTitle(windowId, 'NetBus 1.70 - Remote Administrator')
  }, [setWindowTitle, windowId])

  function addLog(entry: string) {
    setLog((prev) => [...prev.slice(-8), `[${new Date().toLocaleTimeString()}] ${entry}`])
  }

  function handleCdToggle() {
    playSound('error')
    setCdOpen((prev) => {
      const next = !prev
      addLog(`Command: CD-ROM Door (E:) set to ${next ? 'OPEN' : 'CLOSED'}`)
      return next
    })
  }

  function handleInvertScreen() {
    playSound('error')
    addLog('Command: Invert Desktop Screen (180 deg) applied.')
    setInverted(true)

    // Apply temporary transform to root
    const root = document.getElementById('root')
    if (root) {
      root.style.transform = 'rotate(180deg)'
      root.style.transition = 'transform 0.4s ease'
    }

    window.setTimeout(() => {
      if (root) {
        root.style.transform = 'none'
      }
      setInverted(false)
      addLog('Command: Screen orientation restored.')
    }, 4500)
  }

  function handlePlaySound() {
    playSound('error')
    addLog('Command: Beep tone sent to sound card.')
  }

  function handlePopup() {
    playSound('error')
    addLog(`Command: Pop-up message dispatched: "${customMsg}"`)
    // In-app 98.css dialog rather than a modern browser alert, so the popup
    // reads as an authentic Windows message box from the era.
    showMessageBox({
      title: 'Message from System Administrator',
      message: customMsg,
      detail: 'This message was sent by a NetBus 1.70 remote session (simulated).',
      icon: 'warning',
      buttons: ['ok'],
    })
  }

  return (
    <div className="netbus-app">
      <div className="netbus-header">
        <div className="netbus-ip-bar">
          <label>Host Name / IP:</label>
          <input type="text" readOnly value="127.0.0.1 : 12345" className="netbus-input" />
          <span className="netbus-badge">Connected</span>
        </div>
      </div>

      <div className="netbus-grid">
        <div className="netbus-panel">
          <fieldset>
            <legend>Hardware Pranks</legend>
            <button type="button" onClick={handleCdToggle}>
              {cdOpen ? 'Close CD-ROM Tray (E:)' : 'Open CD-ROM Tray (E:)'}
            </button>
            <button type="button" onClick={handleInvertScreen} disabled={inverted}>
              {inverted ? 'Reverting in 4s...' : 'Invert Screen 180°'}
            </button>
            <button type="button" onClick={handlePlaySound}>
              Play Loud Beep
            </button>
          </fieldset>

          <fieldset>
            <legend>Message Sender</legend>
            <input
              type="text"
              value={customMsg}
              onChange={(e) => setCustomMsg(e.target.value)}
              className="netbus-msg-input"
            />
            <button type="button" onClick={handlePopup}>
              Send Pop-up Dialog
            </button>
          </fieldset>
        </div>

        <div className="netbus-console-panel">
          <div className="netbus-console-title">Activity Log:</div>
          <div className="netbus-console" aria-live="polite">
            {log.map((line, idx) => (
              <div key={idx}>{line}</div>
            ))}
          </div>
          {cdOpen && (
            <div className="netbus-cd-alert">
              💿 CD-ROM TRAY (DRIVE E:) IS CURRENTLY EJECTED
            </div>
          )}
        </div>
      </div>

      <div className="netbus-footer">
        <span>Historical Simulation: NetBus 1.70 (1998 Remote Tool by Carl-Fredrik Neikter)</span>
      </div>
    </div>
  )
}
