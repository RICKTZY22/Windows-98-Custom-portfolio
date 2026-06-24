import type { BiosSettings, BootDeviceId } from '../types'

export const defaultBiosSettings: BiosSettings = {
  quickPost: false,
  floppyEnabled: true,
  cdromEnabled: true,
  networkBootEnabled: false,
  soundEnabled: true,
  virusWarning: true,
  pnpOsInstalled: true,
  resetConfigurationData: false,
  assignIrqForVga: true,
  cmosDate: '06/14/26',
  cmosTime: '09:42:47',
  displayMode: 'egaVga',
  powerManagement: 'userDefine',
  apmEnabled: true,
  videoOffMethod: 'vhSyncBlank',
  modemIrq: '3',
  softOffMode: 'instantOff',
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

export const displayModeLabels: Record<BiosSettings['displayMode'], string> = {
  egaVga: 'EGA/VGA',
  cga80: 'CGA 80',
  mono: 'Mono',
}

export const powerManagementLabels: Record<BiosSettings['powerManagement'], string> = {
  userDefine: 'User Define',
  maxSaving: 'Max Saving',
  minSaving: 'Min Saving',
  disabled: 'Disabled',
}

export const videoOffMethodLabels: Record<BiosSettings['videoOffMethod'], string> = {
  vhSyncBlank: 'V/H SYNC+Blank',
  blankScreen: 'Blank Screen',
  dpms: 'DPMS Support',
}

export const softOffModeLabels: Record<BiosSettings['softOffMode'], string> = {
  instantOff: 'Instant-Off',
  delay4Sec: 'Delay 4 Sec.',
}

export type BiosSetupSectionId =
  | 'standard'
  | 'features'
  | 'peripherals'
  | 'pnp'
  | 'systemHealth'
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
    id: 'pnp',
    title: 'PNP/PCI CONFIGURATION',
    help: 'View simulated PCI devices and reset browser-only driver configuration data.',
  },
  {
    id: 'systemHealth',
    title: 'SYSTEM HEALTH STATUS',
    help: 'Review protected core files and simulated portfolio OS driver status.',
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
