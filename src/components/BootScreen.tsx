import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  biosLines,
  bootDeviceOptions,
  bootDriverLines,
  bootSequences,
  osCreditLine,
  osCreditName,
  osProductName,
  type BootDeviceOption,
} from '../data/system'
import { bootSequenceLabel } from '../data/bios'
import { win98Icons } from '../data/icons'
import { useOs } from '../os/useOs'
import { isSystemHealthy } from '../os/recovery'

type Stage = 'post' | 'menu' | 'booting' | 'failed'

// Cold boot is deliberately leisurely; the user must pick a boot device by hand.
const POST_MS = 4200
const DRIVER_MS = 7200
const SPLASH_MS = 4200
// A warm restart skips POST + device selection and boots straight through.
const WARM_DRIVER_MS = 2600
const WARM_SPLASH_MS = 3000

/** What the BIOS prints when you try to boot a device with no operating system on it. */
function failureLines(option: BootDeviceOption): string[] {
  if (option.device === 'CD-ROM') {
    return [
      'Booting from ATAPI CD-ROM...',
      '',
      'No bootable optical disc in PORTFOLIO CD-ROM 24X.',
      'CDBOOT: Couldn’t find operating system - code 5',
      '',
      'Reboot and select proper Boot device,',
      'or insert Boot Media in selected Boot device and press a key.',
    ]
  }
  if (option.device === 'A:') {
    return [
      'Booting from Floppy Drive A:...',
      '',
      'Non-System disk or disk error',
      'Replace and press any key when ready',
    ]
  }
  return ['DISK BOOT FAILURE, INSERT SYSTEM DISK AND PRESS ENTER']
}

export function BootScreen() {
  const { state, finishBoot, restart, enterBiosSetup, enterBootDeviceMenu } = useOs()
  const isWarmBoot = state.bootProfile === 'warm'

  const [stage, setStage] = useState<Stage>(isWarmBoot ? 'booting' : 'post')
  const [selected, setSelected] = useState(1)
  const [failedOption, setFailedOption] = useState<BootDeviceOption | null>(null)
  const [postElapsed, setPostElapsed] = useState(isWarmBoot ? POST_MS : 0)
  const [bootElapsed, setBootElapsed] = useState(0)
  const scrollRef = useRef<HTMLDivElement>(null)

  const bootKind = useMemo(() => {
    if (state.bootTarget === 'safe') return 'safe'
    if (state.bootTarget === 'normal' && !isSystemHealthy(state.fs)) return 'failed'
    return 'normal'
  }, [state.bootTarget, state.fs])

  const driverMs = isWarmBoot ? WARM_DRIVER_MS : DRIVER_MS
  const splashMs = isWarmBoot ? WARM_SPLASH_MS : SPLASH_MS

  // POST reveal, then PAUSE at the device menu (cold boot only — no auto-advance).
  useEffect(() => {
    if (stage !== 'post') return
    const startedAt = Date.now()
    const interval = window.setInterval(() => {
      const elapsed = Date.now() - startedAt
      setPostElapsed(elapsed)
      if (elapsed >= POST_MS) {
        window.clearInterval(interval)
        setStage('menu')
      }
    }, 100)
    return () => window.clearInterval(interval)
  }, [stage])

  // Boot animation (driver log → splash) then hand off to Windows.
  useEffect(() => {
    if (stage !== 'booting') return
    const startedAt = Date.now()
    const interval = window.setInterval(() => setBootElapsed(Date.now() - startedAt), 100)
    const done = window.setTimeout(() => finishBoot(), driverMs + splashMs)
    return () => {
      window.clearInterval(interval)
      window.clearTimeout(done)
    }
  }, [stage, driverMs, splashMs, finishBoot])

  // Keep the newest boot lines in view, like a real console scrolling upward.
  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [postElapsed, bootElapsed, stage])

  const confirmDevice = useCallback((id: number) => {
    const option = bootDeviceOptions.find((item) => item.id === id) ?? bootDeviceOptions[0]
    if (option.device === 'C:') {
      setBootElapsed(0)
      setStage('booting')
    } else {
      setFailedOption(option)
      setStage('failed')
    }
  }, [])

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (!isWarmBoot && (event.key === 'Delete' || event.key.toLowerCase() === 'del')) {
        event.preventDefault()
        enterBiosSetup()
        return
      }
      if (!isWarmBoot && event.key === 'F12') {
        event.preventDefault()
        enterBootDeviceMenu()
        return
      }
      if (!isWarmBoot && event.key === 'F8') {
        event.preventDefault()
        restart('bootMenu', { bootProfile: 'warm' })
        return
      }
      if (stage === 'failed') {
        event.preventDefault()
        setFailedOption(null)
        setStage('menu')
        return
      }
      if (stage === 'menu') {
        if (event.key >= '1' && event.key <= String(bootDeviceOptions.length)) {
          event.preventDefault()
          confirmDevice(Number(event.key))
        } else if (event.key === 'ArrowDown') {
          event.preventDefault()
          setSelected((current) => (current % bootDeviceOptions.length) + 1)
        } else if (event.key === 'ArrowUp') {
          event.preventDefault()
          setSelected((current) => ((current + bootDeviceOptions.length - 2) % bootDeviceOptions.length) + 1)
        } else if (event.key === 'Enter') {
          event.preventDefault()
          confirmDevice(selected)
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [stage, selected, isWarmBoot, confirmDevice, enterBiosSetup, enterBootDeviceMenu, restart])

  const visiblePostLines = useMemo(() => {
    const progress = Math.min(1, postElapsed / POST_MS)
    const activeLine = Math.max(1, Math.ceil(progress * biosLines.length))
    return biosLines.slice(0, activeLine)
  }, [postElapsed])

  // Only the hard disk reaches the boot animation, so the driver log is always C:.
  const hardDisk = bootDeviceOptions[0]
  const driverLines = useMemo(
    () =>
      isWarmBoot
        ? ['Restarting Windows...', '', ...bootSequences[bootKind], '', 'C:\\>WIN']
        : [...bootDriverLines(hardDisk), '', ...bootSequences[bootKind], '', 'C:\\>WIN'],
    [bootKind, isWarmBoot, hardDisk],
  )
  const visibleDriverLines = useMemo(() => {
    const progress = Math.min(1, bootElapsed / driverMs)
    const activeLine = Math.max(1, Math.ceil(progress * driverLines.length))
    return driverLines.slice(0, activeLine)
  }, [bootElapsed, driverMs, driverLines])

  const showSplash = stage === 'booting' && bootElapsed >= driverMs && bootKind !== 'failed'
  const progress =
    stage === 'booting' ? Math.min(100, Math.round((bootElapsed / (driverMs + splashMs)) * 100)) : 0

  if (showSplash) {
    return (
      <main className="boot-screen boot-splash-screen" aria-live="polite">
        <section className="boot-splash">
          <img className="boot-splash-logo" src={win98Icons.windows} alt="" />
          <div className="boot-splash-title">
            <span>Microsoft</span>
            <strong>Windows 98</strong>
            <em>Portfolio Edition</em>
          </div>
          <p className="boot-splash-credit">{osCreditName}</p>
          <div className="boot-splash-status" aria-label={`${progress}% loaded`}>
            <span>Starting up</span>
            <i />
            <i />
            <i />
          </div>
        </section>
      </main>
    )
  }

  // The startup device menu is its own screen so nothing overlaps the choices.
  if (stage === 'menu') {
    return (
      <main className="boot-screen boot-terminal-screen" aria-live="polite">
        <section className="boot-terminal boot-terminal-menu" aria-label={`${osProductName} startup`}>
          <div className="boot-device-menu">
            <p>{osProductName}</p>
            <p>Award Modular BIOS &mdash; Startup Device Menu</p>
            <p className="boot-device-hint">
              Choose the device to boot from, then press Enter. Only the Hard Disk has an operating
              system installed.
            </p>
            <ol>
              {bootDeviceOptions.map((option) => (
                <li key={option.id}>
                  <button
                    type="button"
                    className={selected === option.id ? 'selected' : ''}
                    onMouseEnter={() => setSelected(option.id)}
                    onClick={() => confirmDevice(option.id)}
                  >
                    {option.id}. {option.label}
                  </button>
                </li>
              ))}
            </ol>
            <p>
              Enter a choice: {selected}
              <span className="boot-caret" aria-hidden="true" />
            </p>
          </div>
          <footer>
            <span>{osCreditLine}</span>
            <span>Del: Setup&nbsp;&nbsp;F8: Startup Menu&nbsp;&nbsp;F12: Boot Devices</span>
          </footer>
        </section>
      </main>
    )
  }

  return (
    <main className="boot-screen boot-terminal-screen" aria-live="polite">
      <section className="boot-terminal" aria-label={`${osProductName} startup`}>
        <div className="boot-terminal-scroll" ref={scrollRef}>
          <pre>{(isWarmBoot ? [] : visiblePostLines).join('\n')}</pre>

          {stage === 'booting' && (
            <pre className="boot-driver-log">
              {!isWarmBoot && `Booting from ${hardDisk.device} ...\n\n`}
              {visibleDriverLines.join('\n')}
              {bootKind === 'failed' ? '\n\nPress any key to continue...' : ''}
            </pre>
          )}

          {stage === 'failed' && failedOption && (
            <pre className="boot-driver-log boot-failure">{failureLines(failedOption).join('\n')}</pre>
          )}
        </div>

        <footer>
          <span>{osCreditLine}</span>
          <span>
            {stage === 'failed'
              ? 'Boot device failed — press any key to choose another'
              : `${bootSequenceLabel(state.bios)} / ${progress}%`}
          </span>
        </footer>
      </section>
    </main>
  )
}
