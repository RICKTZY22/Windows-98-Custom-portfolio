import { useEffect, useState } from 'react'
import type { BootDeviceId } from '../../types'
import { bootDeviceDosNames, bootDeviceLabels, bootDeviceShortLabels, bootSequenceLabel, enabledBootDevices } from '../../data/bios'
import { osProductName } from '../../data/system'
import { useOs } from '../../os/useOs'

export function BootDeviceQuickMenu() {
  const { state, restart } = useOs()
  const [selected, setSelected] = useState(() => Math.max(0, state.bios.bootOrder.indexOf('hardDisk')))
  const [attemptLines, setAttemptLines] = useState<string[]>([])
  const enabledDevices = enabledBootDevices(state.bios)
  const devices = state.bios.bootOrder

  function chooseDevice(index: number) {
    const device = devices[index]
    if (!device) return
    if (!enabledDevices.includes(device)) {
      setAttemptLines([
        `${bootDeviceLabels[device]} is disabled in CMOS Setup.`,
        'Press Del during POST to enable this device.',
      ])
      return
    }
    if (device === 'hardDisk') {
      restart('normal', { bootProfile: 'warm' })
      return
    }

    const lines: Record<Exclude<BootDeviceId, 'hardDisk'>, string[]> = {
      cdrom: [
        'Boot from ATAPI CD-ROM...',
        'No bootable El Torito image was found in drive D:.',
        'Continuing startup from fixed disk C:.',
      ],
      floppy: [
        'Searching for boot record from Floppy...',
        'Drive A: does not contain a system diskette.',
        'Continuing startup from fixed disk C:.',
      ],
      network: [
        'PXE-M0F: Exiting PCI Ethernet Boot ROM.',
        'PXE-E61: Media test failure, check cable.',
        'Continuing startup from fixed disk C:.',
      ],
    }
    setAttemptLines(lines[device])
    window.setTimeout(() => restart('normal', { bootProfile: 'warm' }), 1900)
  }

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault()
        restart('normal', { bootProfile: 'warm' })
        return
      }
      if (event.key === 'ArrowDown') {
        event.preventDefault()
        setSelected((current) => (current + 1) % devices.length)
        return
      }
      if (event.key === 'ArrowUp') {
        event.preventDefault()
        setSelected((current) => (current - 1 + devices.length) % devices.length)
        return
      }
      if (event.key >= '1' && event.key <= String(devices.length)) {
        const next = Number(event.key) - 1
        setSelected(next)
        chooseDevice(next)
        return
      }
      if (event.key === 'Enter') {
        event.preventDefault()
        chooseDevice(selected)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [devices, restart, selected])

  return (
    <main className="boot-device-quick-screen">
      <section className="boot-device-quick-panel">
        <h1>{osProductName} Boot Device Menu</h1>
        <p>Use arrow keys to select a startup device, then press Enter.</p>
        <ol>
          {devices.map((device, index) => {
            const available = enabledDevices.includes(device)
            return (
              <li key={device}>
                <button
                  type="button"
                  className={selected === index ? 'selected' : ''}
                  onMouseEnter={() => setSelected(index)}
                  onClick={() => chooseDevice(index)}
                >
                  {index + 1}. {bootDeviceShortLabels[device]} ({bootDeviceDosNames[device]}){' '}
                  <span>{available ? bootDeviceLabels[device] : 'Disabled in CMOS'}</span>
                </button>
              </li>
            )
          })}
        </ol>
        <p className="boot-muted">Boot sequence: {bootSequenceLabel(state.bios)}</p>
        {attemptLines.length > 0 && <pre>{attemptLines.join('\n')}</pre>}
        <p className="boot-muted">Esc: normal startup from fixed disk</p>
      </section>
    </main>
  )
}
