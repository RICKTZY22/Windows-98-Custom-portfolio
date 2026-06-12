import type { ControlPanelSectionId, IconKey, NetworkStatus } from '../types'

export const bootSteps = [
  'Award Modular BIOS v4.51PG',
  'Memory Test: 65536K OK',
  'Detecting Primary Master: VIRTUAL_DISK_98',
  'Detecting Mouse: PS/2 Compatible Mouse',
  'Detecting Network Adapter: PCI Ethernet DEC 21140',
  'HIMEM.SYS: Extended memory driver installed',
  'Loading C:\\WINDOWS\\SYSTEM\\VMM32.VXD',
  'Starting Windows 98 Portfolio Shell',
]

export const defaultNetworkStatus: NetworkStatus = {
  connected: true,
  adapterName: 'PCI Fast Ethernet DEC 21140',
  ipAddress: '192.168.98.23',
  subnetMask: '255.255.255.0',
  gateway: '192.168.98.1',
  dns: '1.1.1.1',
  packetsSent: 128,
  packetsReceived: 256,
  lastPing: 'portfolio.local',
}

export const controlPanelSections: Array<{
  id: ControlPanelSectionId
  title: string
  icon: IconKey
  description: string
  rows: Array<[string, string]>
}> = [
  {
    id: 'display',
    title: 'Display',
    icon: 'display',
    description: 'Desktop appearance, wallpaper, colors, and simulated video acceleration.',
    rows: [
      ['Resolution', '1024 by 768 pixels'],
      ['Color palette', 'High Color (16 bit)'],
      ['Acceleration', 'Full browser transform acceleration'],
    ],
  },
  {
    id: 'mouse',
    title: 'Mouse',
    icon: 'mouse',
    description: 'Pointer scheme and double-click behavior.',
    rows: [
      ['Scheme', 'Windows Standard'],
      ['Pointer speed', 'Medium'],
      ['Indicators', 'Default, busy, text, move, resize, link'],
    ],
  },
  {
    id: 'keyboard',
    title: 'Keyboard',
    icon: 'keyboard',
    description: 'Keyboard repeat and shell shortcuts.',
    rows: [
      ['Repeat delay', 'Short'],
      ['Repeat rate', 'Fast'],
      ['Shortcuts', 'Enter opens icons, Alt+Tab cycles windows, Escape closes menus'],
    ],
  },
  {
    id: 'datetime',
    title: 'Date/Time',
    icon: 'dateTime',
    description: 'System clock is synced to your browser.',
    rows: [
      ['Time zone', 'Browser local time'],
      ['Format', 'Windows 98 style taskbar clock'],
      ['Source', 'Client device'],
    ],
  },
  {
    id: 'network',
    title: 'Network',
    icon: 'network',
    description: 'Simulated Ethernet adapter and TCP/IP settings.',
    rows: [
      ['Adapter', defaultNetworkStatus.adapterName],
      ['IP address', defaultNetworkStatus.ipAddress],
      ['Gateway', defaultNetworkStatus.gateway],
    ],
  },
  {
    id: 'printers',
    title: 'Printers',
    icon: 'printer',
    description: 'Printer devices are placeholders for the portfolio OS.',
    rows: [
      ['Default printer', 'Portfolio Writer 98'],
      ['Status', 'Ready'],
      ['Queue', '0 document(s)'],
    ],
  },
  {
    id: 'system',
    title: 'System',
    icon: 'gears',
    description: 'System information for the simulated environment.',
    rows: [
      ['Operating system', 'Windows 98 Portfolio Edition'],
      ['Registered to', 'Erick'],
      ['Memory', '64 MB simulated RAM'],
    ],
  },
]
