import './NetworkApp.css'
import { useEffect, useRef, useState } from 'react'
import { win98Icons } from '../../data/icons'
import { useOs } from '../../os/useOs'

const CONNECT_STAGES = [
  'Initializing PCI Fast Ethernet DEC 21140...',
  'Negotiating link speed... 100 Mbps full duplex',
  'Requesting IP address from DHCP server...',
  'Verifying gateway 192.168.98.1...',
  'Registering Web Archive gateway...',
]

export function NetworkApp() {
  const { state, networkOps, showMessageBox } = useOs()
  const { network } = state
  const [manualIp, setManualIp] = useState(network.ipAddress)
  const [connectStage, setConnectStage] = useState<number | null>(null)
  const timersRef = useRef<number[]>([])

  useEffect(() => {
    const timers = timersRef.current
    return () => timers.forEach((timer) => window.clearTimeout(timer))
  }, [])

  function beginConnect() {
    if (connectStage !== null) return
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

  function applyStaticIp() {
    if (!/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(manualIp.trim())) {
      showMessageBox({
        title: 'Network',
        message: `'${manualIp}' is not a valid IP address. Use dotted-quad notation, e.g. 192.168.98.42.`,
        icon: 'error',
        buttons: ['ok'],
      })
      return
    }
    networkOps.applyConfig({ connected: true, dhcp: false, ipAddress: manualIp.trim() })
  }

  const connecting = connectStage !== null

  return (
    <div className="app-content network-app">
      <ul className="os-menu-bar" role="menubar">
        <li>File</li>
        <li>Edit</li>
        <li>View</li>
        <li>Help</li>
      </ul>
      <div className="identity-row">
        <img src={win98Icons.network} alt="" />
        <div>
          <h2>{connecting ? 'Connecting...' : network.connected ? 'Connected' : 'Network cable unplugged'}</h2>
          <p>{network.adapterName}</p>
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
      <fieldset>
        <legend>TCP/IP Properties</legend>
        <div className="property-grid">
          <div>
            <span>Connection</span>
            <strong>{network.connected ? 'Link established' : 'Media disconnected'}</strong>
          </div>
          <div>
            <span>DHCP Enabled</span>
            <strong>{network.dhcp ? 'Yes' : 'No'}</strong>
          </div>
          <div>
            <span>IP Address</span>
            <strong>{network.ipAddress}</strong>
          </div>
          <div>
            <span>Subnet Mask</span>
            <strong>{network.subnetMask}</strong>
          </div>
          <div>
            <span>Gateway</span>
            <strong>{network.gateway || '(none)'}</strong>
          </div>
          <div>
            <span>DNS</span>
            <strong>{network.dns || '(none)'}</strong>
          </div>
          <div>
            <span>Physical Address</span>
            <strong>{network.macAddress}</strong>
          </div>
        </div>
      </fieldset>
      <div className="sunken-panel network-meter">
        <div>
          <span>Packets sent</span>
          <strong>{network.packetsSent}</strong>
        </div>
        <div>
          <span>Packets received</span>
          <strong>{network.packetsReceived}</strong>
        </div>
        <div>
          <span>Connected since</span>
          <strong>{network.connectedSince ?? 'Not connected'}</strong>
        </div>
      </div>
      <div className="toolbar">
        <button
          type="button"
          disabled={connecting}
          onClick={() => (network.connected ? networkOps.disconnect() : beginConnect())}
        >
          {network.connected ? 'Disconnect' : connecting ? 'Connecting...' : 'Connect'}
        </button>
        <button type="button" disabled={connecting || !network.connected} onClick={() => networkOps.renewDhcp()}>
          Renew DHCP
        </button>
        <input aria-label="Static IP address" value={manualIp} onChange={(event) => setManualIp(event.target.value)} />
        <button type="button" disabled={connecting} onClick={applyStaticIp}>
          Use Static IP
        </button>
      </div>
    </div>
  )
}
