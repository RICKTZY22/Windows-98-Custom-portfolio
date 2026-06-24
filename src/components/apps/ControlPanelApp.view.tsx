import { win98Icons } from '../../data/icons'
import type { ControlPanelViewModel, InstalledProgram } from './ControlPanelApp.model'

type ControlPanelViewProps = Readonly<{
  model: ControlPanelViewModel
}>

function ProgramRow({
  program,
  selectedName,
  selectProgram,
  openProgram,
}: Readonly<{
  program: InstalledProgram
  selectedName: string | null
  selectProgram: (name: string) => void
  openProgram: (program: InstalledProgram) => void
}>) {
  const selected = selectedName === program.name
  return (
    <button
      type="button"
      role="option"
      aria-selected={selected}
      className={`arp-item ${selected ? 'selected' : ''}`}
      onClick={() => selectProgram(program.name)}
      onDoubleClick={() => openProgram(program)}
    >
      <img src={win98Icons[program.icon]} alt="" />
      <span className="arp-name">{program.name}</span>
      <span className="arp-size">{program.size}</span>
    </button>
  )
}

export function ControlPanelView({ model }: ControlPanelViewProps) {
  const { active, display, mouse, programs, sounds } = model

  return (
    <div className="app-content control-panel-app">
      <div className="control-grid sunken-panel">
        {model.sections.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`control-icon ${item.id === model.selectedSectionId ? 'selected' : ''}`}
            onClick={() => model.selectSection(item.id)}
          >
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
          {model.rows.map((row) => (
            <div key={row.label}>
              <span>{row.label}</span>
              <strong>{row.value}</strong>
            </div>
          ))}
        </div>
        {active.id === 'display' && (
          <div className="appearance-panel">
            <div className="theme-preview" style={display.previewStyle} aria-label="Theme preview">
              <div className="theme-preview-desktop">
                <div className="theme-preview-icon"></div>
                <div className="theme-preview-window">
                  <div className="theme-preview-title">Preview</div>
                  <div className="theme-preview-body">
                    <span>Window text</span>
                    <mark>Selected item</mark>
                  </div>
                </div>
                <div className="theme-preview-taskbar">Start</div>
              </div>
            </div>
            <div className="theme-options">
              <label htmlFor="theme-select">Scheme:</label>
              <select
                id="theme-select"
                value={display.draftTheme.id}
                onChange={(event) => display.chooseTheme(event.target.value)}
              >
                {display.themes.map((theme) => (
                  <option key={theme.id} value={theme.id}>
                    {theme.name}
                  </option>
                ))}
              </select>
              <p className="appearance-description">{display.draftTheme.description}</p>
              <label htmlFor="wallpaper-select">Wallpaper:</label>
              <select
                id="wallpaper-select"
                value={display.draftWallpaper.id}
                onChange={(event) => display.chooseWallpaper(event.target.value)}
              >
                {display.wallpapers.map((wallpaper) => (
                  <option key={wallpaper.id} value={wallpaper.id}>
                    {wallpaper.name}
                  </option>
                ))}
              </select>
              <p className="appearance-description">{display.draftWallpaper.description}</p>
              <div className="button-row appearance-actions">
                <button type="button" onClick={display.applyAppearance} disabled={!display.appearanceDirty}>
                  Apply
                </button>
                <button type="button" onClick={display.resetAppearanceDraft} disabled={!display.appearanceDirty}>
                  Reset
                </button>
              </div>
            </div>
          </div>
        )}
        {active.id === 'mouse' && (
          <div className="button-row">
            <button type="button" onClick={mouse.togglePointerScheme}>
              Toggle Pointer Scheme
            </button>
          </div>
        )}
        {active.id === 'sounds' && (
          <div className="soundboard">
            <div className="toolbar">
              <button type="button" onClick={sounds.enableAudio}>
                Enable Sound
              </button>
              <button type="button" onClick={sounds.toggleMuted}>
                {sounds.muted ? 'Unmute' : 'Mute'}
              </button>
              <label>
                Volume
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={sounds.volume}
                  onChange={(event) => sounds.setVolume(Number(event.target.value))}
                />
              </label>
            </div>
            <div className="soundboard-grid">
              {sounds.catalog.map((sound) => (
                <button key={sound.id} type="button" title={sound.description} onClick={() => sounds.play(sound.id)}>
                  {sound.label}
                </button>
              ))}
            </div>
          </div>
        )}
        {active.id === 'addremove' && (
          <div className="arp-panel">
            <p className="arp-hint">
              To install a program from a floppy disk or CD-ROM, click Install. To remove a program or change its
              components, select it from the list and click Add/Remove. Double-click a program to open it.
            </p>
            <div className="sunken-panel arp-list" role="listbox" aria-label="Installed programs">
              {programs.visible.map((program) => (
                <ProgramRow
                  key={program.name}
                  program={program}
                  selectedName={programs.selectedName}
                  selectProgram={programs.selectProgram}
                  openProgram={programs.openProgram}
                />
              ))}
            </div>
            <div className="button-row arp-actions">
              <button type="button" disabled={!programs.selected?.appId} onClick={programs.openSelectedProgram}>
                Open
              </button>
              <button type="button" disabled={!programs.selected} onClick={programs.addRemoveProgram}>
                Add/Remove...
              </button>
              <button type="button" onClick={programs.installProgram}>
                Install...
              </button>
            </div>
          </div>
        )}
        <div className="button-row">
          {active.id === 'network' && (
            <button type="button" onClick={model.openNetwork}>
              Network...
            </button>
          )}
          {active.id === 'system' && (
            <button type="button" onClick={model.openPerformance}>
              Performance...
            </button>
          )}
        </div>
      </fieldset>
    </div>
  )
}
