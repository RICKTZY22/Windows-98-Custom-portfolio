import type { CursorSchemeId, ThemeDefinition, WallpaperDefinition } from '../types'

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

export function applyWallpaper(wallpaper: WallpaperDefinition): void {
  const style = rootStyle()
  if (!style) {
    return
  }
  style.setProperty('--w98-wallpaper', wallpaper.css)
  document.documentElement.setAttribute('data-wallpaper', wallpaper.id)
}

export function applyCursorScheme(scheme: CursorSchemeId): void {
  if (typeof document === 'undefined') {
    return
  }
  document.documentElement.setAttribute('data-cursor', scheme)
}
