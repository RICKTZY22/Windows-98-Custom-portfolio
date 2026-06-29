import { describe, expect, it } from 'vitest'
import type { FsState, NetworkState } from '../../../types'
import { createInitialFsState } from '../../../data/initialFilesystem'
import { getTheme, getWallpaper } from '../../../data/themes'
import { createAppearancePreviewStyle, getControlPanelRows } from '../ControlPanelApp.model'

const network: NetworkState = {
  connected: false,
  dhcp: true,
  adapterName: '3Com EtherLink XL 10/100 PCI',
  macAddress: '00:98:22:10:42:00',
  ipAddress: '0.0.0.0',
  subnetMask: '255.255.255.0',
  gateway: '',
  dns: '',
  packetsSent: 0,
  packetsReceived: 0,
}

function removeNode(fs: FsState, path: string): FsState {
  const nodes = { ...fs.nodes }
  delete nodes[path]
  return { ...fs, nodes }
}

describe('ControlPanelApp model helpers', () => {
  it('reports tiered video driver status in system rows', () => {
    const warningFs = removeNode(createInitialFsState(), 'C:\\Windows\\System32\\display.drv')
    const degradedFs = removeNode(warningFs, 'C:\\Windows\\System32\\gpu.vxd')
    const input = {
      sectionId: 'system',
      network,
      bootMode: 'normal',
      cursorScheme: 'win98',
      themeId: 'windowsStandard',
      wallpaperId: 'portfolioSky',
      audio: { enabled: true, muted: false, volume: 0.7 },
    } as const

    expect(getControlPanelRows({ ...input, fs: warningFs })).toContainEqual({
      label: 'Display',
      value: 'VGA Display: Warning',
    })
    expect(getControlPanelRows({ ...input, fs: degradedFs })).toContainEqual({
      label: 'Display',
      value: 'VGA Display: Degraded',
    })
  })

  it('keeps audio status derived from driver health and user audio state', () => {
    const fs = createInitialFsState()
    const missingAudioFs = removeNode(fs, 'C:\\Windows\\System32\\sound.drv')

    expect(
      getControlPanelRows({
        sectionId: 'sounds',
        fs,
        network,
        bootMode: 'normal',
        cursorScheme: 'win98',
        themeId: 'windowsStandard',
        wallpaperId: 'portfolioSky',
        audio: { enabled: true, muted: false, volume: 0.7 },
      }),
    ).toContainEqual({ label: 'Sound', value: 'Enabled' })

    expect(
      getControlPanelRows({
        sectionId: 'sounds',
        fs: missingAudioFs,
        network,
        bootMode: 'normal',
        cursorScheme: 'win98',
        themeId: 'windowsStandard',
        wallpaperId: 'portfolioSky',
        audio: { enabled: true, muted: false, volume: 0.7 },
      }),
    ).toContainEqual({ label: 'Sound', value: 'Disabled' })
  })

  it('builds theme preview CSS variables from theme and wallpaper definitions', () => {
    const theme = getTheme('desertSunset')
    const noWallpaperStyle = createAppearancePreviewStyle(theme, getWallpaper('none'))
    const wallpaperStyle = createAppearancePreviewStyle(theme, getWallpaper('portfolioSky'))

    expect(noWallpaperStyle['--appearance-preview-desktop']).toBe(theme.vars['--w98-desktop'])
    expect(wallpaperStyle['--appearance-preview-desktop']).toBe(getWallpaper('portfolioSky').css)
    expect(wallpaperStyle['--appearance-preview-title-1']).toBe(theme.vars['--w98-titlebar-1'])
  })
})
