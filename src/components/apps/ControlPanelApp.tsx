import { useState } from 'react'
import type { AppProps, ControlPanelSectionId, SoundId } from '../../types'
import { controlPanelSections } from '../../data/system'
import { win98Icons } from '../../data/icons'
import { selectableThemes, wallpapers } from '../../data/themes'
import { soundCatalog } from '../../os/audio'
import { useOs } from '../../os/useOs'

function SectionRows({ id }: { id: ControlPanelSectionId }) {
  const { state } = useOs()
  const rows: Array<[string, string]> =
    id === 'system'
      ? [
          ['System', 'Microsoft Windows 98 Portfolio Edition'],
          ['Computer', 'Genuine Browser PC'],
          ['Memory', '64 MB simulated RAM'],
          ['Display', state.bootMode === 'safe' ? 'Standard VGA, 16 colors' : 'Accelerated CSS desktop'],
        ]
      : id === 'network'
        ? [
            ['Adapter', state.network.adapterName],
            ['IP Address', state.network.ipAddress],
            ['Gateway', state.network.gateway || '(none)'],
            ['Status', state.network.connected ? 'Connected' : 'Disconnected'],
          ]
        : id === 'mouse'
          ? [
              ['Pointer scheme', state.cursorScheme === 'win98' ? 'Windows 98 Animated' : 'Standard'],
              ['Button configuration', 'Right-handed'],
              ['Pointer speed', 'Medium'],
            ]
          : id === 'datetime'
            ? [
                ['Date', new Date().toLocaleDateString()],
                ['Time', new Date().toLocaleTimeString()],
                ['Time zone', Intl.DateTimeFormat().resolvedOptions().timeZone],
              ]
            : id === 'keyboard'
              ? [
                  ['Repeat delay', 'Short'],
                  ['Repeat rate', 'Fast'],
                  ['Language', 'US 101-key'],
                ]
              : id === 'printers'
                ? [
                    ['Default printer', 'Portfolio Writer on LPT1:'],
                    ['Queue status', 'Ready'],
                  ]
                : id === 'addremove'
                  ? [
                      ['Installed programs', '12'],
                      ['Windows components', 'Accessories, Internet Tools, Multimedia'],
                    ]
                  : [
                      ['Theme', state.themeId],
                      ['Wallpaper', state.wallpaperId],
                      ['Sound', state.audio.enabled ? 'Enabled' : 'Disabled'],
                    ]

  return (
    <div className="property-grid">
      {rows.map(([label, value]) => (
        <div key={label}>
          <span>{label}</span>
          <strong>{value}</strong>
        </div>
      ))}
    </div>
  )
}

export function ControlPanelApp({ payload }: AppProps) {
  const {
    state,
    openApp,
    setTheme,
    setWallpaper,
    setCursorScheme,
    enableAudio,
    setAudioMuted,
    setAudioVolume,
    playSound,
  } = useOs()
  const [selected, setSelected] = useState<ControlPanelSectionId>(payload?.controlPanelSection ?? 'display')
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
        <SectionRows id={active.id} />
        {active.id === 'display' && (
          <div className="theme-options">
            <label htmlFor="theme-select">Scheme:</label>
            <select id="theme-select" value={state.themeId} onChange={(event) => setTheme(event.target.value)}>
              {selectableThemes.map((theme) => (
                <option key={theme.id} value={theme.id}>
                  {theme.name}
                </option>
              ))}
            </select>
            <label htmlFor="wallpaper-select">Wallpaper:</label>
            <select id="wallpaper-select" value={state.wallpaperId} onChange={(event) => setWallpaper(event.target.value)}>
              {wallpapers.map((wallpaper) => (
                <option key={wallpaper.id} value={wallpaper.id}>
                  {wallpaper.name}
                </option>
              ))}
            </select>
          </div>
        )}
        {active.id === 'mouse' && (
          <div className="button-row">
            <button type="button" onClick={() => setCursorScheme(state.cursorScheme === 'win98' ? 'standard' : 'win98')}>
              Toggle Pointer Scheme
            </button>
          </div>
        )}
        {active.id === 'sounds' && (
          <div className="soundboard">
            <div className="toolbar">
              <button type="button" onClick={enableAudio}>
                Enable Sound
              </button>
              <button type="button" onClick={() => setAudioMuted(!state.audio.muted)}>
                {state.audio.muted ? 'Unmute' : 'Mute'}
              </button>
              <label>
                Volume
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={state.audio.volume}
                  onChange={(event) => setAudioVolume(Number(event.target.value))}
                />
              </label>
            </div>
            <div className="soundboard-grid">
              {soundCatalog.map((sound) => (
                <button key={sound.id} type="button" onClick={() => playSound(sound.id as SoundId)}>
                  {sound.label}
                </button>
              ))}
            </div>
          </div>
        )}
        <div className="button-row">
          {active.id === 'network' && (
            <button type="button" onClick={() => openApp('network')}>
              Network...
            </button>
          )}
          {active.id === 'system' && (
            <button type="button" onClick={() => openApp('taskManager')}>
              Performance...
            </button>
          )}
        </div>
      </fieldset>
    </div>
  )
}
