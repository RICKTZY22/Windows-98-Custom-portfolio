import { useState } from 'react'
import type { AppId, AppProps, ControlPanelSectionId, IconKey, SoundId } from '../../types'
import { controlPanelSections } from '../../data/system'
import { win98Icons } from '../../data/icons'
import { selectableThemes, wallpapers } from '../../data/themes'
import { soundCatalog } from '../../os/audio'
import { useOs } from '../../os/useOs'

type InstalledProgram = { name: string; appId?: AppId; icon: IconKey; size: string; required?: boolean }

// The Add/Remove Programs list. Entries with an appId can be launched ("Open"); `required`
// ones are treated as core Windows components that refuse removal (authentic Win98 behavior).
const INSTALLED_PROGRAMS: InstalledProgram[] = [
  { name: 'Microsoft Internet Explorer 5', appId: 'internetExplorer', icon: 'internet', size: '12.4 MB', required: true },
  { name: 'Microsoft Paint', appId: 'paint', icon: 'paint', size: '1.1 MB' },
  { name: 'WordPad', appId: 'wordpad', icon: 'wordpad', size: '1.8 MB' },
  { name: 'Notepad', appId: 'notepad', icon: 'notepad', size: '0.3 MB' },
  { name: 'Calculator', appId: 'calculator', icon: 'calculator', size: '0.4 MB' },
  { name: 'Minesweeper', appId: 'minesweeper', icon: 'minesweeper', size: '0.6 MB' },
  { name: 'Windows Media Player', appId: 'mediaPlayer', icon: 'mediaPlayer', size: '2.2 MB' },
  { name: 'Sound Recorder', appId: 'soundRecorder', icon: 'soundRecorder', size: '0.5 MB' },
  { name: 'Outlook Express 5', icon: 'world', size: '6.7 MB' },
  { name: 'Microsoft NetMeeting', icon: 'network', size: '4.1 MB' },
  { name: 'Windows 98 Portfolio Edition', icon: 'windows', size: '198 MB', required: true },
]

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
                      ['Installed programs', String(INSTALLED_PROGRAMS.length)],
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
    showMessageBox,
  } = useOs()
  const [selected, setSelected] = useState<ControlPanelSectionId>(payload?.controlPanelSection ?? 'display')
  const [removedPrograms, setRemovedPrograms] = useState<string[]>([])
  const [selectedProgram, setSelectedProgram] = useState<string | null>(null)
  const active = controlPanelSections.find((item) => item.id === selected) ?? controlPanelSections[0]
  const program = INSTALLED_PROGRAMS.find((item) => item.name === selectedProgram) ?? null

  function openProgram(item: InstalledProgram) {
    if (item.appId) openApp(item.appId)
  }

  function addRemoveProgram() {
    if (!program) return
    if (program.required) {
      showMessageBox({
        title: 'Add/Remove Programs',
        message: `${program.name} is a required Windows component and cannot be removed.`,
        icon: 'warning',
        buttons: ['ok'],
      })
      return
    }
    showMessageBox({
      title: 'Confirm File Deletion',
      message: `Are you sure you want to remove ${program.name} and all of its components?`,
      icon: 'question',
      buttons: ['yes', 'no'],
      onResult: (button) => {
        if (button !== 'yes') return
        setRemovedPrograms((list) => [...list, program.name])
        setSelectedProgram(null)
        showMessageBox({
          title: 'Add/Remove Programs',
          message: `${program.name} was removed successfully.`,
          icon: 'info',
          buttons: ['ok'],
        })
      },
    })
  }

  function installProgram() {
    showMessageBox({
      title: 'Install Program From Floppy Disk or CD-ROM',
      message: 'Insert the program’s first installation floppy disk or CD-ROM, then click OK.',
      detail: 'Windows could not detect a setup program. In this edition, programs are launched from the Start menu.',
      icon: 'info',
      buttons: ['ok'],
    })
  }

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
        {active.id === 'addremove' && (
          <div className="arp-panel">
            <p className="arp-hint">
              To install a program from a floppy disk or CD-ROM, click Install. To remove a program or change its
              components, select it from the list and click Add/Remove. Double-click a program to open it.
            </p>
            <div className="sunken-panel arp-list" role="listbox" aria-label="Installed programs">
              {INSTALLED_PROGRAMS.filter((item) => !removedPrograms.includes(item.name)).map((item) => (
                <button
                  key={item.name}
                  type="button"
                  role="option"
                  aria-selected={selectedProgram === item.name}
                  className={`arp-item ${selectedProgram === item.name ? 'selected' : ''}`}
                  onClick={() => setSelectedProgram(item.name)}
                  onDoubleClick={() => openProgram(item)}
                >
                  <img src={win98Icons[item.icon]} alt="" />
                  <span className="arp-name">{item.name}</span>
                  <span className="arp-size">{item.size}</span>
                </button>
              ))}
            </div>
            <div className="button-row arp-actions">
              <button type="button" disabled={!program?.appId} onClick={() => program && openProgram(program)}>
                Open
              </button>
              <button type="button" disabled={!program} onClick={addRemoveProgram}>
                Add/Remove...
              </button>
              <button type="button" onClick={installProgram}>
                Install...
              </button>
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
