import { win98Icons } from '../../data/icons'
import type { NetworkStatus } from '../../types'

type NetworkAppProps = {
  network: NetworkStatus
  setNetwork: (updater: (current: NetworkStatus) => NetworkStatus) => void
}

export function NetworkApp({ network, setNetwork }: NetworkAppProps) {
  function toggleConnection() {
    setNetwork((current) => ({
      ...current,
      connected: !current.connected,
      packetsSent: current.packetsSent + 1,
    }))
  }

  function testPing() {
    setNetwork((current) => ({
      ...current,
      connected: true,
      packetsSent: current.packetsSent + 4,
      packetsReceived: current.packetsReceived + 4,
      lastPing: 'portfolio.local',
    }))
  }

  return (
    <div className="app-content network-app">
      <div className="identity-row">
        <img src={win98Icons.network} alt="" />
        <div>
          <h2>{network.connected ? 'Connected' : 'Disconnected'}</h2>
          <p>{network.adapterName}</p>
        </div>
      </div>
      <fieldset>
        <legend>TCP/IP</legend>
        <div className="property-grid">
          <div>
            <span>IP Address</span>
            <strong>{network.connected ? network.ipAddress : '0.0.0.0'}</strong>
          </div>
          <div>
            <span>Subnet Mask</span>
            <strong>{network.subnetMask}</strong>
          </div>
          <div>
            <span>Gateway</span>
            <strong>{network.gateway}</strong>
          </div>
          <div>
            <span>DNS</span>
            <strong>{network.dns}</strong>
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
          <span>Last ping</span>
          <strong>{network.lastPing ?? 'None'}</strong>
        </div>
      </div>
      <div className="button-row">
        <button type="button" onClick={toggleConnection}>
          {network.connected ? 'Disconnect' : 'Connect'}
        </button>
        <button type="button" onClick={testPing}>
          Ping
        </button>
      </div>
    </div>
  )
}
