import './MsConfigApp.css'
import { useState } from 'react'
import {
  startupItems,
  selectiveStartupOptions,
  configFileSamples,
  type StartupSelection,
} from '../../data/systemProfile'
import { useOs } from '../../os/useOs'

type TabId = 'general' | 'Config.sys' | 'Autoexec.bat' | 'System.ini' | 'Win.ini' | 'startup'

const TABS: Array<{ id: TabId; label: string }> = [
  { id: 'general', label: 'General' },
  { id: 'Config.sys', label: 'Config.sys' },
  { id: 'Autoexec.bat', label: 'Autoexec.bat' },
  { id: 'System.ini', label: 'System.ini' },
  { id: 'Win.ini', label: 'Win.ini' },
  { id: 'startup', label: 'Startup' },
]

export function MsConfigApp() {
  const { restart, showMessageBox } = useOs()
  const [tab, setTab] = useState<TabId>('general')
  const [selection, setSelection] = useState<StartupSelection>('normal')
  const [selective, setSelective] = useState<boolean[]>(() => selectiveStartupOptions.map(() => true))
  const [startupChecks, setStartupChecks] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(startupItems.map((item) => [item.name, item.enabledByDefault])),
  )
  const [dirty, setDirty] = useState(false)

  function chooseSelection(next: StartupSelection) {
    setSelection(next)
    setDirty(true)
    if (next === 'normal') {
      setSelective(selectiveStartupOptions.map(() => true))
      setStartupChecks(Object.fromEntries(startupItems.map((item) => [item.name, true])))
    } else if (next === 'diagnostic') {
      setSelective(selectiveStartupOptions.map(() => false))
      setStartupChecks(Object.fromEntries(startupItems.map((item) => [item.name, false])))
    }
  }

  function toggleSelective(index: number) {
    // Editing any individual option implies Selective startup, like real MSConfig.
    setSelection('selective')
    setDirty(true)
    setSelective((flags) => flags.map((value, i) => (i === index ? !value : value)))
  }

  function toggleStartupItem(name: string) {
    setSelection('selective')
    setDirty(true)
    setStartupChecks((checks) => ({ ...checks, [name]: !checks[name] }))
  }

  function apply(closeAfter: boolean) {
    setDirty(false)
    showMessageBox({
      title: 'System Configuration Utility',
      message:
        'You must restart your computer for some of the changes made by System Configuration Utility to take effect. Do you want to restart now?',
      detail: 'Browser-only simulation: a restart replays the boot sequence and reloads the same desktop. No files are changed.',
      icon: 'question',
      buttons: ['yes', 'no'],
      onResult: (button) => {
        if (button === 'yes') restart('normal', { bootProfile: 'warm' })
      },
    })
    void closeAfter
  }

  const selectiveDisabled = selection !== 'selective'

  return (
    <div className="app-content msconfig-app">
      <menu role="tablist" className="msconfig-tabs">
        {TABS.map((t) => (
          <li key={t.id} role="tab" aria-selected={tab === t.id}>
            <a
              href="#"
              onClick={(event) => {
                event.preventDefault()
                setTab(t.id)
              }}
            >
              {t.label}
            </a>
          </li>
        ))}
      </menu>

      <div className="window msconfig-panel" role="tabpanel">
        {tab === 'general' && (
          <div className="msconfig-general">
            <p className="msconfig-lead">Startup selection</p>
            <fieldset className="msconfig-startup-select">
              <label className="msconfig-radio">
                <input
                  type="radio"
                  name="msconfig-startup"
                  checked={selection === 'normal'}
                  onChange={() => chooseSelection('normal')}
                />
                Normal startup - load all device drivers and software
              </label>
              <label className="msconfig-radio">
                <input
                  type="radio"
                  name="msconfig-startup"
                  checked={selection === 'diagnostic'}
                  onChange={() => chooseSelection('diagnostic')}
                />
                Diagnostic startup - interactively load device drivers and software
              </label>
              <label className="msconfig-radio">
                <input
                  type="radio"
                  name="msconfig-startup"
                  checked={selection === 'selective'}
                  onChange={() => chooseSelection('selective')}
                />
                Selective startup
              </label>
              <div className={`msconfig-selective ${selectiveDisabled ? 'is-dim' : ''}`}>
                {selectiveStartupOptions.map((option, index) => (
                  <label className="msconfig-check" key={option}>
                    <input
                      type="checkbox"
                      checked={selective[index]}
                      disabled={selectiveDisabled}
                      onChange={() => toggleSelective(index)}
                    />
                    {option}
                  </label>
                ))}
              </div>
            </fieldset>
            <p className="msconfig-note">
              Simulated System Configuration Utility. Choices here are not persisted — they demonstrate the classic Win98
              boot/startup flow. Apply prompts a restart that replays the boot sequence.
            </p>
          </div>
        )}

        {tab === 'startup' && (
          <div className="msconfig-startup-tab">
            <p className="msconfig-lead">Select the check box to enable a startup item, or clear it to disable it.</p>
            <div className="sunken-panel msconfig-startup-list">
              <div className="msconfig-startup-head">
                <span />
                <span>Startup Item</span>
                <span>Command</span>
                <span>Location</span>
              </div>
              {startupItems.map((item) => (
                <label className="msconfig-startup-row" key={item.name}>
                  <input
                    type="checkbox"
                    checked={Boolean(startupChecks[item.name])}
                    onChange={() => toggleStartupItem(item.name)}
                  />
                  <span className="msconfig-startup-name">{item.name}</span>
                  <span className="msconfig-startup-cmd">{item.command}</span>
                  <span className="msconfig-startup-loc">{item.location}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        {tab !== 'general' && tab !== 'startup' && (
          <div className="msconfig-file-tab">
            <p className="msconfig-lead">{tab}</p>
            <div className="sunken-panel msconfig-file-list">
              {(configFileSamples[tab] ?? []).map((line, index) => (
                <label className="msconfig-file-row" key={`${tab}-${index}`}>
                  <input type="checkbox" defaultChecked />
                  <span>{line}</span>
                </label>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="msconfig-buttons">
        <button type="button" onClick={() => apply(true)}>
          OK
        </button>
        <button type="button" onClick={() => setDirty(false)}>
          Cancel
        </button>
        <button type="button" disabled={!dirty} onClick={() => apply(false)}>
          Apply
        </button>
        <button
          type="button"
          onClick={() =>
            showMessageBox({
              title: 'System Configuration Utility',
              message: 'System Configuration Utility lets you change how Windows starts up for troubleshooting.',
              detail: 'General controls the startup mode; Startup lists programs that load with Windows. This is a safe browser simulation.',
              icon: 'info',
              buttons: ['ok'],
            })
          }
        >
          Help
        </button>
      </div>
    </div>
  )
}
