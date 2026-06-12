import { win98Icons } from '../../data/icons'
import type { NetworkStatus, WindowState } from '../../types'

type SystemPropertiesAppProps = {
  windows: WindowState[]
  network: NetworkStatus
}

export function SystemPropertiesApp({ windows, network }: SystemPropertiesAppProps) {
  return (
    <div className="app-content system-app">
      <div className="identity-row">
        <img src={win98Icons.gears} alt="" />
        <div>
          <h2>Windows 98 Portfolio Edition</h2>
          <p>Registered to Erick</p>
        </div>
      </div>
      <menu role="tablist">
        <li role="tab" aria-selected="true">
          <a>General</a>
        </li>
        <li role="tab">
          <a>Performance</a>
        </li>
      </menu>
      <div className="window system-panel" role="tabpanel">
        <div className="property-grid">
          <div>
            <span>Computer</span>
            <strong>Genuine Browser PC</strong>
          </div>
          <div>
            <span>Memory</span>
            <strong>64 MB simulated RAM</strong>
          </div>
          <div>
            <span>Open windows</span>
            <strong>{windows.length}</strong>
          </div>
          <div>
            <span>Network</span>
            <strong>{network.connected ? 'Connected' : 'Offline'}</strong>
          </div>
          <div>
            <span>Graphics</span>
            <strong>CSS transform acceleration hints enabled</strong>
          </div>
        </div>
      </div>
    </div>
  )
}
