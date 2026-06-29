import { useState, type CSSProperties } from 'react'
import type {
  AppId,
  AppearanceEffects,
  AppProps,
  AudioState,
  BootMode,
  ControlPanelSectionId,
  CursorSchemeId,
  FsState,
  IconKey,
  NetworkState,
  SoundId,
  ThemeDefinition,
  WallpaperDefinition,
  WallpaperMode,
  WindowPayload,
} from '../../types'
import { controlPanelSections } from '../../data/system'
import { getTheme, getWallpaper, selectableThemes, wallpapers } from '../../data/themes'
import { soundCatalog } from '../../os/audio'
import { useOs } from '../../os/useOs'
import {
  driverFailureBox,
  driverHealthy,
  driverStatusLabel,
  missingDriverFiles,
  videoDriverHealth,
} from '../../os/systemHealth'

export type ControlPanelSection = (typeof controlPanelSections)[number]

export type InstalledProgram = Readonly<{
  name: string
  appId?: AppId
  payload?: WindowPayload
  icon: IconKey
  size: string
  required?: boolean
}>

export type ControlPanelRow = Readonly<{
  label: string
  value: string
}>

export type ControlPanelSoundOption = Readonly<{
  id: SoundId
  label: string
  description: string
}>

type AppearancePreviewVar =
  | '--appearance-preview-desktop'
  | '--appearance-preview-size'
  | '--appearance-preview-repeat'
  | '--appearance-preview-position'
  | '--appearance-preview-surface'
  | '--appearance-preview-title-1'
  | '--appearance-preview-title-2'
  | '--appearance-preview-title-text'
  | '--appearance-preview-highlight'
  | '--appearance-preview-highlight-text'
  | '--appearance-preview-text'

export type AppearancePreviewStyle = CSSProperties & Record<AppearancePreviewVar, string>

type AppearanceDraft = Readonly<{
  baseThemeId: string
  baseWallpaperId: string
  baseWallpaperMode: WallpaperMode
  themeId: string
  wallpaperId: string
  wallpaperMode: WallpaperMode
}>

export type ControlPanelRowsInput = Readonly<{
  sectionId: ControlPanelSectionId
  fs: FsState
  network: NetworkState
  bootMode: BootMode
  cursorScheme: CursorSchemeId
  themeId: string
  wallpaperId: string
  wallpaperMode?: WallpaperMode
  effects?: AppearanceEffects
  audio: AudioState
  now?: Date
  timeZone?: string
}>

export type ControlPanelViewModel = Readonly<{
  sections: readonly ControlPanelSection[]
  active: ControlPanelSection
  selectedSectionId: ControlPanelSectionId
  selectSection: (id: ControlPanelSectionId) => void
  rows: readonly ControlPanelRow[]
  display: Readonly<{
    themes: readonly ThemeDefinition[]
    wallpapers: readonly WallpaperDefinition[]
    draftTheme: ThemeDefinition
    draftWallpaper: WallpaperDefinition
    draftWallpaperMode: WallpaperMode
    previewStyle: AppearancePreviewStyle
    appearanceDirty: boolean
    chooseTheme: (themeId: string) => void
    chooseWallpaper: (wallpaperId: string) => void
    chooseWallpaperMode: (mode: WallpaperMode) => void
    effects: AppearanceEffects
    setEffect: (key: 'menuShadows' | 'windowAnimations' | 'mouseTrails', enabled: boolean) => void
    applyAppearance: () => void
    resetAppearanceDraft: () => void
  }>
  mouse: Readonly<{
    cursorScheme: CursorSchemeId
    mouseTrails: boolean
    togglePointerScheme: () => void
    toggleMouseTrails: () => void
  }>
  sounds: Readonly<{
    muted: boolean
    volume: number
    catalog: readonly ControlPanelSoundOption[]
    enableAudio: () => void
    toggleMuted: () => void
    setVolume: (volume: number) => void
    play: (id: SoundId) => void
  }>
  programs: Readonly<{
    visible: readonly InstalledProgram[]
    selected: InstalledProgram | null
    selectedName: string | null
    selectProgram: (name: string) => void
    openProgram: (program: InstalledProgram) => void
    openSelectedProgram: () => void
    addRemoveProgram: () => void
    installProgram: () => void
  }>
  openNetwork: () => void
  openPerformance: () => void
}>

// The Add/Remove Programs list. Required entries mimic core Win98 components.
export const INSTALLED_PROGRAMS: readonly InstalledProgram[] = [
  { name: 'Microsoft Internet Explorer 5', appId: 'internetExplorer', icon: 'internet', size: '12.4 MB', required: true },
  { name: 'Microsoft Paint', appId: 'paint', icon: 'paint', size: '1.1 MB' },
  { name: 'WordPad', appId: 'wordpad', icon: 'wordpad', size: '1.8 MB' },
  { name: 'Notepad', appId: 'notepad', icon: 'notepad', size: '0.3 MB' },
  { name: 'Portfolio Certificates', appId: 'certificates', icon: 'html', size: '0.2 MB' },
  { name: 'Calculator', appId: 'calculator', icon: 'calculator', size: '0.4 MB' },
  { name: 'Minesweeper', appId: 'minesweeper', icon: 'minesweeper', size: '0.6 MB' },
  {
    name: 'Wolfenstein 3D',
    appId: 'dosGame',
    payload: { url: '/games/wolf3d.jsdos?v=2', windowTitle: 'Wolfenstein 3D' },
    icon: 'wolfenstein',
    size: '13.4 MB',
  },
  {
    name: 'DOOM',
    appId: 'dosGame',
    payload: { url: '/games/doom.jsdos?v=2', windowTitle: 'DOOM' },
    icon: 'doom',
    size: '14.2 MB',
  },
  { name: 'Windows Media Player', appId: 'mediaPlayer', icon: 'mediaPlayer', size: '2.2 MB' },
  { name: 'Video Player', appId: 'videoPlayer', icon: 'videoPlayer', size: '3.4 MB' },
  { name: 'Imaging Preview', appId: 'imageViewer', icon: 'imageFile', size: '1.6 MB' },
  { name: 'My Pictures Gallery', appId: 'gallery', icon: 'gallery', size: '2.8 MB' },
  { name: 'Sound Recorder', appId: 'soundRecorder', icon: 'soundRecorder', size: '0.5 MB' },
  { name: 'Antivirus 98', appId: 'antivirus', icon: 'sysFile', size: '5.9 MB' },
  { name: 'Microsoft System Information', appId: 'systemInfo', icon: 'adminTools', size: '2.1 MB' },
  { name: 'Device Manager', appId: 'deviceManager', icon: 'computer', size: '1.7 MB' },
  { name: 'System Configuration Utility', appId: 'msconfig', icon: 'gears', size: '0.8 MB' },
  { name: 'Registry Editor', appId: 'registryEditor', icon: 'gears', size: '0.7 MB' },
  { name: 'ScanDisk', appId: 'scandisk', icon: 'hardDrive', size: '0.9 MB' },
  { name: 'Disk Defragmenter', appId: 'defrag', icon: 'hardDrive', size: '1.2 MB' },
  { name: 'Outlook Express 5', icon: 'world', size: '6.7 MB' },
  { name: 'Microsoft NetMeeting', icon: 'network', size: '4.1 MB' },
  { name: 'Windows Explorer', appId: 'explorer', payload: { path: 'C:\\' }, icon: 'explorer', size: '3.1 MB', required: true },
  { name: 'Windows 98 Portfolio Edition', icon: 'windows', size: '198 MB', required: true },
]

const sections = controlPanelSections as readonly ControlPanelSection[]
const soundOptions = soundCatalog as readonly ControlPanelSoundOption[]

function row(label: string, value: string): ControlPanelRow {
  return { label, value }
}

function displayDriverSummary(fs: FsState, bootMode: BootMode): string {
  const health = videoDriverHealth(fs)
  if (health.level === 'warning') return 'VGA Display: Warning'
  if (!driverHealthy(fs, 'video')) return `VGA Display: ${driverStatusLabel(fs, 'video')}`
  return bootMode === 'safe' ? 'Standard VGA, 16 colors' : 'Accelerated CSS desktop'
}

export function getControlPanelRows(input: ControlPanelRowsInput): readonly ControlPanelRow[] {
  const now = input.now ?? new Date()
  const timeZone = input.timeZone ?? Intl.DateTimeFormat().resolvedOptions().timeZone
  const wallpaperMode = input.wallpaperMode ?? 'stretch'
  const effects = input.effects ?? { mouseTrails: false, menuShadows: true, windowAnimations: true }

  switch (input.sectionId) {
    case 'system':
      return [
        row('System', 'Microsoft Windows 98 Portfolio Edition'),
        row('Computer', 'Genuine Browser PC'),
        row('Memory', '64 MB simulated RAM'),
        row(
          'Display',
          displayDriverSummary(input.fs, input.bootMode),
        ),
      ]
    case 'network':
      return [
        row('Adapter', input.network.adapterName),
        row('Driver', driverStatusLabel(input.fs, 'network')),
        row('IP Address', input.network.ipAddress),
        row('Gateway', input.network.gateway || '(none)'),
        row('Status', input.network.connected ? 'Connected' : 'Disconnected'),
      ]
    case 'mouse':
      return [
        row('Input driver', driverStatusLabel(input.fs, 'input')),
        row('Pointer scheme', input.cursorScheme === 'win98' ? 'Windows 98 Animated' : 'Standard'),
        row('Mouse trails', effects.mouseTrails ? 'Enabled' : 'Disabled'),
        row('Button configuration', 'Right-handed'),
        row('Pointer speed', 'Medium'),
      ]
    case 'datetime':
      return [
        row('Date', now.toLocaleDateString()),
        row('Time', now.toLocaleTimeString()),
        row('Time zone', timeZone),
      ]
    case 'keyboard':
      return [
        row('Input driver', driverStatusLabel(input.fs, 'input')),
        row('Repeat delay', 'Short'),
        row('Repeat rate', 'Fast'),
        row('Language', 'US 101-key'),
      ]
    case 'printers':
      return [row('Default printer', 'Portfolio Writer on LPT1:'), row('Queue status', 'Ready')]
    case 'addremove':
      return [
        row('Installed programs', String(INSTALLED_PROGRAMS.length)),
        row('Windows components', 'Accessories, Internet Tools, Multimedia'),
      ]
    case 'display':
      return [
        row('Theme', input.themeId),
        row('Wallpaper', input.wallpaperId),
        row('Wallpaper display', wallpaperMode[0].toUpperCase() + wallpaperMode.slice(1)),
        row('Menu shadows', effects.menuShadows ? 'Enabled' : 'Disabled'),
        row('Window effects', effects.windowAnimations ? 'Enabled' : 'Disabled'),
      ]
    case 'sounds':
    default:
      return [
        row('Theme', input.themeId),
        row('Wallpaper', input.wallpaperId),
        row('Audio driver', driverStatusLabel(input.fs, 'audio')),
        row('Sound', input.audio.enabled && driverHealthy(input.fs, 'audio') ? 'Enabled' : 'Disabled'),
      ]
  }
}

export function createAppearancePreviewStyle(
  theme: ThemeDefinition,
  wallpaper: WallpaperDefinition,
  wallpaperMode: WallpaperMode = 'stretch',
): AppearancePreviewStyle {
  const previewDesktop = wallpaper.css === 'none' ? theme.vars['--w98-desktop'] : wallpaper.css
  const modeStyle: Record<WallpaperMode, Pick<CSSProperties, 'backgroundPosition' | 'backgroundRepeat' | 'backgroundSize'>> = {
    stretch: { backgroundPosition: 'center', backgroundRepeat: 'no-repeat', backgroundSize: 'cover' },
    center: { backgroundPosition: 'center', backgroundRepeat: 'no-repeat', backgroundSize: 'auto' },
    tile: { backgroundPosition: 'left top', backgroundRepeat: 'repeat', backgroundSize: 'auto' },
  }
  return {
    '--appearance-preview-desktop': previewDesktop,
    '--appearance-preview-size': wallpaper.css === 'none' ? 'auto' : String(modeStyle[wallpaperMode].backgroundSize),
    '--appearance-preview-repeat': wallpaper.css === 'none' ? 'no-repeat' : String(modeStyle[wallpaperMode].backgroundRepeat),
    '--appearance-preview-position': wallpaper.css === 'none' ? 'center' : String(modeStyle[wallpaperMode].backgroundPosition),
    '--appearance-preview-surface': theme.vars['--w98-surface'],
    '--appearance-preview-title-1': theme.vars['--w98-titlebar-1'],
    '--appearance-preview-title-2': theme.vars['--w98-titlebar-2'],
    '--appearance-preview-title-text': theme.vars['--w98-titlebar-text'],
    '--appearance-preview-highlight': theme.vars['--w98-highlight'],
    '--appearance-preview-highlight-text': theme.vars['--w98-highlight-text'],
    '--appearance-preview-text': theme.vars['--w98-text'],
  } as AppearancePreviewStyle
}

function resolveDraft(
  draft: AppearanceDraft,
  currentThemeId: string,
  currentWallpaperId: string,
  currentWallpaperMode: WallpaperMode,
): AppearanceDraft {
  const belongsToCurrentAppearance =
    draft.baseThemeId === currentThemeId &&
    draft.baseWallpaperId === currentWallpaperId &&
    draft.baseWallpaperMode === currentWallpaperMode
  if (belongsToCurrentAppearance) return draft
  return {
    baseThemeId: currentThemeId,
    baseWallpaperId: currentWallpaperId,
    baseWallpaperMode: currentWallpaperMode,
    themeId: currentThemeId,
    wallpaperId: currentWallpaperId,
    wallpaperMode: currentWallpaperMode,
  }
}

export function useControlPanelModel(payload?: AppProps['payload']): ControlPanelViewModel {
  const {
    state,
    openApp,
    setTheme,
    setWallpaper,
    setWallpaperMode,
    setAppearanceEffects,
    setCursorScheme,
    enableAudio,
    setAudioMuted,
    setAudioVolume,
    playSound,
    showMessageBox,
  } = useOs()
  const [selectedSectionId, setSelectedSectionId] = useState<ControlPanelSectionId>(
    payload?.controlPanelSection ?? 'display',
  )
  const [removedPrograms, setRemovedPrograms] = useState<string[]>([])
  const [selectedProgramName, setSelectedProgramName] = useState<string | null>(null)
  const [appearanceDraft, setAppearanceDraft] = useState<AppearanceDraft>(() => ({
    baseThemeId: state.themeId,
    baseWallpaperId: state.wallpaperId,
    baseWallpaperMode: state.wallpaperMode,
    themeId: state.themeId,
    wallpaperId: state.wallpaperId,
    wallpaperMode: state.wallpaperMode,
  }))

  const active = sections.find((item) => item.id === selectedSectionId) ?? sections[0]
  const effectiveDraft = resolveDraft(appearanceDraft, state.themeId, state.wallpaperId, state.wallpaperMode)
  const draftTheme = getTheme(effectiveDraft.themeId)
  const draftWallpaper = getWallpaper(effectiveDraft.wallpaperId)
  const appearanceDirty =
    draftTheme.id !== state.themeId ||
    draftWallpaper.id !== state.wallpaperId ||
    effectiveDraft.wallpaperMode !== state.wallpaperMode
  const visiblePrograms = INSTALLED_PROGRAMS.filter((program) => !removedPrograms.includes(program.name))
  const selectedProgram = visiblePrograms.find((program) => program.name === selectedProgramName) ?? null

  function openProgram(program: InstalledProgram) {
    if (program.appId) openApp(program.appId, program.payload)
  }

  function addRemoveProgram() {
    if (!selectedProgram) return
    if (selectedProgram.required) {
      showMessageBox({
        title: 'Add/Remove Programs',
        message: `${selectedProgram.name} is a required Windows component and cannot be removed.`,
        icon: 'warning',
        buttons: ['ok'],
      })
      return
    }
    showMessageBox({
      title: 'Confirm File Deletion',
      message: `Are you sure you want to remove ${selectedProgram.name} and all of its components?`,
      icon: 'question',
      buttons: ['yes', 'no'],
      onResult: (button) => {
        if (button !== 'yes') return
        setRemovedPrograms((list) => [...list, selectedProgram.name])
        setSelectedProgramName(null)
        showMessageBox({
          title: 'Add/Remove Programs',
          message: `${selectedProgram.name} was removed successfully.`,
          icon: 'info',
          buttons: ['ok'],
        })
      },
    })
  }

  function installProgram() {
    showMessageBox({
      title: 'Install Program From Floppy Disk or CD-ROM',
      message: "Insert the program's first installation floppy disk or CD-ROM, then click OK.",
      detail: 'Windows could not detect a setup program. In this edition, programs are launched from the Start menu.',
      icon: 'info',
      buttons: ['ok'],
    })
  }

  function changeDisplaySetting(action: () => void) {
    if (!driverHealthy(state.fs, 'video')) {
      showMessageBox(driverFailureBox('video', 'Display Properties', missingDriverFiles(state.fs, 'video')))
      return
    }
    action()
  }

  function chooseTheme(themeId: string) {
    const next = getTheme(themeId)
    setAppearanceDraft({
      baseThemeId: state.themeId,
      baseWallpaperId: state.wallpaperId,
      baseWallpaperMode: state.wallpaperMode,
      themeId: next.id,
      wallpaperId: next.wallpaperId ?? draftWallpaper.id,
      wallpaperMode: effectiveDraft.wallpaperMode,
    })
  }

  function chooseWallpaper(wallpaperId: string) {
    setAppearanceDraft({
      baseThemeId: state.themeId,
      baseWallpaperId: state.wallpaperId,
      baseWallpaperMode: state.wallpaperMode,
      themeId: draftTheme.id,
      wallpaperId,
      wallpaperMode: effectiveDraft.wallpaperMode,
    })
  }

  function chooseWallpaperMode(mode: WallpaperMode) {
    setAppearanceDraft({
      baseThemeId: state.themeId,
      baseWallpaperId: state.wallpaperId,
      baseWallpaperMode: state.wallpaperMode,
      themeId: draftTheme.id,
      wallpaperId: draftWallpaper.id,
      wallpaperMode: mode,
    })
  }

  function setDisplayEffect(key: 'menuShadows' | 'windowAnimations' | 'mouseTrails', enabled: boolean) {
    changeDisplaySetting(() => {
      setAppearanceEffects({ ...state.appearanceEffects, [key]: enabled })
    })
  }

  function applyAppearance() {
    changeDisplaySetting(() => {
      setTheme(draftTheme.id)
      setWallpaper(draftWallpaper.id)
      setWallpaperMode(effectiveDraft.wallpaperMode)
      showMessageBox({
        title: 'Display Properties',
        message: `${draftTheme.name} has been applied.`,
        detail: `Wallpaper: ${draftWallpaper.name} (${effectiveDraft.wallpaperMode}). The setting is saved inside the portfolio OS state.`,
        icon: 'info',
        buttons: ['ok'],
      })
    })
  }

  function resetAppearanceDraft() {
    setAppearanceDraft({
      baseThemeId: state.themeId,
      baseWallpaperId: state.wallpaperId,
      baseWallpaperMode: state.wallpaperMode,
      themeId: state.themeId,
      wallpaperId: state.wallpaperId,
      wallpaperMode: state.wallpaperMode,
    })
  }

  return {
    sections,
    active,
    selectedSectionId,
    selectSection: setSelectedSectionId,
    rows: getControlPanelRows({
      sectionId: active.id,
      fs: state.fs,
      network: state.network,
      bootMode: state.bootMode,
      cursorScheme: state.cursorScheme,
      themeId: state.themeId,
      wallpaperId: state.wallpaperId,
      wallpaperMode: state.wallpaperMode,
      effects: state.appearanceEffects,
      audio: state.audio,
    }),
    display: {
      themes: selectableThemes,
      wallpapers,
      draftTheme,
      draftWallpaper,
      draftWallpaperMode: effectiveDraft.wallpaperMode,
      previewStyle: createAppearancePreviewStyle(draftTheme, draftWallpaper, effectiveDraft.wallpaperMode),
      appearanceDirty,
      chooseTheme,
      chooseWallpaper,
      chooseWallpaperMode,
      effects: state.appearanceEffects,
      setEffect: setDisplayEffect,
      applyAppearance,
      resetAppearanceDraft,
    },
    mouse: {
      cursorScheme: state.cursorScheme,
      mouseTrails: state.appearanceEffects.mouseTrails,
      togglePointerScheme: () => setCursorScheme(state.cursorScheme === 'win98' ? 'standard' : 'win98'),
      toggleMouseTrails: () =>
        setAppearanceEffects({ ...state.appearanceEffects, mouseTrails: !state.appearanceEffects.mouseTrails }),
    },
    sounds: {
      muted: state.audio.muted,
      volume: state.audio.volume,
      catalog: soundOptions,
      enableAudio,
      toggleMuted: () => setAudioMuted(!state.audio.muted),
      setVolume: setAudioVolume,
      play: playSound,
    },
    programs: {
      visible: visiblePrograms,
      selected: selectedProgram,
      selectedName: selectedProgramName,
      selectProgram: setSelectedProgramName,
      openProgram,
      openSelectedProgram: () => {
        if (selectedProgram) openProgram(selectedProgram)
      },
      addRemoveProgram,
      installProgram,
    },
    openNetwork: () => openApp('network'),
    openPerformance: () => openApp('taskManager'),
  }
}
