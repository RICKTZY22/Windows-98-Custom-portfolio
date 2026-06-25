import type { CursorSchemeId, DriverType, WallpaperMode } from '../types'

export type RegistryValueType = 'REG_SZ' | 'REG_DWORD' | 'REG_BINARY'

export type RegistryValue = Readonly<{
  name: string
  type: RegistryValueType
  data: string
}>

export type RegistryKey = Readonly<{
  name: string
  path: string
  values: readonly RegistryValue[]
  children?: readonly RegistryKey[]
}>

export type RegistrySnapshotInput = Readonly<{
  themeId: string
  wallpaperId: string
  wallpaperMode: WallpaperMode
  cursorScheme: CursorSchemeId
  audioEnabled: boolean
  audioMuted: boolean
  audioVolume: number
  networkConnected: boolean
  ipAddress: string
  quickPost: boolean
  bootOrder: string
  driverStatus: Record<DriverType, string>
}>

const defaultValue: RegistryValue = { name: '(Default)', type: 'REG_SZ', data: '(value not set)' }

function key(name: string, path: string, values: readonly RegistryValue[] = [defaultValue], children: readonly RegistryKey[] = []): RegistryKey {
  return { name, path, values, children }
}

function text(name: string, data: string): RegistryValue {
  return { name, type: 'REG_SZ', data }
}

function dword(name: string, enabled: boolean | number): RegistryValue {
  const value = typeof enabled === 'boolean' ? (enabled ? 1 : 0) : enabled
  return { name, type: 'REG_DWORD', data: `0x${value.toString(16).padStart(8, '0')} (${value})` }
}

export function createRegistrySnapshot(input: RegistrySnapshotInput): readonly RegistryKey[] {
  return [
    key('HKEY_CLASSES_ROOT', 'HKEY_CLASSES_ROOT', [defaultValue], [
      key('.txt', 'HKEY_CLASSES_ROOT\\.txt', [text('(Default)', 'txtfile'), text('Content Type', 'text/plain')]),
      key('.bmp', 'HKEY_CLASSES_ROOT\\.bmp', [text('(Default)', 'Paint.Picture'), text('Content Type', 'image/bmp')]),
      key('lnkfile', 'HKEY_CLASSES_ROOT\\lnkfile', [defaultValue, dword('IsShortcut', 1)]),
    ]),
    key('HKEY_CURRENT_USER', 'HKEY_CURRENT_USER', [defaultValue], [
      key('Control Panel', 'HKEY_CURRENT_USER\\Control Panel', [defaultValue], [
        key('Desktop', 'HKEY_CURRENT_USER\\Control Panel\\Desktop', [
          text('Theme', input.themeId),
          text('Wallpaper', input.wallpaperId),
          text('WallpaperStyle', input.wallpaperMode),
          text('TileWallpaper', input.wallpaperMode === 'tile' ? '1' : '0'),
          text('MenuShowDelay', '400'),
        ]),
        key('Mouse', 'HKEY_CURRENT_USER\\Control Panel\\Mouse', [
          text('Scheme', input.cursorScheme),
          text('MouseTrails', input.cursorScheme === 'win98' ? 'Animated pointer scheme available' : 'Standard pointer'),
        ]),
      ]),
    ]),
    key('HKEY_LOCAL_MACHINE', 'HKEY_LOCAL_MACHINE', [defaultValue], [
      key('Enum', 'HKEY_LOCAL_MACHINE\\Enum', [defaultValue], [
        key('PCI', 'HKEY_LOCAL_MACHINE\\Enum\\PCI', [defaultValue], [
          key('VEN_10B7&DEV_9050', 'HKEY_LOCAL_MACHINE\\Enum\\PCI\\VEN_10B7&DEV_9050', [
            text('DeviceDesc', '3Com EtherLink XL 10/100 PCI TX NIC'),
            text('Driver', input.driverStatus.network),
          ]),
          key('VEN_5333&DEV_8811', 'HKEY_LOCAL_MACHINE\\Enum\\PCI\\VEN_5333&DEV_8811', [
            text('DeviceDesc', 'S3 Trio64V+ Graphics Adapter'),
            text('Driver', input.driverStatus.video),
          ]),
        ]),
        key('MEDIA', 'HKEY_LOCAL_MACHINE\\Enum\\MEDIA', [defaultValue], [
          key('SoundBlaster16', 'HKEY_LOCAL_MACHINE\\Enum\\MEDIA\\SoundBlaster16', [
            text('DeviceDesc', 'Sound Blaster 16 or compatible'),
            text('Driver', input.driverStatus.audio),
          ]),
        ]),
      ]),
      key('Software', 'HKEY_LOCAL_MACHINE\\Software', [defaultValue], [
        key('Microsoft', 'HKEY_LOCAL_MACHINE\\Software\\Microsoft', [defaultValue], [
          key('Windows', 'HKEY_LOCAL_MACHINE\\Software\\Microsoft\\Windows', [defaultValue], [
            key('CurrentVersion', 'HKEY_LOCAL_MACHINE\\Software\\Microsoft\\Windows\\CurrentVersion', [
              text('ProductName', 'Windows 98 Portfolio Edition'),
              text('VersionNumber', '4.10.1998'),
              text('RegisteredOwner', 'Portfolio Visitor'),
            ], [
              key('Run', 'HKEY_LOCAL_MACHINE\\Software\\Microsoft\\Windows\\CurrentVersion\\Run', [
                text('PortfolioSafetyGuide', 'C:\\Windows\\System\\SafetyTraining.exe'),
                text('SystemTray', 'SysTray.Exe'),
              ]),
            ]),
          ]),
        ]),
        key('Windows98Portfolio', 'HKEY_LOCAL_MACHINE\\Software\\Windows98Portfolio', [
          text('Mode', 'Educational browser-only simulation'),
          dword('NetworkConnected', input.networkConnected),
          text('IPAddress', input.ipAddress),
          dword('SoundEnabled', input.audioEnabled && !input.audioMuted),
          text('SoundVolume', `${Math.round(input.audioVolume * 100)}%`),
        ]),
      ]),
      key('System', 'HKEY_LOCAL_MACHINE\\System', [defaultValue], [
        key('CurrentControlSet', 'HKEY_LOCAL_MACHINE\\System\\CurrentControlSet', [defaultValue], [
          key('Services', 'HKEY_LOCAL_MACHINE\\System\\CurrentControlSet\\Services', [defaultValue], [
            key('VxD', 'HKEY_LOCAL_MACHINE\\System\\CurrentControlSet\\Services\\VxD', [defaultValue], [
              key('NDIS', 'HKEY_LOCAL_MACHINE\\System\\CurrentControlSet\\Services\\VxD\\NDIS', [
                text('DisplayName', 'NDIS Network Driver Interface'),
                text('Status', input.driverStatus.network),
              ]),
              key('VMM', 'HKEY_LOCAL_MACHINE\\System\\CurrentControlSet\\Services\\VxD\\VMM', [
                text('DisplayName', 'Virtual Machine Manager'),
                text('Status', 'Core system file protected'),
              ]),
            ]),
          ]),
          key('Control', 'HKEY_LOCAL_MACHINE\\System\\CurrentControlSet\\Control', [defaultValue], [
            key('BIOS', 'HKEY_LOCAL_MACHINE\\System\\CurrentControlSet\\Control\\BIOS', [
              dword('QuickPOST', input.quickPost),
              text('BootOrder', input.bootOrder),
            ]),
          ]),
        ]),
      ]),
    ]),
    key('HKEY_USERS', 'HKEY_USERS', [defaultValue], [
      key('.DEFAULT', 'HKEY_USERS\\.DEFAULT', [text('UserName', 'Portfolio Guest')]),
    ]),
  ]
}

export function flattenRegistryKeys(keys: readonly RegistryKey[]): RegistryKey[] {
  return keys.flatMap((item) => [item, ...flattenRegistryKeys(item.children ?? [])])
}
