import './DeviceManagerApp.css'
import { useState } from 'react'
import { win98Icons } from '../../data/icons'
import { deviceCategories, type DeviceNode } from '../../data/systemProfile'
import { useOs } from '../../os/useOs'
import { effectiveDriverHealthy, missingDriverFiles } from '../../os/systemHealth'
import { baseName } from '../../os/filesystem'
import type { BootMode, FsState } from '../../types'

type DeviceStatus = { ok: boolean; code: string; text: string }

function deviceStatus(fs: FsState, device: DeviceNode, bootMode: BootMode): DeviceStatus {
  if (device.driver && !effectiveDriverHealthy(fs, device.driver, bootMode)) {
    const files = missingDriverFiles(fs, device.driver).map(baseName).join(', ')
    return {
      ok: false,
      code: 'Code 28',
      text: `The drivers for this device are not installed (${files || 'driver package missing'}). To reinstall, open BIOS Setup > Recovery Mode and restore the protected driver cache.`,
    }
  }
  return { ok: true, code: '', text: 'This device is working properly.' }
}

export function DeviceManagerApp() {
  const { state, showMessageBox } = useOs()
  const fs = state.fs
  const [selected, setSelected] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  function openProperties(_category: string, device: DeviceNode) {
    const status = deviceStatus(fs, device, state.bootMode)
    showMessageBox({
      title: `${device.name} Properties`,
      message: status.ok ? `${device.name}\n\nDevice status: This device is working properly.` : `${device.name}\n\nDevice status: ${status.text}`,
      detail: `Manufacturer: ${device.manufacturer}\nLocation: ${device.location}${status.ok ? '' : `\nProblem: ${status.code}`}`,
      icon: status.ok ? 'info' : 'warning',
      buttons: ['ok'],
    })
  }

  const anyProblem = deviceCategories.some((cat) =>
    cat.devices.some((d) => d.driver && !effectiveDriverHealthy(fs, d.driver, state.bootMode)),
  )
  const selectedDevice = (() => {
    if (!selected) return null
    const [catId, idxStr] = selected.split(':')
    const cat = deviceCategories.find((c) => c.id === catId)
    if (!cat || idxStr === undefined) return null
    return { category: cat.id, device: cat.devices[Number(idxStr)] }
  })()

  return (
    <div className="app-content devmgr-app" key={refreshKey}>
      <ul className="os-menu-bar" role="menubar">
        <li>Action</li>
        <li>View</li>
        <li>Help</li>
      </ul>

      <div className="devmgr-toolbar">
        <label className="devmgr-radio">
          <input type="radio" name="devmgr-view" defaultChecked readOnly />
          View devices by type
        </label>
        <label className="devmgr-radio is-dim">
          <input type="radio" name="devmgr-view" disabled />
          View devices by connection
        </label>
      </div>

      <div className="sunken-panel devmgr-tree-shell">
        <ul className="tree-view devmgr-tree">
          <li>
            <details open>
              <summary
                className={`devmgr-node devmgr-root ${selected === 'computer' ? 'selected' : ''}`}
                onClick={() => setSelected('computer')}
              >
                <img src={win98Icons.computer} alt="" />
                <span>Computer</span>
              </summary>
              <ul>
                {deviceCategories.map((cat) => (
                  <li key={cat.id}>
                    <details>
                      <summary className="devmgr-node devmgr-category">
                        <img src={win98Icons[cat.icon]} alt="" />
                        <span>{cat.label}</span>
                      </summary>
                      <ul>
                        {cat.devices.map((device, index) => {
                          const key = `${cat.id}:${index}`
                          const status = deviceStatus(fs, device, state.bootMode)
                          return (
                            <li key={key}>
                              <button
                                type="button"
                                className={`devmgr-node devmgr-device ${selected === key ? 'selected' : ''} ${status.ok ? '' : 'has-problem'}`}
                                onClick={() => setSelected(key)}
                                onDoubleClick={() => openProperties(cat.id, device)}
                              >
                                <span className="devmgr-device-icon">
                                  <img src={win98Icons[device.icon]} alt="" />
                                  {!status.ok && <span className="devmgr-problem-badge" aria-hidden="true">!</span>}
                                </span>
                                <span>{device.name}</span>
                              </button>
                            </li>
                          )
                        })}
                      </ul>
                    </details>
                  </li>
                ))}
              </ul>
            </details>
          </li>
        </ul>
      </div>

      <div className="devmgr-buttons">
        <button
          type="button"
          disabled={!selectedDevice?.device}
          onClick={() => {
            if (selectedDevice?.device) openProperties(selectedDevice.category, selectedDevice.device)
          }}
        >
          Properties
        </button>
        <button type="button" onClick={() => setRefreshKey((k) => k + 1)}>
          Refresh
        </button>
        <button type="button" disabled>
          Remove
        </button>
        <button type="button" disabled>
          Print...
        </button>
      </div>

      <div className="status-bar devmgr-status">
        <p className="status-bar-field">
          {anyProblem ? 'One or more devices are not working properly.' : 'All devices are working properly.'}
        </p>
      </div>
    </div>
  )
}
