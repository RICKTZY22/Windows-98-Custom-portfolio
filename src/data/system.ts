import type { ControlPanelSectionId, IconKey } from '../types'

/** Credits shown on boot, shutdown, and the recovery program. */
export const osCreditName = 'John Erick Mendoza'
export const osCreditYear = '2026'
export const osProductName = 'Windows 98 Portfolio Edition'
export const osCreditLine = `(C)Copyright ${osCreditName} ${osCreditYear}`

/** Microsoft-style startup menu shown after a crash / failed boot. */
export const bootMenuTitle = 'Windows 98 Portfolio Edition Startup Menu'
export const bootMenuOptions: Array<{ id: 'normal' | 'safe' | 'dos' | 'recovery'; label: string }> = [
  { id: 'normal', label: 'Normal' },
  { id: 'safe', label: 'Safe mode' },
  { id: 'dos', label: 'Command prompt only' },
]
export const bootMenuUnhealthyWarning =
  'Warning: Windows did not finish loading on the previous attempt. Required system files are missing. Restart, press F12, and open Recovery Mode from BIOS Setup.'

/** Lines for the shutdown screen. */
export const shutdownLines: string[] = ["It's now safe to turn off", 'your computer.']

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
