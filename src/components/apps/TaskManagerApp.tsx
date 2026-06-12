import { win98Icons } from '../../data/icons'
import type { NetworkStatus, WindowState } from '../../types'

type TaskManagerAppProps = {
  windows: WindowState[]
  network: NetworkStatus
}

export function TaskManagerApp({ windows, network }: TaskManagerAppProps) {
  return (
    <div className="app-content task-manager-app">
      <table className="interactive task-table">
        <thead>
          <tr>
            <th>Task</th>
            <th>Status</th>
            <th>Memory</th>
          </tr>
        </thead>
        <tbody>
          {windows.map((windowState) => (
            <tr key={windowState.instanceId}>
              <td>
                <img src={win98Icons[windowState.icon]} alt="" />
                {windowState.title}
              </td>
              <td>{windowState.minimized ? 'Minimized' : 'Running'}</td>
              <td>{Math.max(2, windowState.title.length)} MB</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="status-bar">
        <p className="status-bar-field">CPU Usage: {windows.length * 3}%</p>
        <p className="status-bar-field">Network: {network.connected ? 'Online' : 'Offline'}</p>
      </div>
    </div>
  )
}
