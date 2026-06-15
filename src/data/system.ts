import type { ControlPanelSectionId, IconKey } from '../types'

/** Credits shown on boot, shutdown, and the recovery program. */
export const osCreditName = 'John Erick Mendoza'
export const osCreditYear = '2026'
export const osProductName = 'Windows 98 Portfolio Edition'
export const osCreditLine = `(C)Copyright ${osCreditName} ${osCreditYear}`

/** BIOS POST lines shown before any Windows boot. */
export const biosLines: string[] = [
  'Award Modular BIOS v4.51PG, An Energy Star Ally',
  `Copyright (C) 1983-${osCreditYear}, ${osCreditName}`,
  '',
  'Portfolio Edition BIOS Date 06/13/26',
  '',
  'PENTIUM II-MMX CPU at 266MHz',
  'CPU Clock       : 266MHz',
  'L2 Cache        : 512K Pipeline Burst',
  'Memory Test     :  65536K OK',
  'Extended Memory :  64512K OK',
  'Keyboard Detected: 101/102-Key PS/2',
  'CMOS Checksum    : OK',
  'System BIOS Shadowed',
  'Video BIOS Shadowed',
  '',
  'Award Plug and Play BIOS Extension v1.0A',
  'Detecting Primary Master   ... VIRTUAL_DISK_98 2.1GB',
  'Detecting Primary Slave    ... None',
  'Detecting Secondary Master ... PORTFOLIO CD-ROM 24X',
  'Detecting Floppy Drive A   ... 1.44M, 3.5 in.',
  'Detecting Mouse            ... PS/2 Compatible Mouse',
  'Detecting Display Adapter  ... S3 Trio64V+ PCI',
  'Detecting Sound Adapter    ... Sound Blaster 16',
  'Detecting Network Adapter  ... PCI Ethernet DEC 21140',
  'Checking NVRAM             ... Update OK',
  '',
  'Verifying DMI Pool Data ........',
  'Press DEL to enter SETUP, F8 for Startup Menu, F12 for Boot Menu',
]

export const bootDeviceOptions = [
  {
    id: 1,
    label: 'Start Windows 98 Portfolio Edition from hard disk.',
    device: 'C:',
    status: 'Fixed disk C: ready',
  },
  {
    id: 2,
    label: 'Start computer with CD-ROM support.',
    device: 'CD-ROM',
    status: 'Connecting ATAPI CD-ROM device OEMCD001',
  },
  {
    id: 3,
    label: 'Start computer with floppy drive support.',
    device: 'A:',
    status: 'Connecting floppy drive A:',
  },
] as const

export type BootDeviceOption = (typeof bootDeviceOptions)[number]

export function bootDriverLines(option: BootDeviceOption): string[] {
  const shared = [
    option.status,
    '',
    'AIC-6260/6360/6370 ASPI Manager for DOS',
    'Version 3.68S',
    'Copyright 1990-1997 Adaptec, Inc.',
    '',
    'AIC-78XX/AIC-75XX ASPI Manager for DOS',
    'Version 1.32S',
    'Copyright 1994-1997 Adaptec, Inc.',
    '',
    'PCI bus scan complete.',
  ]

  if (option.device === 'CD-ROM') {
    return [
      'This driver is provided by Oak Technology, Inc.',
      'OTI-91X ATAPI CD-ROM device driver, Rev D91XV352',
      '(C)Copyright Oak Technology Inc. 1987-1997',
      '  Device Name       : OEMCD001',
      '  Transfer Mode     : Programmed I/O',
      '  Number of drives  : 1',
      '',
      'No bootable CD-ROM was found in drive D:.',
      'Continuing startup from fixed disk C:.',
      '',
      ...shared,
    ]
  }

  if (option.device === 'A:') {
    return [
      'Floppy disk controller initialized',
      'Drive A: 1.44M media support loaded',
      'Insert system diskette if requested.',
      'No system diskette was found in drive A:.',
      'Continuing startup from fixed disk C:.',
      '',
      ...shared,
    ]
  }

  return ['Fixed disk boot selected.', 'Loading master boot record from VIRTUAL_DISK_98...', '', ...shared]
}

/** Lines streamed during a normal Windows 98 boot. */
export const bootLinesNormal: string[] = [
  `Starting ${osProductName}...`,
  '',
  'HIMEM is testing extended memory... done.',
  'HIMEM.SYS: Extended memory driver installed',
  'SET BLASTER=A220 I5 D1 H5 P330 T6',
  'Loading C:\\WINDOWS\\COMMAND\\MSCDEX.EXE /D:OEMCD001',
  'Loading C:\\WINDOWS\\SYSTEM\\VMM32.VXD',
  'Loading C:\\WINDOWS\\SYSTEM\\IOSUBSYS\\ESDI_506.PDR',
  'Loading network drivers: NDIS.VXD TCPIP.SYS',
  'Checking registry: rb000.cab',
  'Loading fonts and color schemes',
  'Initializing display driver: DISPLAY.DRV',
  'Starting Portfolio Explorer shell',
]

/** Lines streamed during a safe-mode boot. */
export const bootLinesSafe: string[] = [
  `Starting ${osProductName} in Safe Mode...`,
  '',
  'HIMEM.SYS: Extended memory driver installed',
  'Loading minimal VxD set: VMM32.VXD',
  'Skipping AUTOEXEC.BAT and CONFIG.SYS processing',
  'Bypassing startup group and network logon',
  'Loading standard VGA display driver (640x480, 16 colors)',
  'Network support is disabled in Safe Mode',
  'Starting Portfolio Explorer shell (Safe Mode)',
]

/** Lines streamed when a normal boot fails because system files are missing. */
export const bootLinesFailed: string[] = [
  `Starting ${osProductName}...`,
  '',
  'HIMEM is testing extended memory... done.',
  'Loading C:\\WINDOWS\\SYSTEM\\VMM32.VXD',
  '',
  'Windows protection error.  A required system file is missing',
  'or has been moved to the Recycle Bin.',
  '',
  'You need to restart your computer.',
]

export const bootSequences: Record<'normal' | 'safe' | 'failed', string[]> = {
  normal: bootLinesNormal,
  safe: bootLinesSafe,
  failed: bootLinesFailed,
}

/** Microsoft-style startup menu shown after a crash / failed boot. */
export const bootMenuTitle = 'Windows 98 Portfolio Edition Startup Menu'
export const bootMenuOptions: Array<{ id: 'normal' | 'safe' | 'dos' | 'recovery'; label: string }> = [
  { id: 'normal', label: 'Normal' },
  { id: 'safe', label: 'Safe mode' },
  { id: 'dos', label: 'Command prompt only' },
  { id: 'recovery', label: 'Recovery Console (Registry Checker)' },
]
export const bootMenuUnhealthyWarning =
  'Warning: Windows did not finish loading on the previous attempt. Required system files are missing. Choose Safe mode, Command prompt only, or the Recovery Console to repair your computer.'

/** Lines for the shutdown screen. */
export const shutdownLines: string[] = ['It is now safe to turn off', 'your computer.']

/** Kept for the Control Panel app: section metadata. */
export const controlPanelSections: Array<{
  id: ControlPanelSectionId
  title: string
  icon: IconKey
  description: string
}> = [
  { id: 'display', title: 'Display', icon: 'display', description: 'Themes, wallpaper, and appearance.' },
  { id: 'mouse', title: 'Mouse', icon: 'mouse', description: 'Pointer schemes and click behavior.' },
  { id: 'keyboard', title: 'Keyboard', icon: 'keyboard', description: 'Repeat rate and shell shortcuts.' },
  { id: 'datetime', title: 'Date/Time', icon: 'dateTime', description: 'System clock synced to your browser.' },
  { id: 'network', title: 'Network', icon: 'network', description: 'Adapter and TCP/IP settings.' },
  { id: 'sounds', title: 'Sounds', icon: 'soundRecorder', description: 'System event sounds and volume.' },
  { id: 'system', title: 'System', icon: 'gears', description: 'System information and device status.' },
  {
    id: 'addremove',
    title: 'Add/Remove Programs',
    icon: 'programGroup',
    description: 'Installed portfolio applications.',
  },
  { id: 'printers', title: 'Printers', icon: 'printer', description: 'Simulated print devices.' },
]
