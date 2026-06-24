import { useEffect, useMemo, useState } from 'react'
import type { BiosSettings, BootDeviceId } from '../../types'
import {
  biosSetupSections,
  bootDeviceLabels,
  bootSequenceLabel,
  defaultBiosSettings,
  displayModeLabels,
  haltOnLabels,
  moveBootDevice,
  powerManagementLabels,
  softOffModeLabels,
  videoOffMethodLabels,
} from '../../data/bios'
import { useOs } from '../../os/useOs'
import { isSystemHealthy, missingRequiredSystemFiles } from '../../os/recovery'
import { driverStatusLabel, missingDriverFiles, systemStatusLabel } from '../../os/systemHealth'

type BiosRow = {
  label: string
  value: string
  hint?: string
  onChange?: () => void
  onPrevious?: () => void
  onNext?: () => void
}

function yesNo(value: boolean): string {
  return value ? 'Enabled' : 'Disabled'
}

function deviceStatus(enabled: boolean, status: string): string {
  if (!enabled) return 'Disabled'
  return status === 'Detected' ? 'Enabled / Detected' : `Enabled / ${status}`
}

function healthCount(status: string, count: number): string {
  return count ? `${status} (${count} missing)` : status
}

function bootDeviceEnabled(settings: BiosSettings, device: BootDeviceId): boolean {
  if (device === 'floppy') return settings.floppyEnabled
  if (device === 'cdrom') return settings.cdromEnabled
  if (device === 'network') return settings.networkBootEnabled
  return true
}

export function BiosSetupScreen() {
  const { state, setBiosSettings, restart, enterRecoveryMode } = useOs()
  const [draft, setDraft] = useState<BiosSettings>(state.bios)
  const [sectionIndex, setSectionIndex] = useState(0)
  const [rowIndex, setRowIndex] = useState(0)
  const section = biosSetupSections[sectionIndex]
  const missingRequired = missingRequiredSystemFiles(state.fs)

  const rows = useMemo<BiosRow[]>(() => {
    const toggle = (key: keyof Pick<
      BiosSettings,
      | 'quickPost'
      | 'floppyEnabled'
      | 'cdromEnabled'
      | 'networkBootEnabled'
      | 'soundEnabled'
      | 'virusWarning'
      | 'pnpOsInstalled'
      | 'resetConfigurationData'
      | 'assignIrqForVga'
      | 'apmEnabled'
    >) => {
      setDraft((current) => ({ ...current, [key]: !current[key] }))
    }
    const cycle = <Key extends keyof BiosSettings>(key: Key, values: BiosSettings[Key][]) => {
      setDraft((current) => {
        const index = values.indexOf(current[key])
        return { ...current, [key]: values[(index + 1) % values.length] }
      })
    }
    const cycleHaltOn = () => {
      const order: BiosSettings['haltOn'][] = ['allErrors', 'allButKeyboard', 'noErrors']
      setDraft((current) => ({
        ...current,
        haltOn: order[(order.indexOf(current.haltOn) + 1) % order.length],
      }))
    }
    const moveDevice = (device: BootDeviceId, direction: -1 | 1) => {
      setDraft((current) => ({ ...current, bootOrder: moveBootDevice(current.bootOrder, device, direction) }))
    }

    if (section.id === 'standard') {
      return [
        {
          label: 'Date (mm:dd:yy)',
          value: draft.cmosDate,
          hint: 'Press Enter to cycle safe simulated CMOS dates.',
          onChange: () => cycle('cmosDate', ['06/14/26', '06/23/26', '05/11/98']),
        },
        {
          label: 'Time (hh:mm:ss)',
          value: draft.cmosTime,
          hint: 'Press Enter to sync the simulated CMOS clock to the browser time.',
          onChange: () =>
            setDraft((current) => ({
              ...current,
              cmosTime: new Date().toLocaleTimeString('en-US', { hour12: false }),
            })),
        },
        { label: 'Primary Master', value: 'VIRTUAL_DISK_98 2.1GB' },
        { label: 'Primary Slave', value: 'None' },
        {
          label: 'Secondary Master',
          value: draft.cdromEnabled ? 'PORTFOLIO CD-ROM 24X' : 'None',
          hint: 'Press Enter to enable or disable the simulated CD-ROM controller.',
          onChange: () => toggle('cdromEnabled'),
        },
        {
          label: 'Drive A',
          value: draft.floppyEnabled ? '1.44M, 3.5 in.' : 'None',
          hint: 'Press Enter to enable or disable the simulated floppy controller.',
          onChange: () => toggle('floppyEnabled'),
        },
        { label: 'Base Memory', value: '640K' },
        { label: 'Extended Memory', value: '64512K' },
        {
          label: 'Display',
          value: displayModeLabels[draft.displayMode],
          hint: 'Press Enter to cycle the simulated display adapter mode.',
          onChange: () => cycle('displayMode', ['egaVga', 'cga80', 'mono']),
        },
      ]
    }

    if (section.id === 'features') {
      return [
        { label: 'Virus Warning', value: yesNo(draft.virusWarning), onChange: () => toggle('virusWarning') },
        { label: 'CPU Internal Cache', value: 'Enabled' },
        { label: 'External Cache', value: 'Enabled' },
        { label: 'Quick Power On Self Test', value: yesNo(draft.quickPost), onChange: () => toggle('quickPost') },
        { label: 'Boot Sequence', value: bootSequenceLabel(draft) },
        { label: 'Swap Floppy Drive', value: 'Disabled' },
        { label: 'Boot Up NumLock Status', value: 'On' },
        { label: 'Halt On', value: haltOnLabels[draft.haltOn], onChange: cycleHaltOn },
      ]
    }

    if (section.id === 'peripherals') {
      const networkStatus = driverStatusLabel(state.fs, 'network')
      const audioStatus = driverStatusLabel(state.fs, 'audio')
      return [
        { label: 'Onboard IDE-1 Controller', value: 'Enabled' },
        { label: 'Onboard IDE-2 Controller', value: yesNo(draft.cdromEnabled), onChange: () => toggle('cdromEnabled') },
        { label: 'Onboard FDC Controller', value: yesNo(draft.floppyEnabled), onChange: () => toggle('floppyEnabled') },
        { label: 'Onboard Serial Port 1', value: '3F8/IRQ4' },
        { label: 'Onboard Parallel Port', value: '378/IRQ7' },
        { label: 'Sound Blaster 16', value: deviceStatus(draft.soundEnabled, audioStatus), onChange: () => toggle('soundEnabled') },
        {
          label: 'PCI Ethernet Boot ROM',
          value: deviceStatus(draft.networkBootEnabled, networkStatus),
          onChange: () => toggle('networkBootEnabled'),
        },
      ]
    }

    if (section.id === 'pnp') {
      return [
        { label: 'PNP OS Installed', value: yesNo(draft.pnpOsInstalled), onChange: () => toggle('pnpOsInstalled') },
        { label: 'Resources Controlled By', value: draft.pnpOsInstalled ? 'Auto (ESCD)' : 'Manual' },
        {
          label: 'Reset Configuration Data',
          value: yesNo(draft.resetConfigurationData),
          onChange: () => toggle('resetConfigurationData'),
          hint: 'Clears simulated browser-only ESCD records on the next portfolio OS boot.',
        },
        { label: 'Assign IRQ For VGA', value: yesNo(draft.assignIrqForVga), onChange: () => toggle('assignIrqForVga') },
        { label: 'PCI Slot 1 Ethernet', value: driverStatusLabel(state.fs, 'network') },
        { label: 'PCI Slot 2 VGA Display', value: driverStatusLabel(state.fs, 'video') },
        { label: 'ISA Slot Sound Blaster 16', value: driverStatusLabel(state.fs, 'audio') },
        { label: 'PS/2 Keyboard / Mouse', value: driverStatusLabel(state.fs, 'input') },
      ]
    }

    if (section.id === 'systemHealth') {
      const networkMissing = missingDriverFiles(state.fs, 'network').length
      const audioMissing = missingDriverFiles(state.fs, 'audio').length
      const videoMissing = missingDriverFiles(state.fs, 'video').length
      const inputMissing = missingDriverFiles(state.fs, 'input').length
      const totalDriverMissing = networkMissing + audioMissing + videoMissing + inputMissing
      const openRecovery = () => enterRecoveryMode()
      return [
        {
          label: 'Core System Files',
          value: systemStatusLabel(state.fs),
          hint: 'Press Enter to open Recovery Mode and verify protected files.',
          onChange: openRecovery,
        },
        {
          label: 'Network Drivers',
          value: healthCount(driverStatusLabel(state.fs, 'network'), networkMissing),
          hint: 'Press Enter to open Recovery Mode and restore simulated drivers if needed.',
          onChange: openRecovery,
        },
        {
          label: 'Audio Drivers',
          value: healthCount(driverStatusLabel(state.fs, 'audio'), audioMissing),
          hint: 'Press Enter to open Recovery Mode and restore simulated drivers if needed.',
          onChange: openRecovery,
        },
        {
          label: 'Video Drivers',
          value: healthCount(driverStatusLabel(state.fs, 'video'), videoMissing),
          hint: 'Press Enter to open Recovery Mode and restore simulated drivers if needed.',
          onChange: openRecovery,
        },
        {
          label: 'Input Drivers',
          value: healthCount(driverStatusLabel(state.fs, 'input'), inputMissing),
          hint: 'Press Enter to open Recovery Mode. Input drivers only warn; real keyboard/mouse stay usable.',
          onChange: openRecovery,
        },
        {
          label: 'Recovery Recommendation',
          value: missingRequired.length || totalDriverMissing ? 'Run Recovery Mode' : 'No action needed',
          hint: 'Recovery Mode restores simulated files from the portfolio OS protected cache.',
          onChange: openRecovery,
        },
      ]
    }

    if (section.id === 'boot') {
      return draft.bootOrder.map((device, index) => ({
        label: `${index + 1}${index === 0 ? 'st' : index === 1 ? 'nd' : index === 2 ? 'rd' : 'th'} Boot Device`,
        value: `${bootDeviceLabels[device]}${bootDeviceEnabled(draft, device) ? '' : ' (Disabled)'}`,
        hint: bootDeviceEnabled(draft, device)
          ? 'Only the hard disk contains a bootable Portfolio Windows installation.'
          : 'Enable this device under Integrated Peripherals before using it.',
        onPrevious: () => moveDevice(device, -1),
        onNext: () => moveDevice(device, 1),
      }))
    }

    if (section.id === 'power') {
      return [
        {
          label: 'Power Management',
          value: powerManagementLabels[draft.powerManagement],
          hint: 'Press Enter to cycle power profiles.',
          onChange: () => cycle('powerManagement', ['userDefine', 'maxSaving', 'minSaving', 'disabled']),
        },
        {
          label: 'PM Control by APM',
          value: draft.apmEnabled ? 'Yes' : 'No',
          hint: 'Press Enter to toggle simulated APM support.',
          onChange: () => toggle('apmEnabled'),
        },
        {
          label: 'Video Off Method',
          value: videoOffMethodLabels[draft.videoOffMethod],
          hint: 'Press Enter to cycle simulated display power-down behavior.',
          onChange: () => cycle('videoOffMethod', ['vhSyncBlank', 'blankScreen', 'dpms']),
        },
        {
          label: 'MODEM Use IRQ',
          value: draft.modemIrq,
          hint: 'Press Enter to cycle legacy modem IRQ assignments.',
          onChange: () => cycle('modemIrq', ['3', '4', '5', '7', 'NA']),
        },
        {
          label: 'Soft-Off by PWR-BTTN',
          value: softOffModeLabels[draft.softOffMode],
          hint: 'Press Enter to toggle simulated power-button behavior.',
          onChange: () => cycle('softOffMode', ['instantOff', 'delay4Sec']),
        },
        {
          label: 'Resume by LAN',
          value: draft.networkBootEnabled ? 'Enabled' : 'Disabled',
          hint: 'Press Enter to toggle LAN wake/resume support.',
          onChange: () => toggle('networkBootEnabled'),
        },
      ]
    }

    if (section.id === 'recovery') {
      return [
        {
          label: 'Windows Recovery Mode',
          value: 'Press Enter',
          hint: 'Boot the recovery environment and restore missing portfolio OS files from the protected cache.',
          onChange: () => enterRecoveryMode(),
        },
        {
          label: 'System Status',
          value: isSystemHealthy(state.fs) ? 'Healthy' : `${missingRequired.length} required file(s) missing`,
        },
        { label: 'Repair Source', value: 'RB000.CAB / protected cache' },
        { label: 'Recovery Tools', value: 'SCANREG, SFC, package reinstall' },
      ]
    }

    if (section.id === 'defaults') {
      return [{ label: 'Load stable defaults', value: 'Press Enter or F5', onChange: () => setDraft(defaultBiosSettings) }]
    }

    if (section.id === 'save') {
      return [{ label: 'Save to CMOS and exit', value: 'Press Enter or F10', onChange: () => saveAndExit() }]
    }

    return [{ label: 'Exit setup', value: 'Press Enter or Esc', onChange: () => restart('normal', { bootProfile: 'warm' }) }]
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft, enterRecoveryMode, missingRequired.length, restart, section.id, state.fs])

  const safeRowIndex = Math.min(rowIndex, Math.max(0, rows.length - 1))

  function saveAndExit() {
    setBiosSettings(draft)
    restart('normal', { bootProfile: 'warm' })
  }

  function changeCurrentRow(direction?: -1 | 1) {
    const row = rows[safeRowIndex]
    if (!row) return
    if (direction === -1 && row.onPrevious) {
      row.onPrevious()
      return
    }
    if (direction === 1 && row.onNext) {
      row.onNext()
      return
    }
    row.onChange?.()
  }

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'F10') {
        event.preventDefault()
        saveAndExit()
        return
      }
      if (event.key === 'F5') {
        event.preventDefault()
        setDraft(defaultBiosSettings)
        return
      }
      if (event.key === 'Escape') {
        event.preventDefault()
        restart('normal', { bootProfile: 'warm' })
        return
      }
      if (event.key === 'ArrowRight' || event.key === 'Tab') {
        event.preventDefault()
        setSectionIndex((current) => (current + 1) % biosSetupSections.length)
        setRowIndex(0)
        return
      }
      if (event.key === 'ArrowLeft') {
        event.preventDefault()
        setSectionIndex((current) => (current - 1 + biosSetupSections.length) % biosSetupSections.length)
        setRowIndex(0)
        return
      }
      if (event.key === 'ArrowDown') {
        event.preventDefault()
        setRowIndex((current) => (current + 1) % Math.max(1, rows.length))
        return
      }
      if (event.key === 'ArrowUp') {
        event.preventDefault()
        setRowIndex((current) => (current - 1 + Math.max(1, rows.length)) % Math.max(1, rows.length))
        return
      }
      if (event.key === 'PageUp' || event.key === '+') {
        event.preventDefault()
        changeCurrentRow(-1)
        return
      }
      if (event.key === 'PageDown' || event.key === '-') {
        event.preventDefault()
        changeCurrentRow(1)
        return
      }
      if (event.key === 'Enter') {
        event.preventDefault()
        if (section.id === 'save') {
          saveAndExit()
        } else if (section.id === 'exit') {
          restart('normal', { bootProfile: 'warm' })
        } else {
          changeCurrentRow()
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rowIndex, rows, restart, section.id, draft])

  const activeRow = rows[safeRowIndex]
  const sectionSplit = biosSetupSections.length
  const sectionColumns = [biosSetupSections]

  return (
    <main className="bios-setup-screen" aria-label="Award BIOS setup utility">
      <section className="bios-frame">
        <header className="bios-title">CMOS Setup Utility - Copyright (C) 1984-1998 Award Software</header>
        <div className="bios-main" aria-label="BIOS setup main menu">
          <nav className="bios-section-list" aria-label="BIOS setup sections">
            {sectionColumns.map((column, columnIndex) => (
              <div key={columnIndex} className="bios-section-column">
                {column.map((item, itemIndex) => {
                  const index = columnIndex * sectionSplit + itemIndex
                  return (
                    <div
                      key={item.id}
                      className={`bios-section-item ${sectionIndex === index ? 'selected' : ''}`}
                      aria-current={sectionIndex === index ? 'true' : undefined}
                    >
                      <span aria-hidden="true">{index < sectionSplit ? '►' : ' '}</span>
                      {item.title}
                    </div>
                  )
                })}
              </div>
            ))}
          </nav>
          <section className="bios-detail" aria-label={section.title}>
            <h1>{section.title}</h1>
            <div className="bios-table">
              {rows.map((row, index) => (
                <div
                  key={`${row.label}-${index}`}
                  className={`bios-row ${safeRowIndex === index ? 'selected' : ''}`}
                  aria-current={safeRowIndex === index ? 'true' : undefined}
                >
                  <span>{row.label}</span>
                  <strong>{row.value}</strong>
                </div>
              ))}
            </div>
          </section>
        </div>
        <footer className="bios-help">
          <div className="bios-key-help" aria-label="BIOS keyboard controls">
            <span>Esc : Quit</span>
            <span>↑↓→← : Select Item</span>
            <span>Enter : Select</span>
            <span>F5 : Defaults</span>
            <span>F10 : Save &amp; Exit Setup</span>
          </div>
          <p className="bios-help-text">{activeRow?.hint ?? section.help}</p>
          <div className="bios-actions">
            <span className={`bios-action-key ${!activeRow?.onChange && !activeRow?.onNext ? 'disabled' : ''}`}>
              Select
            </span>
            <span className={`bios-action-key ${!activeRow?.onPrevious ? 'disabled' : ''}`}>
              PgUp
            </span>
            <span className={`bios-action-key ${!activeRow?.onNext ? 'disabled' : ''}`}>
              PgDn
            </span>
            <span className="bios-action-key">F5 Defaults</span>
            <span className="bios-action-key">F10 Save</span>
            <span className="bios-action-key">Esc Exit</span>
          </div>
        </footer>
      </section>
    </main>
  )
}
