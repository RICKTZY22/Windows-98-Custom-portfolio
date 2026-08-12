import './SystemLogApp.css'
import { useState } from 'react'
import { win98Icons } from '../../data/icons'
import { useOs } from '../../os/useOs'
import type { OsNotificationKind } from '../../types'

const filters: Array<'all' | OsNotificationKind> = ['all', 'system', 'warning', 'error', 'success', 'info']

const kindLabels: Record<OsNotificationKind, string> = {
  info: 'Information',
  warning: 'Warning',
  error: 'Error',
  success: 'Success',
  system: 'System',
}

function timeLabel(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '--:--'
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', second: '2-digit' })
}

export function SystemLogApp() {
  const { state, openApp, clearNotificationHistory } = useOs()
  const [filter, setFilter] = useState<'all' | OsNotificationKind>('all')
  const entries = state.notificationHistory.filter((entry) => filter === 'all' || entry.kind === filter)

  return (
    <div className="app-content system-log-app">
      <ul className="os-menu-bar" role="menubar">
        <li>Log</li>
        <li>View</li>
        <li>Help</li>
      </ul>

      <div className="system-log-toolbar">
        <div className="system-log-filters">
          <span>Show:</span>
          {filters.map((item) => (
            <button
              key={item}
              type="button"
              className={filter === item ? 'active' : ''}
              onClick={() => setFilter(item)}
            >
              {item === 'all' ? 'All' : kindLabels[item]}
            </button>
          ))}
        </div>
        <button type="button" onClick={clearNotificationHistory} disabled={!state.notificationHistory.length}>
          Clear Log
        </button>
      </div>

      <div className="sunken-panel system-log-panel">
        {entries.length ? (
          <table className="system-log-table">
            <thead>
              <tr>
                <th>Time</th>
                <th>Type</th>
                <th>Event</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => {
                const action = entry.action
                return (
                  <tr key={entry.id}>
                    <td>{timeLabel(entry.createdAt)}</td>
                    <td>
                      <span className={`system-log-kind system-log-kind-${entry.kind}`}>
                        <img src={win98Icons[entry.icon ?? 'adminTools']} alt="" />
                        {kindLabels[entry.kind]}
                      </span>
                    </td>
                    <td>
                      <strong>
                        {entry.title}
                        {entry.count > 1 ? ` x${entry.count}` : ''}
                      </strong>
                      <span>{entry.body}</span>
                    </td>
                    <td>
                      {action ? (
                        <button type="button" onClick={() => openApp(action.appId, action.payload)}>
                          {action.label}
                        </button>
                      ) : (
                        <span className="system-log-muted">No action</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        ) : (
          <div className="system-log-empty">
            <img src={win98Icons.adminTools} alt="" />
            <strong>No events recorded</strong>
            <span>System notifications will appear here after drivers, files, networking, or imports change.</span>
          </div>
        )}
      </div>

      <div className="status-bar">
        <p className="status-bar-field">{entries.length} event(s)</p>
        <p className="status-bar-field">Newest first</p>
        <p className="status-bar-field">Portfolio OS only</p>
      </div>
    </div>
  )
}
