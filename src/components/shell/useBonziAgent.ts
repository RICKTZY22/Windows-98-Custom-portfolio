import { useEffect, useState } from 'react'
import { bonziUpdaterArmed } from '../../data/bonziAdware'
import { useOs } from '../../os/useOs'

// BonziBUDDY's background half: the startup entries that launch him with
// Windows, the updater that puts him back after an uninstall, and the tray
// process that brings him back after you close him. Used by the Desktop, so it
// runs once per boot and stops with the shell. Safe Mode skips startup programs
// (as it did in Windows 98), and so does a worm-damaged disk, where programs
// refuse to start anyway.

const STARTUP_DELAY_MS = 7000 // after the desktop appears
const RESPAWN_DELAY_MS = 60000 // after his window closes

/** Runs Bonzi's background behavior; `inTray` is true while his tray process is
 *  "running" (show his tray icon). */
export function useBonziAgent(): { inTray: boolean } {
  const { state, openApp, bonziOps, notify } = useOs()
  const blocked = state.bootMode === 'safe' || state.infected
  const bonziOpen = state.windows.some((win) => win.appId === 'bonzi')
  const { installed } = state.bonzi

  // What the startup entries looked like when Windows started, so later changes
  // (System Configuration, an uninstall) only take effect at the next boot.
  const [atBoot] = useState(() => ({
    startsWithWindows: state.bonzi.installed && state.bonzi.runAtStartup,
    updaterArmed: !state.bonzi.installed && bonziUpdaterArmed(state.bonzi, state.fs),
    blocked,
  }))

  useEffect(() => {
    if (atBoot.blocked) return
    let timer = 0
    if (atBoot.updaterArmed) {
      timer = window.setTimeout(() => {
        bonziOps.install()
        notify('BonziUPDATE', 'A new version of BonziBUDDY was installed successfully.', {
          kind: 'info',
          dedupeKey: 'bonzi-update',
        })
        openApp('bonzi', { bonziEntrance: 'reinstalled' })
      }, STARTUP_DELAY_MS)
    } else if (atBoot.startsWithWindows) {
      timer = window.setTimeout(() => openApp('bonzi', { bonziEntrance: 'startup' }), STARTUP_DELAY_MS)
    }
    return () => window.clearTimeout(timer)
  }, [atBoot, bonziOps, notify, openApp])

  // Once he has run this session he keeps a process in the tray (derived during
  // render: it only ever flips to true).
  const [ranThisBoot, setRanThisBoot] = useState(false)
  if (bonziOpen && !ranThisBoot) setRanThisBoot(true)

  // Close him and he is back a minute later, for as long as he is installed.
  useEffect(() => {
    if (!installed || bonziOpen || blocked || !ranThisBoot) return
    const timer = window.setTimeout(() => openApp('bonzi', { bonziEntrance: 'respawn' }), RESPAWN_DELAY_MS)
    return () => window.clearTimeout(timer)
  }, [installed, bonziOpen, blocked, ranThisBoot, openApp])

  return { inTray: installed && !blocked && (bonziOpen || ranThisBoot || atBoot.startsWithWindows) }
}
