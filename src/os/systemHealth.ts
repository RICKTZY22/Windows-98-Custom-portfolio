import type { BootMode, DriverType, FsState, MessageBoxRequest } from '../types'
import { baseName, normalizePath, REQUIRED_SYSTEM_FILES } from './filesystem'

export const ERR_DRIVER_NETWORK_MISSING = 'ERR_DRIVER_NETWORK_MISSING'
export const ERR_DRIVER_AUDIO_MISSING = 'ERR_DRIVER_AUDIO_MISSING'
export const ERR_DRIVER_VIDEO_MISSING = 'ERR_DRIVER_VIDEO_MISSING'
export const ERR_SYSTEM_FILE_MISSING = 'ERR_SYSTEM_FILE_MISSING'
export const ERR_BOOT_CRITICAL_MISSING = 'ERR_BOOT_CRITICAL_MISSING'

export const driverFileMap: Record<DriverType, string[]> = {
  network: [
    'C:\\Windows\\System32\\winsock.dll',
    'C:\\Windows\\System32\\wsock32.dll',
    'C:\\Windows\\System32\\netcfg.dll',
    'C:\\Windows\\System32\\Drivers\\ndis.vxd',
    'C:\\Windows\\System32\\Drivers\\tcpip.sys',
    'C:\\Windows\\System32\\Drivers\\el90xnd3.sys',
  ],
  audio: [
    'C:\\Windows\\System32\\sound.drv',
    'C:\\Windows\\System32\\wdmaud.drv',
    'C:\\Windows\\System32\\winmm.dll',
    'C:\\Windows\\System32\\dsound.dll',
    'C:\\Windows\\System32\\mmsystem.dll',
  ],
  video: [
    'C:\\Windows\\System32\\display.drv',
    'C:\\Windows\\System32\\gpu.vxd',
    'C:\\Windows\\System32\\ddraw.dll',
    'C:\\Windows\\System32\\Drivers\\vga.drv',
  ],
  input: [
    'C:\\Windows\\System32\\keyboard.drv',
    'C:\\Windows\\System32\\mouse.drv',
    'C:\\Windows\\System32\\Drivers\\mousehid.vxd',
  ],
  storage: [],
}

export const driverLabels: Record<DriverType, string> = {
  network: 'Network Drivers',
  audio: 'Audio Drivers',
  video: 'Video Drivers',
  input: 'Input Drivers',
  storage: 'Storage Drivers',
}

export const driverDeviceLabels: Record<DriverType, string> = {
  network: 'Network Adapter',
  audio: 'Sound Blaster 16',
  video: 'VGA Display',
  input: 'Keyboard / Mouse',
  storage: 'IDE Storage Controller',
}

export const driverErrorCodes: Record<DriverType, string> = {
  network: ERR_DRIVER_NETWORK_MISSING,
  audio: ERR_DRIVER_AUDIO_MISSING,
  video: ERR_DRIVER_VIDEO_MISSING,
  input: ERR_SYSTEM_FILE_MISSING,
  storage: ERR_SYSTEM_FILE_MISSING,
}

export type MissingDriver = {
  type: DriverType
  missing: string[]
}

export type VideoDriverHealthLevel = 'ok' | 'warning' | 'degraded' | 'unstable' | 'critical'

export type VideoDriverHealth = {
  type: 'video'
  level: VideoDriverHealthLevel
  missingCount: number
  totalFiles: number
  missingFiles: string[]
}

export type MissingHealthGroup = {
  id: 'criticalSystem' | DriverType
  label: string
  paths: string[]
}

export function missingCriticalSystemFiles(fs: FsState): string[] {
  return REQUIRED_SYSTEM_FILES.filter((path) => !fs.nodes[normalizePath(path)])
}

export function missingDriverFiles(fs: FsState, type: DriverType): string[] {
  return driverFileMap[type].filter((path) => !fs.nodes[normalizePath(path)])
}

export function missingDrivers(fs: FsState): Record<DriverType, string[]> {
  return {
    network: missingDriverFiles(fs, 'network'),
    audio: missingDriverFiles(fs, 'audio'),
    video: missingDriverFiles(fs, 'video'),
    input: missingDriverFiles(fs, 'input'),
    storage: missingDriverFiles(fs, 'storage'),
  }
}

function videoDriverLevelForMissingCount(count: number): VideoDriverHealthLevel {
  if (count <= 0) return 'ok'
  if (count === 1) return 'warning'
  if (count === 2) return 'degraded'
  if (count === 3) return 'unstable'
  return 'critical'
}

export function videoDriverHealth(fs: FsState): VideoDriverHealth {
  const missingFiles = missingDriverFiles(fs, 'video')
  return {
    type: 'video',
    level: videoDriverLevelForMissingCount(missingFiles.length),
    missingCount: missingFiles.length,
    totalFiles: driverFileMap.video.length,
    missingFiles,
  }
}

export function driverHealthy(fs: FsState, type: DriverType): boolean {
  if (type === 'video') {
    return videoDriverHealth(fs).missingCount < 2
  }
  return missingDriverFiles(fs, type).length === 0
}

// Safe Mode loads generic VGA / keyboard / mouse drivers, so video, input and
// storage always count as present there regardless of the installed driver files
// — that is what lets the desktop, Explorer and repair tools open in Safe Mode
// even when a driver was deleted. Network and audio stay file-gated (and are
// disabled in Safe Mode anyway).
export function effectiveDriverHealthy(fs: FsState, type: DriverType, bootMode: BootMode): boolean {
  if (bootMode === 'safe' && (type === 'video' || type === 'input' || type === 'storage')) {
    return true
  }
  return driverHealthy(fs, type)
}

export function requiredDriverMissing(fs: FsState, required: DriverType[] = []): MissingDriver | null {
  for (const type of required) {
    const missing = missingDriverFiles(fs, type)
    if (!driverHealthy(fs, type)) {
      return { type, missing }
    }
  }
  return null
}

export function classifyMissingFiles(fs: FsState): MissingHealthGroup[] {
  const missingCritical = missingCriticalSystemFiles(fs)
  const drivers = missingDrivers(fs)
  return [
    { id: 'criticalSystem', label: 'Core System Files', paths: missingCritical },
    { id: 'network', label: driverLabels.network, paths: drivers.network },
    { id: 'audio', label: driverLabels.audio, paths: drivers.audio },
    { id: 'video', label: driverLabels.video, paths: drivers.video },
    { id: 'input', label: driverLabels.input, paths: drivers.input },
  ]
}

export function missingSystemHealthGroups(fs: FsState): MissingHealthGroup[] {
  return classifyMissingFiles(fs).filter((group) => group.paths.length > 0)
}

export function driverStatusLabel(fs: FsState, type: DriverType): string {
  if (type === 'video') {
    const status: Record<VideoDriverHealthLevel, string> = {
      ok: 'OK',
      warning: 'Warning',
      degraded: 'Degraded',
      unstable: 'Unstable',
      critical: 'Critical',
    }
    return status[videoDriverHealth(fs).level]
  }
  return driverHealthy(fs, type) ? 'Detected' : 'Driver Missing'
}

export function systemStatusLabel(fs: FsState): string {
  const missing = missingCriticalSystemFiles(fs)
  if (missing.length >= 2) return `${missing.length} boot-critical files missing`
  if (missing.length === 1) return `Boot-critical file missing: ${baseName(missing[0])}`
  return 'Detected'
}

export function driverRecoveryHint(type: DriverType): string {
  return `Open BIOS Setup > Recovery Mode to restore the simulated ${driverDeviceLabels[
    type
  ].toLowerCase()} driver from the protected cache.`
}

export function driverFailureBox(
  type: DriverType,
  title = driverDeviceLabels[type],
  missing: string[] = [],
): Omit<MessageBoxRequest, 'id'> {
  const fileList = missing.length ? missing.map(baseName).join(', ') : 'driver package'
  if (type === 'video') {
    const level = videoDriverLevelForMissingCount(missing.length)
    const detailByLevel: Record<VideoDriverHealthLevel, string> = {
      ok: 'The simulated VGA driver stack is available.',
      warning: 'One simulated video driver file is missing. Standard VGA compatibility remains available.',
      degraded:
        'Two simulated video driver files are missing. Paint, image preview, video rendering, and display settings are disabled until Recovery restores the files.',
      unstable:
        'Three simulated video driver files are missing. The desktop display is unstable and visual apps remain disabled until Recovery restores the files.',
      critical:
        'The simulated video driver stack is critically incomplete. Normal boot cannot continue until Recovery restores the protected driver cache.',
    }
    return {
      title,
      message: `${title} cannot use this feature because the simulated video driver stack is ${level}.`,
      detail: `Missing: ${fileList}\n\n${detailByLevel[level]} ${driverRecoveryHint(type)}`,
      icon: level === 'warning' ? 'warning' : 'error',
      buttons: ['ok'],
      errorCode: driverErrorCodes[type],
      recoveryHint: driverRecoveryHint(type),
    }
  }
  return {
    title,
    message: `${title} cannot use this feature because a simulated ${type} driver is missing.`,
    detail: `${fileList} is unavailable inside the portfolio OS. ${driverRecoveryHint(type)}`,
    icon: 'error',
    buttons: ['ok'],
    errorCode: driverErrorCodes[type],
    recoveryHint: driverRecoveryHint(type),
  }
}
