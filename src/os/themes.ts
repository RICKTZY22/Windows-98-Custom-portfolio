import type { AppearanceEffects, CursorSchemeId, ThemeDefinition, WallpaperDefinition, WallpaperMode } from '../types'

/**
 * DOM-effect layer for appearance. Only the store calls these; components
 * never touch the document root directly.
 */

function rootStyle(): CSSStyleDeclaration | null {
  if (typeof document === 'undefined') {
    return null
  }
  return document.documentElement.style
}

let appliedVarNames: string[] = []

export function applyTheme(theme: ThemeDefinition): void {
  const style = rootStyle()
  if (!style) {
    return
  }
  // Clear variables left over from a previous theme that this one doesn't set.
  for (const name of appliedVarNames) {
    if (!(name in theme.vars)) {
      style.removeProperty(name)
    }
  }
  for (const [name, value] of Object.entries(theme.vars)) {
    style.setProperty(name, value)
  }
  appliedVarNames = Object.keys(theme.vars)
  document.documentElement.setAttribute('data-theme', theme.id)
}

const wallpaperModeCss: Record<
  WallpaperMode,
  { size: string; repeat: string; position: string }
> = {
  stretch: { size: 'cover', repeat: 'no-repeat', position: 'center' },
  center: { size: 'auto', repeat: 'no-repeat', position: 'center' },
  tile: { size: 'auto', repeat: 'repeat', position: 'left top' },
}

export function applyWallpaper(wallpaper: WallpaperDefinition, mode: WallpaperMode): void {
  const style = rootStyle()
  if (!style) {
    return
  }
  const layout = wallpaperModeCss[mode]
  style.setProperty('--w98-wallpaper', wallpaper.css)
  style.setProperty('--w98-wallpaper-size', wallpaper.css === 'none' ? 'auto' : layout.size)
  style.setProperty('--w98-wallpaper-repeat', wallpaper.css === 'none' ? 'no-repeat' : layout.repeat)
  style.setProperty('--w98-wallpaper-position', wallpaper.css === 'none' ? 'center' : layout.position)
  document.documentElement.setAttribute('data-wallpaper', wallpaper.id)
  document.documentElement.setAttribute('data-wallpaper-mode', mode)
}

export function applyCursorScheme(scheme: CursorSchemeId): void {
  if (typeof document === 'undefined') {
    return
  }
  document.documentElement.setAttribute('data-cursor', scheme)
}

export function applyAppearanceEffects(effects: AppearanceEffects): void {
  if (typeof document === 'undefined') {
    return
  }
  const root = document.documentElement
  root.setAttribute('data-mouse-trails', effects.mouseTrails ? 'on' : 'off')
  root.setAttribute('data-menu-shadows', effects.menuShadows ? 'on' : 'off')
  root.setAttribute('data-window-animations', effects.windowAnimations ? 'on' : 'off')
}
