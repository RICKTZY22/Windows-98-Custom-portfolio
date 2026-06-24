import type { ThemeDefinition, WallpaperDefinition } from '../types'

const FONT_STACK = '"Pixelated MS Sans Serif", Arial, sans-serif'

/**
 * Each theme defines our shell variables (--w98-*) AND mirrors the 98.css
 * :root color variables so library widgets recolor with the theme.
 */
function makeVars(palette: {
  desktop: string
  titlebar1: string
  titlebar2: string
  titlebarInactive1: string
  titlebarInactive2: string
  titlebarText: string
  highlight: string
  highlightText: string
  surface: string
  text: string
  buttonHighlight: string
  buttonFace: string
  buttonShadow: string
  windowFrame: string
  link: string
}): Record<string, string> {
  return {
    '--w98-desktop': palette.desktop,
    '--w98-titlebar-1': palette.titlebar1,
    '--w98-titlebar-2': palette.titlebar2,
    '--w98-titlebar-inactive-1': palette.titlebarInactive1,
    '--w98-titlebar-inactive-2': palette.titlebarInactive2,
    '--w98-titlebar-text': palette.titlebarText,
    '--w98-highlight': palette.highlight,
    '--w98-highlight-text': palette.highlightText,
    '--w98-surface': palette.surface,
    '--w98-text': palette.text,
    '--w98-font': FONT_STACK,
    // 98.css root variables (mirrored from node_modules/98.css/style.css)
    '--surface': palette.surface,
    '--text-color': palette.text,
    '--button-highlight': palette.buttonHighlight,
    '--button-face': palette.buttonFace,
    '--button-shadow': palette.buttonShadow,
    '--window-frame': palette.windowFrame,
    '--dialog-blue': palette.titlebar1,
    '--dialog-blue-light': palette.titlebar2,
    '--dialog-gray': palette.titlebarInactive1,
    '--dialog-gray-light': palette.titlebarInactive2,
    '--link-blue': palette.link,
  }
}

export const themes: ThemeDefinition[] = [
  {
    id: 'windowsStandard',
    name: 'Windows Standard',
    description: 'Classic blue title bars, silver controls, and the familiar portfolio sky desktop.',
    wallpaperId: 'portfolioSky',
    vars: makeVars({
      desktop: '#008080',
      titlebar1: '#000080',
      titlebar2: '#1084d0',
      titlebarInactive1: '#808080',
      titlebarInactive2: '#b5b5b5',
      titlebarText: '#ffffff',
      highlight: '#000080',
      highlightText: '#ffffff',
      surface: '#c0c0c0',
      text: '#222222',
      buttonHighlight: '#ffffff',
      buttonFace: '#dfdfdf',
      buttonShadow: '#808080',
      windowFrame: '#0a0a0a',
      link: '#0000ff',
    }),
  },
  {
    id: 'desertSunset',
    name: 'Desert Sunset',
    description: 'Warm amber title bars and sand-colored surfaces for a late-afternoon desktop.',
    wallpaperId: 'none',
    vars: makeVars({
      desktop: '#9e6b3f',
      titlebar1: '#7a3e1d',
      titlebar2: '#d98e4a',
      titlebarInactive1: '#8f7a66',
      titlebarInactive2: '#c0ab95',
      titlebarText: '#fff6e8',
      highlight: '#7a3e1d',
      highlightText: '#fff6e8',
      surface: '#d5ccbb',
      text: '#2a1d10',
      buttonHighlight: '#fffaf0',
      buttonFace: '#e8e0d0',
      buttonShadow: '#85786a',
      windowFrame: '#1a120a',
      link: '#8a4500',
    }),
  },
  {
    id: 'eggplant',
    name: 'Eggplant',
    description: 'Muted violet chrome with soft lavender surfaces for a more dramatic shell.',
    wallpaperId: 'none',
    vars: makeVars({
      desktop: '#553355',
      titlebar1: '#3f1f3f',
      titlebar2: '#7d4a7d',
      titlebarInactive1: '#6e646e',
      titlebarInactive2: '#a99ca9',
      titlebarText: '#f4ecf4',
      highlight: '#5a2d5a',
      highlightText: '#f4ecf4',
      surface: '#d2c8d2',
      text: '#1c121c',
      buttonHighlight: '#f8f2f8',
      buttonFace: '#e4dce4',
      buttonShadow: '#837583',
      windowFrame: '#140a14',
      link: '#5a2d8a',
    }),
  },
  {
    id: 'rainyDay',
    name: 'Rainy Day',
    description: 'Blue-gray windows and cool highlights, like a calm rainy afternoon.',
    wallpaperId: 'none',
    vars: makeVars({
      desktop: '#31485f',
      titlebar1: '#2c3e5c',
      titlebar2: '#5a7da0',
      titlebarInactive1: '#6e7e90',
      titlebarInactive2: '#a3b1c0',
      titlebarText: '#eef3f8',
      highlight: '#2c3e5c',
      highlightText: '#eef3f8',
      surface: '#b6c2cf',
      text: '#10161e',
      buttonHighlight: '#e8eef5',
      buttonFace: '#cfd8e2',
      buttonShadow: '#6e7e90',
      windowFrame: '#0a0e14',
      link: '#1a4d8a',
    }),
  },
  {
    id: 'highContrast',
    name: 'High Contrast',
    description: 'Black surfaces, bright text, and yellow selection for maximum contrast.',
    wallpaperId: 'none',
    vars: makeVars({
      desktop: '#000000',
      titlebar1: '#6a00a8',
      titlebar2: '#6a00a8',
      titlebarInactive1: '#000000',
      titlebarInactive2: '#000000',
      titlebarText: '#ffffff',
      highlight: '#ffff00',
      highlightText: '#000000',
      surface: '#000000',
      text: '#ffffff',
      buttonHighlight: '#ffffff',
      buttonFace: '#000000',
      buttonShadow: '#808080',
      windowFrame: '#ffffff',
      link: '#00ffff',
    }),
  },
  {
    // Internal theme used by safe mode: flat 16-color VGA look, no gradients.
    id: 'safeMode16',
    name: 'Safe Mode (16 color)',
    description: 'Internal safe-mode theme. It is intentionally plain and not selectable.',
    wallpaperId: 'none',
    vars: makeVars({
      desktop: '#000000',
      titlebar1: '#000080',
      titlebar2: '#000080',
      titlebarInactive1: '#808080',
      titlebarInactive2: '#808080',
      titlebarText: '#ffffff',
      highlight: '#000080',
      highlightText: '#ffffff',
      surface: '#c0c0c0',
      text: '#000000',
      buttonHighlight: '#ffffff',
      buttonFace: '#c0c0c0',
      buttonShadow: '#808080',
      windowFrame: '#000000',
      link: '#0000ff',
    }),
  },
]

export const wallpapers: WallpaperDefinition[] = [
  { id: 'none', name: '(None)', description: 'Use only the desktop color from the selected scheme.', css: 'none' },
  { id: 'teal', name: 'Teal', description: 'Solid Windows 98 teal.', css: '#008080' },
  {
    id: 'portfolioSky',
    name: 'Portfolio Sky',
    description: 'The soft cloud-style wallpaper used by the portfolio desktop.',
    css: 'radial-gradient(ellipse at 18% 16%, rgba(255,255,255,0.9) 0 7%, rgba(255,255,255,0.55) 12%, transparent 24%), radial-gradient(ellipse at 62% 20%, rgba(255,255,255,0.72) 0 9%, transparent 23%), radial-gradient(ellipse at 34% 58%, rgba(255,255,255,0.62) 0 6%, transparent 20%), linear-gradient(180deg, #9fd3ee 0%, #6fb0d2 58%, #318aa9 100%)',
  },
  {
    id: 'clouds98',
    name: 'Clouds',
    description: 'A brighter blue gradient inspired by classic setup skies.',
    css: 'linear-gradient(180deg, #1e7ad4 0%, #5ba6e8 35%, #9cc8f0 65%, #d2e8fa 100%)',
  },
  {
    id: 'setupBlue',
    name: 'Setup Blue',
    description: 'Deep installer-blue gradient for a setup screen mood.',
    css: 'linear-gradient(180deg, #00007a 0%, #0000a8 45%, #1084d0 100%)',
  },
  {
    id: 'grid',
    name: 'Grid',
    description: 'A subtle retro grid on dark teal.',
    css: 'repeating-linear-gradient(0deg, #006666 0, #006666 1px, transparent 1px, transparent 24px), repeating-linear-gradient(90deg, #006666 0, #006666 1px, transparent 1px, transparent 24px) #004f4f',
  },
]

export const defaultThemeId = 'windowsStandard'
export const defaultWallpaperId = 'portfolioSky'

const themesById: Record<string, ThemeDefinition> = Object.fromEntries(
  themes.map((theme) => [theme.id, theme]),
)
const wallpapersById: Record<string, WallpaperDefinition> = Object.fromEntries(
  wallpapers.map((wallpaper) => [wallpaper.id, wallpaper]),
)

export function getTheme(id: string): ThemeDefinition {
  return themesById[id] ?? themesById[defaultThemeId]
}

export function getWallpaper(id: string): WallpaperDefinition {
  return wallpapersById[id] ?? wallpapersById[defaultWallpaperId]
}

/** Themes selectable from the Control Panel (excludes the internal safe-mode look). */
export const selectableThemes: ThemeDefinition[] = themes.filter((theme) => theme.id !== 'safeMode16')
