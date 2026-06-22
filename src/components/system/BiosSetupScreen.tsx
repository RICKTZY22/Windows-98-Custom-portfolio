import { useEffect, useMemo, useState } from 'react'
import type { BiosSettings, BootDeviceId } from '../../types'
import { biosSetupSections, bootDeviceLabels, bootSequenceLabel, defaultBiosSettings, haltOnLabels, moveBootDevice } from '../../data/bios'
import { useOs } from '../../os/useOs'

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

function bootDeviceEnabled(settings: BiosSettings, device: BootDeviceId): boolean {
  if (device === 'floppy') return settings.floppyEnabled
  if (device === 'cdrom') return settings.cdromEnabled
  if (device === 'network') return settings.networkBootEnabled
  return true
}

export function BiosSetupScreen() {
  const { state, setBiosSettings, restart } = useOs()
  const [draft, setDraft] = useState<BiosSettings>(state.bios)
  const [sectionIndex, setSectionIndex] = useState(0)
  const [rowIndex, setRowIndex] = useState(0)
  const section = biosSetupSections[sectionIndex]

  const rows = useMemo<BiosRow[]>(() => {
    const toggle = (key: keyof Pick<
      BiosSettings,
      'quickPost' | 'floppyEnabled' | 'cdromEnabled' | 'networkBootEnabled' | 'soundEnabled' | 'virusWarning'
    >) => {
      setDraft((current) => ({ ...current, [key]: !current[key] }))
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
        { label: 'Date (mm:dd:yy)', value: '06/14/26' },
        { label: 'Time (hh:mm:ss)', value: new Date().toLocaleTimeString('en-US', { hour12: false }) },
        { label: 'Primary Master', value: 'VIRTUAL_DISK_98 2.1GB' },
        { label: 'Primary Slave', value: 'None' },
        { label: 'Secondary Master', value: draft.cdromEnabled ? 'PORTFOLIO CD-ROM 24X' : 'None' },
        { label: 'Drive A', value: draft.floppyEnabled ? '1.44M, 3.5 in.' : 'None' },
        { label: 'Base Memory', value: '640K' },
        { label: 'Extended Memory', value: '64512K' },
        { label: 'Display', value: 'EGA/VGA' },
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
      return [
        { label: 'Onboard IDE-1 Controller', value: 'Enabled' },
        { label: 'Onboard IDE-2 Controller', value: yesNo(draft.cdromEnabled), onChange: () => toggle('cdromEnabled') },
        { label: 'Onboard FDC Controller', value: yesNo(draft.floppyEnabled), onChange: () => toggle('floppyEnabled') },
        { label: 'Onboard Serial Port 1', value: '3F8/IRQ4' },
        { label: 'Onboard Parallel Port', value: '378/IRQ7' },
        { label: 'Sound Blaster 16', value: yesNo(draft.soundEnabled), onChange: () => toggle('soundEnabled') },
        { label: 'PCI Ethernet Boot ROM', value: yesNo(draft.networkBootEnabled), onChange: () => toggle('networkBootEnabled') },
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
        { label: 'Power Management', value: 'User Define' },
        { label: 'PM Control by APM', value: 'Yes' },
        { label: 'Video Off Method', value: 'V/H SYNC+Blank' },
        { label: 'MODEM Use IRQ', value: '3' },
        { label: 'Soft-Off by PWR-BTTN', value: 'Instant-Off' },
        { label: 'Resume by LAN', value: draft.networkBootEnabled ? 'Enabled' : 'Disabled' },
      ]
    }

    if (section.id === 'defaults') {
      return [{ label: 'Load stable defaults', value: 'Press Enter or click Load Defaults', onChange: () => setDraft(defaultBiosSettings) }]
    }

    if (section.id === 'save') {
      return [{ label: 'Save to CMOS and exit', value: 'Press Enter or F10', onChange: () => saveAndExit() }]
    }

    return [{ label: 'Exit setup', value: 'Press Enter or Esc', onChange: () => restart('normal', { bootProfile: 'warm' }) }]
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft, restart, section.id])

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

  return (
    <main className="bios-setup-screen" aria-label="Award BIOS setup utility">
      <section className="bios-frame">
        <header className="bios-title">CMOS Setup Utility - Award Software</header>
        <div className="bios-main">
          <nav className="bios-section-list" aria-label="BIOS setup sections">
            {biosSetupSections.map((item, index) => (
              <button
                key={item.id}
                type="button"
                className={sectionIndex === index ? 'selected' : ''}
                onClick={() => {
                  setSectionIndex(index)
                  setRowIndex(0)
                }}
              >
                {item.title}
              </button>
            ))}
          </nav>
          <section className="bios-detail" aria-label={section.title}>
            <h1>{section.title}</h1>
            <div className="bios-table">
              {rows.map((row, index) => (
                <button
                  key={`${row.label}-${index}`}
                  type="button"
                  className={`bios-row ${safeRowIndex === index ? 'selected' : ''}`}
                  onClick={() => setRowIndex(index)}
                  onDoubleClick={() => changeCurrentRow()}
                >
                  <span>{row.label}</span>
                  <strong>{row.value}</strong>
                </button>
              ))}
            </div>
          </section>
        </div>
        <footer className="bios-help">
          <p>{activeRow?.hint ?? section.help}</p>
          <div className="bios-actions">
            <button type="button" onClick={() => changeCurrentRow()} disabled={!activeRow?.onChange && !activeRow?.onNext}>
              Enter: Select
            </button>
            <button type="button" onClick={() => changeCurrentRow(-1)} disabled={!activeRow?.onPrevious}>
              PgUp
            </button>
            <button type="button" onClick={() => changeCurrentRow(1)} disabled={!activeRow?.onNext}>
              PgDn
            </button>
            <button type="button" onClick={() => setDraft(defaultBiosSettings)}>
              F5 Defaults
            </button>
            <button type="button" onClick={saveAndExit}>
              F10 Save
            </button>
            <button type="button" onClick={() => restart('normal', { bootProfile: 'warm' })}>
              Esc Exit
            </button>
          </div>
        </footer>
      </section>
    </main>
  )
}
