import './NetworkApp.css'
import { useEffect, useRef, useState } from 'react'
import { win98Icons } from '../../data/icons'
import { useOs } from '../../os/useOs'
import { driverFailureBox, driverHealthy, missingDriverFiles } from '../../os/systemHealth'

const CONNECT_STAGES = [
  'Initializing PCI Fast Ethernet DEC 21140...',
  'Negotiating link speed... 100 Mbps full duplex',
  'Requesting IP address from DHCP server...',
  'Verifying gateway 192.168.98.1...',
  'Registering Web Archive gateway...',
]

const NETWORK_PLACES = [
  { id: 'entireNetwork', label: 'Entire Network', icon: 'world' as const },
  { id: 'ast', label: 'Ast', icon: 'computer' as const },
  { id: 'paul', label: 'Paul', icon: 'computer' as const },
  { id: 'sony', label: 'Sony', icon: 'computer' as const },
]

export function NetworkApp() {
  const { state, networkOps, showMessageBox } = useOs()
  const { network } = state
  const networkDriverReady = driverHealthy(state.fs, 'network')
  const [connectStage, setConnectStage] = useState<number | null>(null)
  const [selected, setSelected] = useState(NETWORK_PLACES[0].id)
  const timersRef = useRef<number[]>([])

  useEffect(() => {
    const timers = timersRef.current
    return () => timers.forEach((timer) => window.clearTimeout(timer))
  }, [])

  function beginConnect() {
    if (connectStage !== null) return
    if (!networkDriverReady) {
      showMessageBox(driverFailureBox('network', 'Network Neighborhood', missingDriverFiles(state.fs, 'network')))
      return
    }
    setConnectStage(0)
    CONNECT_STAGES.forEach((_, stage) => {
      timersRef.current.push(
        window.setTimeout(() => setConnectStage(stage), stage * 550),
      )
    })
    timersRef.current.push(
      window.setTimeout(() => {
        networkOps.connect()
        setConnectStage(null)
      }, CONNECT_STAGES.length * 550 + 250),
    )
  }

  function openNetworkItem(id: string) {
    if (!networkDriverReady) {
      showMessageBox(driverFailureBox('network', 'Network Neighborhood', missingDriverFiles(state.fs, 'network')))
      return
    }
    if (id === 'entireNetwork') {
      if (!network.connected) {
        beginConnect()
        return
      }
      showMessageBox({
        title: 'Entire Network',
        message: 'The simulated workgroup is available.',
        detail: 'AST, PAUL, and SONY are sample browser-only hosts for awareness and portfolio navigation.',
        icon: 'info',
        buttons: ['ok'],
      })
      return
    }
    if (!network.connected) {
      showMessageBox({
        title: 'Network Neighborhood',
        message: `Cannot browse ${id.toUpperCase()} because the simulated network is disconnected.`,
        detail: 'Open Entire Network first to connect the simulated adapter.',
        icon: 'warning',
        buttons: ['ok'],
      })
      return
    }
    showMessageBox({
      title: id.toUpperCase(),
      message: `Connected to \\\\${id.toUpperCase()} in the simulated workgroup.`,
      detail: 'No real network connection is made. This is a safe portfolio-only Network Neighborhood mockup.',
      icon: 'info',
      buttons: ['ok'],
    })
  }

  const connecting = connectStage !== null

  return (
    <div className="app-content network-app">
      <ul className="os-menu-bar" role="menubar">
        <li>File</li>
        <li>Edit</li>
        <li>View</li>
        <li>Go</li>
        <li>Favorites</li>
        <li>Help</li>
      </ul>
      <div className="network-explorer-toolbar">
        <button type="button" disabled>
          <span aria-hidden="true">‹</span>
          Back
        </button>
        <button type="button" disabled>
          <span aria-hidden="true">›</span>
          Forward
        </button>
        <button type="button" disabled>
          <span aria-hidden="true">↥</span>
          Up
        </button>
        <span className="network-toolbar-separator" aria-hidden="true" />
        <button type="button" disabled>
          <span aria-hidden="true">✂</span>
          Cut
        </button>
        <button type="button" disabled>
          <span aria-hidden="true">▣</span>
          Copy
        </button>
        <button type="button" disabled>
          <span aria-hidden="true">▤</span>
          Paste
        </button>
        <button type="button" disabled>
          <span aria-hidden="true">↶</span>
          Undo
        </button>
        <button
          type="button"
          className="network-connect-button"
          disabled={connecting || (!networkDriverReady && !network.connected)}
          onClick={() => (network.connected ? networkOps.disconnect() : beginConnect())}
        >
          {network.connected ? 'Disconnect' : connecting ? 'Connecting...' : 'Connect'}
        </button>
      </div>
      <div className="network-address-row">
        <label htmlFor="network-address">Address</label>
        <div className="sunken-panel network-address-box">
          <img src={win98Icons.network} alt="" />
          <input id="network-address" value="Network Neighborhood" readOnly />
          <button type="button" aria-label="Address history">▾</button>
        </div>
      </div>
      {connecting && (
        <div className="sunken-panel network-connecting">
          <div className="network-connecting-anim" aria-hidden="true">
            <img src={win98Icons.computer} alt="" />
            <span className="network-dot" />
            <span className="network-dot" />
            <span className="network-dot" />
            <img src={win98Icons.world} alt="" />
          </div>
          <p>{CONNECT_STAGES[connectStage ?? 0]}</p>
        </div>
      )}
      <div className="sunken-panel network-icon-view">
        {NETWORK_PLACES.map((place) => (
          <button
            key={place.id}
            type="button"
            className={`network-place ${selected === place.id ? 'selected' : ''}`}
            onClick={() => setSelected(place.id)}
            onDoubleClick={() => openNetworkItem(place.id)}
          >
            <img src={win98Icons[place.icon]} alt="" />
            <span>{place.label}</span>
          </button>
        ))}
      </div>
      <div className="status-bar network-status-bar">
        <p className="status-bar-field">{NETWORK_PLACES.length} object(s)</p>
        <p className="status-bar-field">
          {networkDriverReady ? (network.connected ? `Connected: ${network.ipAddress}` : 'Media disconnected') : 'Driver missing'}
        </p>
        <p className="status-bar-field">{network.connectedSince ?? network.adapterName}</p>
      </div>
    </div>
  )
}
