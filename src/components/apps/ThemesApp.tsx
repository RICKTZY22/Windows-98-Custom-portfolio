import { useState } from 'react'
import { win98Icons } from '../../data/icons'

const themes = [
  { id: 'clouds', name: 'Clouds', sample: 'theme-clouds' },
  { id: 'teal', name: 'Windows 98 Teal', sample: 'theme-teal' },
  { id: 'grid', name: 'Desktop Grid', sample: 'theme-grid' },
]

export function ThemesApp() {
  const [selected, setSelected] = useState(themes[0].id)
  const theme = themes.find((item) => item.id === selected) ?? themes[0]

  return (
    <div className="app-content themes-app">
      <div className="document-header">
        <img src={win98Icons.desktop} alt="" />
        <div>
          <h2>Display Properties</h2>
          <p>Theme preview for the simulated desktop.</p>
        </div>
      </div>
      <menu role="tablist" className="tabs">
        <button role="tab" aria-selected="true" type="button">
          Background
        </button>
        <button role="tab" aria-selected="false" type="button">
          Appearance
        </button>
        <button role="tab" aria-selected="false" type="button">
          Settings
        </button>
      </menu>
      <div className="sunken-panel themes-panel">
        <div className={`theme-preview ${theme.sample}`}>
          <span>My Portfolio</span>
        </div>
        <div className="theme-options">
          <label htmlFor="theme-select">Wallpaper:</label>
          <select id="theme-select" value={selected} onChange={(event) => setSelected(event.target.value)}>
            {themes.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
          <label>
            <input type="checkbox" defaultChecked /> Stretch desktop wallpaper
          </label>
          <label>
            <input type="checkbox" defaultChecked /> Show icons using all possible colors
          </label>
        </div>
      </div>
      <div className="button-row run-buttons">
        <button type="button">OK</button>
        <button type="button">Apply</button>
      </div>
    </div>
  )
}
