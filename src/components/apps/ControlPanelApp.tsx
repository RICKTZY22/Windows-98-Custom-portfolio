import { useState } from 'react'
import { controlPanelSections } from '../../data/system'
import { win98Icons } from '../../data/icons'
import type { AppId, ControlPanelSectionId, WindowPayload } from '../../types'

type ControlPanelAppProps = {
  section?: ControlPanelSectionId
  openApp: (appId: AppId, payload?: WindowPayload) => void
}

export function ControlPanelApp({ section = 'display', openApp }: ControlPanelAppProps) {
  const [selected, setSelected] = useState<ControlPanelSectionId>(section)
  const active = controlPanelSections.find((item) => item.id === selected) ?? controlPanelSections[0]

  return (
    <div className="app-content control-panel-app">
      <div className="control-grid sunken-panel">
        {controlPanelSections.map((item) => (
          <button key={item.id} type="button" className="control-icon" onClick={() => setSelected(item.id)}>
            <img src={win98Icons[item.icon]} alt="" />
            <span>{item.title}</span>
          </button>
        ))}
      </div>
      <fieldset className="control-detail">
        <legend>{active.title}</legend>
        <div className="identity-row">
          <img src={win98Icons[active.icon]} alt="" />
          <p>{active.description}</p>
        </div>
        <div className="property-grid">
          {active.rows.map(([label, value]) => (
            <div key={label}>
              <span>{label}</span>
              <strong>{value}</strong>
            </div>
          ))}
        </div>
        <div className="button-row">
          {active.id === 'network' && (
            <button type="button" onClick={() => openApp('network')}>
              Network...
            </button>
          )}
          {active.id === 'system' && (
            <button type="button" onClick={() => openApp('systemProperties')}>
              System...
            </button>
          )}
        </div>
      </fieldset>
    </div>
  )
}
