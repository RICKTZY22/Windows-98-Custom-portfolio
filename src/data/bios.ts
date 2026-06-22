import type { BiosSettings, BootDeviceId } from '../types'

export const defaultBiosSettings: BiosSettings = {
  quickPost: false,
  floppyEnabled: true,
  cdromEnabled: true,
  networkBootEnabled: false,
  soundEnabled: true,
  virusWarning: true,
  haltOn: 'allButKeyboard',
  bootOrder: ['hardDisk', 'cdrom', 'floppy', 'network'],
}

export const bootDeviceLabels: Record<BootDeviceId, string> = {
  hardDisk: 'IDE-0  VIRTUAL_DISK_98',
  cdrom: 'ATAPI CD-ROM  PORTFOLIO_24X',
  floppy: 'Floppy Drive A: 1.44M',
  network: 'PCI Ethernet Boot ROM',
}

export const haltOnLabels: Record<BiosSettings['haltOn'], string> = {
  allErrors: 'All Errors',
  noErrors: 'No Errors',
  allButKeyboard: 'All, But Keyboard',
}

export type BiosSetupSectionId =
  | 'standard'
  | 'features'
  | 'peripherals'
  | 'boot'
  | 'power'
  | 'recovery'
  | 'defaults'
  | 'save'
  | 'exit'

export const biosSetupSections: Array<{
  id: BiosSetupSectionId
  title: string
  help: string
}> = [
  {
    id: 'standard',
    title: 'STANDARD CMOS SETUP',
    help: 'Basic date, memory, drive, and display information detected by the browser PC.',
  },
  {
    id: 'features',
    title: 'BIOS FEATURES SETUP',
    help: 'Boot speed, virus warning, halt behavior, and keyboard startup options.',
  },
  {
    id: 'peripherals',
    title: 'INTEGRATED PERIPHERALS',
    help: 'Enable or disable simulated floppy, CD-ROM, sound, and Ethernet boot ROM devices.',
  },
  {
    id: 'boot',
    title: 'BOOT SEQUENCE',
    help: 'Choose the device order used by POST before Windows starts.',
  },
  {
    id: 'power',
    title: 'POWER MANAGEMENT SETUP',
    help: 'Legacy APM-style power status for the simulated portfolio computer.',
  },
  {
    id: 'recovery',
    title: 'RECOVERY MODE',
    help: 'Start Windows Recovery Mode to repair missing protected system files.',
  },
  {
    id: 'defaults',
    title: 'LOAD SETUP DEFAULTS',
    help: 'Restore stable Award-style defaults for the portfolio machine.',
  },
  {
    id: 'save',
    title: 'SAVE & EXIT SETUP',
    help: 'Write CMOS settings and restart from the fixed disk.',
  },
  {
    id: 'exit',
    title: 'EXIT WITHOUT SAVING',
    help: 'Leave setup and restart without changing CMOS settings.',
  },
]

export function enabledBootDevices(settings: BiosSettings): BootDeviceId[] {
  return settings.bootOrder.filter((device) => {
    if (device === 'floppy') return settings.floppyEnabled
    if (device === 'cdrom') return settings.cdromEnabled
    if (device === 'network') return settings.networkBootEnabled
    return true
  })
}

export function normalizeBootOrder(order: BootDeviceId[]): BootDeviceId[] {
  const devices: BootDeviceId[] = ['hardDisk', 'cdrom', 'floppy', 'network']
  const unique = order.filter((device, index) => devices.includes(device) && order.indexOf(device) === index)
  return [...unique, ...devices.filter((device) => !unique.includes(device))]
}

export function bootSequenceLabel(settings: BiosSettings): string {
  return normalizeBootOrder(settings.bootOrder)
    .map((device) => {
      if (device === 'hardDisk') return 'C'
      if (device === 'cdrom') return 'CDROM'
      if (device === 'floppy') return 'A'
      return 'LAN'
    })
    .join(', ')
}

export function moveBootDevice(order: BootDeviceId[], device: BootDeviceId, direction: -1 | 1): BootDeviceId[] {
  const normalized = normalizeBootOrder(order)
  const index = normalized.indexOf(device)
  const nextIndex = index + direction
  if (index < 0 || nextIndex < 0 || nextIndex >= normalized.length) {
    return normalized
  }
  const next = [...normalized]
  const temp = next[index]
  next[index] = next[nextIndex]
  next[nextIndex] = temp
  return next
}
