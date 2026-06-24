import { useState, type CSSProperties } from 'react'
import type {
  AppId,
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
} from '../../types'
import { controlPanelSections } from '../../data/system'
import { getTheme, getWallpaper, selectableThemes, wallpapers } from '../../data/themes'
import { soundCatalog } from '../../os/audio'
import { useOs } from '../../os/useOs'
import { driverFailureBox, driverHealthy, driverStatusLabel, missingDriverFiles } from '../../os/systemHealth'

export type ControlPanelSection = (typeof controlPanelSections)[number]

export type InstalledProgram = Readonly<{
  name: string
  appId?: AppId
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
  themeId: string
  wallpaperId: string
}>

export type ControlPanelRowsInput = Readonly<{
  sectionId: ControlPanelSectionId
  fs: FsState
  network: NetworkState
  bootMode: BootMode
  cursorScheme: CursorSchemeId
  themeId: string
  wallpaperId: string
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
    previewStyle: AppearancePreviewStyle
    appearanceDirty: boolean
    chooseTheme: (themeId: string) => void
    chooseWallpaper: (wallpaperId: string) => void
    applyAppearance: () => void
    resetAppearanceDraft: () => void
  }>
  mouse: Readonly<{
    cursorScheme: CursorSchemeId
    togglePointerScheme: () => void
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
  { name: 'Calculator', appId: 'calculator', icon: 'calculator', size: '0.4 MB' },
  { name: 'Minesweeper', appId: 'minesweeper', icon: 'minesweeper', size: '0.6 MB' },
  { name: 'Windows Media Player', appId: 'mediaPlayer', icon: 'mediaPlayer', size: '2.2 MB' },
  { name: 'Sound Recorder', appId: 'soundRecorder', icon: 'soundRecorder', size: '0.5 MB' },
  { name: 'Outlook Express 5', icon: 'world', size: '6.7 MB' },
  { name: 'Microsoft NetMeeting', icon: 'network', size: '4.1 MB' },
  { name: 'Windows 98 Portfolio Edition', icon: 'windows', size: '198 MB', required: true },
]

const sections = controlPanelSections as readonly ControlPanelSection[]
const soundOptions = soundCatalog as readonly ControlPanelSoundOption[]

function row(label: string, value: string): ControlPanelRow {
  return { label, value }
}

export function getControlPanelRows(input: ControlPanelRowsInput): readonly ControlPanelRow[] {
  const now = input.now ?? new Date()
  const timeZone = input.timeZone ?? Intl.DateTimeFormat().resolvedOptions().timeZone

  switch (input.sectionId) {
    case 'system':
      return [
        row('System', 'Microsoft Windows 98 Portfolio Edition'),
        row('Computer', 'Genuine Browser PC'),
        row('Memory', '64 MB simulated RAM'),
        row(
          'Display',
          !driverHealthy(input.fs, 'video')
            ? 'VGA Display: Driver Missing'
            : input.bootMode === 'safe'
              ? 'Standard VGA, 16 colors'
              : 'Accelerated CSS desktop',
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
): AppearancePreviewStyle {
  const previewDesktop = wallpaper.css === 'none' ? theme.vars['--w98-desktop'] : wallpaper.css
  return {
    '--appearance-preview-desktop': previewDesktop,
    '--appearance-preview-surface': theme.vars['--w98-surface'],
    '--appearance-preview-title-1': theme.vars['--w98-titlebar-1'],
    '--appearance-preview-title-2': theme.vars['--w98-titlebar-2'],
    '--appearance-preview-title-text': theme.vars['--w98-titlebar-text'],
    '--appearance-preview-highlight': theme.vars['--w98-highlight'],
    '--appearance-preview-highlight-text': theme.vars['--w98-highlight-text'],
    '--appearance-preview-text': theme.vars['--w98-text'],
  } as AppearancePreviewStyle
}

function resolveDraft(draft: AppearanceDraft, currentThemeId: string, currentWallpaperId: string): AppearanceDraft {
  const belongsToCurrentAppearance = draft.baseThemeId === currentThemeId && draft.baseWallpaperId === currentWallpaperId
  if (belongsToCurrentAppearance) return draft
  return {
    baseThemeId: currentThemeId,
    baseWallpaperId: currentWallpaperId,
    themeId: currentThemeId,
    wallpaperId: currentWallpaperId,
  }
}

export function useControlPanelModel(payload?: AppProps['payload']): ControlPanelViewModel {
  const {
    state,
    openApp,
    setTheme,
    setWallpaper,
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
    themeId: state.themeId,
    wallpaperId: state.wallpaperId,
  }))

  const active = sections.find((item) => item.id === selectedSectionId) ?? sections[0]
  const effectiveDraft = resolveDraft(appearanceDraft, state.themeId, state.wallpaperId)
  const draftTheme = getTheme(effectiveDraft.themeId)
  const draftWallpaper = getWallpaper(effectiveDraft.wallpaperId)
  const appearanceDirty = draftTheme.id !== state.themeId || draftWallpaper.id !== state.wallpaperId
  const visiblePrograms = INSTALLED_PROGRAMS.filter((program) => !removedPrograms.includes(program.name))
  const selectedProgram = visiblePrograms.find((program) => program.name === selectedProgramName) ?? null

  function openProgram(program: InstalledProgram) {
    if (program.appId) openApp(program.appId)
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
      themeId: next.id,
      wallpaperId: next.wallpaperId ?? draftWallpaper.id,
    })
  }

  function chooseWallpaper(wallpaperId: string) {
    setAppearanceDraft({
      baseThemeId: state.themeId,
      baseWallpaperId: state.wallpaperId,
      themeId: draftTheme.id,
      wallpaperId,
    })
  }

  function applyAppearance() {
    changeDisplaySetting(() => {
      setTheme(draftTheme.id)
      setWallpaper(draftWallpaper.id)
      showMessageBox({
        title: 'Display Properties',
        message: `${draftTheme.name} has been applied.`,
        detail: `Wallpaper: ${draftWallpaper.name}. The setting is saved inside the portfolio OS state.`,
        icon: 'info',
        buttons: ['ok'],
      })
    })
  }

  function resetAppearanceDraft() {
    setAppearanceDraft({
      baseThemeId: state.themeId,
      baseWallpaperId: state.wallpaperId,
      themeId: state.themeId,
      wallpaperId: state.wallpaperId,
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
      audio: state.audio,
    }),
    display: {
      themes: selectableThemes,
      wallpapers,
      draftTheme,
      draftWallpaper,
      previewStyle: createAppearancePreviewStyle(draftTheme, draftWallpaper),
      appearanceDirty,
      chooseTheme,
      chooseWallpaper,
      applyAppearance,
      resetAppearanceDraft,
    },
    mouse: {
      cursorScheme: state.cursorScheme,
      togglePointerScheme: () => setCursorScheme(state.cursorScheme === 'win98' ? 'standard' : 'win98'),
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
