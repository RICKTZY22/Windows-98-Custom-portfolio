import type { DriverType, IconKey } from '../types'

// Single source of truth for the simulated machine spec. Mirrors the POST values
// shown in BootScreen.tsx (Pentium MMX 266MHz, VIRTUAL_DISK_98 2.1 GB, Award
// v4.51PG) so System Information, Device Manager, and MSConfig never disagree with
// the boot screen or BIOS setup.
// Memory map invariant: base + reserved + extended === total
//   640K conventional + 384K reserved (upper memory area) + 64,512K extended = 65,536K (64 MB)
export const MEMORY_TOTAL_KB = 65_536 // 64 MB, matches BootScreen MEM_TOTAL_KB

export const machineProfile = {
  osName: 'Microsoft Windows 98 Portfolio Edition',
  osVersion: '4.10.1998',
  oemId: 'JEM-W98P (browser simulation)',
  registeredOwner: 'John Erick Mendoza',
  systemModel: 'VX Pro+ 430VX PCI/ISA Portfolio System',
  systemType: 'X86-based PC',
  processor: 'Pentium(R) MMX 266MHz',
  biosVersion: 'Award Modular BIOS v4.51PG',
  biosDate: '06/14/1998',
  totalMemoryKb: MEMORY_TOTAL_KB,
  baseMemoryKb: 640,
  reservedMemoryKb: 384, // upper memory area (640K-1024K); base + reserved + extended === total
  extendedMemoryKb: 64_512,
  diskModel: 'VIRTUAL_DISK_98',
  diskSize: '2.1 GB',
  cdrom: 'PORTFOLIO CD-ROM 24X',
  floppy: '1.44M, 3.5 in.',
} as const

export function formatMemoryMb(kb: number): string {
  return `${Math.round(kb / 1024)} MB (${kb.toLocaleString('en-US')} KB) RAM`
}

// ---------- Device Manager tree ----------
export type DeviceDetail = { label: string; value: string }

export type DeviceNode = {
  name: string
  icon: IconKey
  // When present, the device's "working / not working" status is derived from
  // driverHealthy(fs, driver) so pulling a driver in Recovery flips the marker.
  driver?: DriverType
  manufacturer: string
  location: string
  details?: DeviceDetail[]
}

export type DeviceCategory = {
  id: string
  label: string
  icon: IconKey
  devices: DeviceNode[]
}

export const deviceCategories: DeviceCategory[] = [
  {
    id: 'cdrom',
    label: 'CDROM',
    icon: 'hardDrive',
    devices: [
      {
        name: 'ATAPI CD-ROM PORTFOLIO 24X',
        icon: 'hardDrive',
        manufacturer: '(Standard CD-ROM drives)',
        location: 'Secondary IDE controller (single fifo)',
      },
    ],
  },
  {
    id: 'disk',
    label: 'Disk drives',
    icon: 'hardDrive',
    devices: [
      {
        name: 'VIRTUAL_DISK_98',
        icon: 'hardDrive',
        driver: 'storage',
        manufacturer: '(Standard disk drives)',
        location: 'Primary IDE controller (dual fifo)',
        details: [{ label: 'Capacity', value: '2.1 GB' }],
      },
    ],
  },
  {
    id: 'display',
    label: 'Display adapters',
    icon: 'display',
    devices: [
      {
        name: 'S3 Trio64V+ PCI (732/733)',
        icon: 'display',
        driver: 'video',
        manufacturer: 'S3 Incorporated',
        location: 'PCI bus 0, device 10, function 0',
        details: [
          { label: 'Adapter RAM', value: '2 MB' },
          { label: 'Resolution', value: '800 x 600, 256 colors' },
        ],
      },
    ],
  },
  {
    id: 'floppy',
    label: 'Floppy disk controllers',
    icon: 'hardDrive',
    devices: [
      {
        name: 'Standard Floppy Disk Controller',
        icon: 'hardDrive',
        driver: 'storage',
        manufacturer: '(Standard floppy disk controllers)',
        location: 'ISA slot, IRQ 6, I/O 03F0-03F5',
      },
    ],
  },
  {
    id: 'keyboard',
    label: 'Keyboard',
    icon: 'keyboard',
    devices: [
      {
        name: 'Standard 101/102-Key or Microsoft Natural Keyboard',
        icon: 'keyboard',
        driver: 'input',
        manufacturer: '(Standard keyboards)',
        location: 'IRQ 1, I/O 0060',
      },
    ],
  },
  {
    id: 'monitor',
    label: 'Monitor',
    icon: 'display',
    devices: [
      {
        name: 'Default Monitor (Plug and Play)',
        icon: 'display',
        manufacturer: '(Standard monitor types)',
        location: 'Plug and Play Monitor',
      },
    ],
  },
  {
    id: 'mouse',
    label: 'Mouse',
    icon: 'mouse',
    devices: [
      {
        name: 'PS/2 Compatible Mouse Port',
        icon: 'mouse',
        driver: 'input',
        manufacturer: '(Standard mouse types)',
        location: 'IRQ 12',
      },
    ],
  },
  {
    id: 'network',
    label: 'Network adapters',
    icon: 'network',
    devices: [
      {
        name: 'PCI Fast Ethernet DEC 21140',
        icon: 'network',
        driver: 'network',
        manufacturer: 'Digital Equipment Corporation',
        location: 'PCI bus 0, device 11, function 0',
        details: [{ label: 'Link speed', value: '100 Mbps full duplex' }],
      },
    ],
  },
  {
    id: 'ports',
    label: 'Ports (COM & LPT)',
    icon: 'gears',
    devices: [
      {
        name: 'Communications Port (COM1)',
        icon: 'gears',
        manufacturer: '(Standard port types)',
        location: 'IRQ 4, I/O 03F8',
      },
      {
        name: 'Printer Port (LPT1)',
        icon: 'printer',
        manufacturer: '(Standard port types)',
        location: 'IRQ 7, I/O 0378',
      },
    ],
  },
  {
    id: 'sound',
    label: 'Sound, video and game controllers',
    icon: 'soundRecorder',
    devices: [
      {
        name: 'Sound Blaster 16 or AWE-32',
        icon: 'soundRecorder',
        driver: 'audio',
        manufacturer: 'Creative Technology Ltd.',
        location: 'IRQ 5, I/O 0220, DMA 1',
      },
      {
        name: 'Gameport Joystick',
        icon: 'gears',
        manufacturer: '(Standard game port)',
        location: 'I/O 0200',
      },
    ],
  },
  {
    id: 'system',
    label: 'System devices',
    icon: 'gears',
    devices: [
      {
        name: 'Plug and Play BIOS',
        icon: 'gears',
        manufacturer: '(Standard system devices)',
        location: 'On main system board',
      },
      {
        name: 'PCI bus',
        icon: 'gears',
        manufacturer: 'Intel Corporation',
        location: 'On main system board',
      },
      {
        name: 'System board',
        icon: 'gears',
        manufacturer: '(Standard system devices)',
        location: 'On main system board',
      },
      {
        name: 'Programmable interrupt controller',
        icon: 'gears',
        manufacturer: '(Standard system devices)',
        location: 'IRQ 2',
      },
    ],
  },
]

// ---------- MSConfig / startup ----------
export type StartupItem = {
  name: string
  command: string
  location: string
  enabledByDefault: boolean
}

// Authentic Win98 startup entries, plus two themed portfolio entries.
export const startupItems: StartupItem[] = [
  {
    name: 'ScanRegistry',
    command: 'C:\\WINDOWS\\scanregw.exe /autorun',
    location: 'HKLM\\Software\\Microsoft\\Windows\\CurrentVersion\\Run',
    enabledByDefault: true,
  },
  {
    name: 'TaskMonitor',
    command: 'C:\\WINDOWS\\taskmon.exe',
    location: 'HKLM\\Software\\Microsoft\\Windows\\CurrentVersion\\Run',
    enabledByDefault: true,
  },
  {
    name: 'SystemTray',
    command: 'SysTray.Exe',
    location: 'HKLM\\Software\\Microsoft\\Windows\\CurrentVersion\\Run',
    enabledByDefault: true,
  },
  {
    name: 'LoadPowerProfile',
    command: 'Rundll32.exe powrprof.dll,LoadCurrentPwrScheme',
    location: 'HKLM\\Software\\Microsoft\\Windows\\CurrentVersion\\Run',
    enabledByDefault: true,
  },
  {
    name: 'Antivirus 98',
    command: 'C:\\Program Files\\Antivirus98\\av98.exe /min',
    location: 'Startup',
    enabledByDefault: true,
  },
  {
    name: 'PortfolioTray',
    command: 'C:\\WINDOWS\\portfolio.exe /tray',
    location: 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run',
    enabledByDefault: false,
  },
]

export type StartupSelection = 'normal' | 'diagnostic' | 'selective'

export const selectiveStartupOptions = [
  'Process Config.sys file',
  'Process Autoexec.bat file',
  'Process System.ini file',
  'Process Win.ini file',
  'Load startup group items',
] as const

// Read-only sample contents for the MSConfig file tabs (Config.sys, Autoexec.bat,
// System.ini, Win.ini). Browser-only mock — these files are not really parsed.
export const configFileSamples: Record<string, string[]> = {
  'Config.sys': [
    'DEVICE=C:\\WINDOWS\\HIMEM.SYS',
    'DEVICE=C:\\WINDOWS\\EMM386.EXE NOEMS',
    'DOS=HIGH,UMB',
    'FILES=60',
    'BUFFERS=30',
    'DEVICEHIGH=C:\\WINDOWS\\COMMAND\\DISPLAY.SYS CON=(EGA,,1)',
  ],
  'Autoexec.bat': [
    '@ECHO OFF',
    'PATH=C:\\WINDOWS;C:\\WINDOWS\\COMMAND',
    'SET TEMP=C:\\WINDOWS\\TEMP',
    'SET PROMPT=$P$G',
    'C:\\WINDOWS\\COMMAND\\MSCDEX.EXE /D:MSCD001',
    'LH C:\\WINDOWS\\COMMAND\\DOSKEY',
  ],
  'System.ini': [
    '[boot]',
    'shell=Explorer.exe',
    'system.drv=system.drv',
    'drivers=mmsystem.dll power.drv',
    '[386Enh]',
    'mouse=*vmouse, msmouse.vxd',
    'device=*dynapage',
  ],
  'Win.ini': [
    '[windows]',
    'load=',
    'run=',
    'NullPort=None',
    '[Desktop]',
    'Wallpaper=(None)',
    'TileWallpaper=0',
  ],
}
