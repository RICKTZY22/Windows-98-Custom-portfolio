import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  biosLines,
  bootDeviceOptions,
  bootDriverLines,
  bootSequences,
  osCreditLine,
  osCreditName,
  osProductName,
} from '../data/system'
import { win98Icons } from '../data/icons'
import { useOs } from '../os/useOs'
import { isSystemHealthy } from '../os/recovery'

type BootScreenProps = {
  durationMs?: number
}

export function BootScreen({ durationMs = 10000 }: BootScreenProps) {
  const { state, finishBoot } = useOs()
  const [elapsed, setElapsed] = useState(0)
  const [selectedChoice, setSelectedChoice] = useState(1)
  const [confirmedChoice, setConfirmedChoice] = useState<number | null>(state.bootProfile === 'warm' ? 1 : null)
  const [choiceConfirmedAt, setChoiceConfirmedAt] = useState<number | null>(state.bootProfile === 'warm' ? 0 : null)
  const isWarmBoot = state.bootProfile === 'warm'

  const bootKind = useMemo(() => {
    if (state.bootTarget === 'safe') return 'safe'
    if (state.bootTarget === 'normal' && !isSystemHealthy(state.fs)) return 'failed'
    return 'normal'
  }, [state.bootTarget, state.fs])

  const activeChoice = confirmedChoice ?? selectedChoice
  const selectedBootOption = bootDeviceOptions.find((option) => option.id === activeChoice) ?? bootDeviceOptions[0]

  // Taglish note: cold boot shows BIOS + device choices; warm boot is normal
  // Windows restart, kaya diretso driver log/splash without BIOS checks.
  const postEndMs = isWarmBoot ? 0 : Math.round(durationMs * 0.3)
  const menuEndMs = isWarmBoot ? 0 : Math.round(durationMs * 0.75)
  const driverStartMs = choiceConfirmedAt ?? menuEndMs
  const driverEndMs = isWarmBoot ? Math.round(durationMs * 0.38) : Math.round(durationMs * 0.82)
  const progress = Math.min(100, Math.round((elapsed / durationMs) * 100))
  const showStartupChoices = !isWarmBoot && elapsed >= postEndMs && elapsed < driverStartMs
  const showSplash =
    elapsed >= driverEndMs &&
    bootKind !== 'failed' &&
    (state.bootTarget === 'normal' || state.bootTarget === 'safe')

  const visiblePostLines = useMemo(() => {
    if (isWarmBoot) return []
    const postProgress = Math.min(1, elapsed / postEndMs)
    const activeLine = Math.max(1, Math.ceil(postProgress * biosLines.length))
    return biosLines.slice(0, activeLine)
  }, [elapsed, isWarmBoot, postEndMs])

  const driverLines = useMemo(
    () =>
      isWarmBoot
        ? ['Restarting Windows...', '', ...bootSequences[bootKind], '', 'C:\\>WIN']
        : [...bootDriverLines(selectedBootOption), '', ...bootSequences[bootKind], '', 'C:\\>WIN'],
    [bootKind, isWarmBoot, selectedBootOption],
  )

  const visibleDriverLines = useMemo(() => {
    if (elapsed < driverStartMs) return []
    const driverDuration = Math.max(1, driverEndMs - driverStartMs)
    const driverProgress = Math.min(1, (elapsed - driverStartMs) / driverDuration)
    const activeLine = Math.max(1, Math.ceil(driverProgress * driverLines.length))
    return driverLines.slice(0, activeLine)
  }, [driverEndMs, driverLines, driverStartMs, elapsed])

  const confirmChoice = useCallback((choice: number) => {
    if (isWarmBoot) return
    setSelectedChoice(choice)
    setConfirmedChoice(choice)
    setChoiceConfirmedAt(Math.max(elapsed, postEndMs))
  }, [elapsed, isWarmBoot, postEndMs])

  useEffect(() => {
    const startedAt = Date.now()
    const interval = window.setInterval(() => {
      setElapsed(Math.min(durationMs, Date.now() - startedAt))
    }, 120)
    const timeout = window.setTimeout(() => finishBoot(), durationMs)
    return () => {
      window.clearInterval(interval)
      window.clearTimeout(timeout)
    }
  }, [durationMs, finishBoot])

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key >= '1' && event.key <= '3') {
        const nextChoice = Number(event.key)
        if (showStartupChoices) {
          confirmChoice(nextChoice)
        } else {
          setSelectedChoice(nextChoice)
        }
      }
      if (event.key === 'ArrowDown') {
        event.preventDefault()
        setSelectedChoice((current) => (current % bootDeviceOptions.length) + 1)
      }
      if (event.key === 'ArrowUp') {
        event.preventDefault()
        setSelectedChoice((current) => ((current + bootDeviceOptions.length - 2) % bootDeviceOptions.length) + 1)
      }
      if (event.key === 'Enter' && showStartupChoices) {
        event.preventDefault()
        confirmChoice(selectedChoice)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [confirmChoice, selectedChoice, showStartupChoices])

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

  return (
    <main className="boot-screen boot-terminal-screen" aria-live="polite">
      <section className="boot-terminal" aria-label={`${osProductName} startup`}>
        <pre>{visiblePostLines.join('\n')}</pre>

        {showStartupChoices && (
          <div className="boot-device-menu">
            <p>{osProductName} Startup Menu</p>
            <p>Select startup device support:</p>
            <ol>
              {bootDeviceOptions.map((option) => (
                <li key={option.id}>
                  <button
                    type="button"
                    className={selectedChoice === option.id ? 'selected' : ''}
                    onClick={() => confirmChoice(option.id)}
                  >
                    {option.id}. {option.label}
                  </button>
                </li>
              ))}
            </ol>
            <p>
              Enter a choice: {selectedChoice}
              <span className="boot-caret" aria-hidden="true" />
            </p>
          </div>
        )}

        {elapsed >= driverStartMs && (
          <pre className="boot-driver-log">
            Enter a choice: {activeChoice}
            {'\n\n'}
            {visibleDriverLines.join('\n')}
            {bootKind === 'failed' ? '\n\nPress any key to continue...' : ''}
          </pre>
        )}

        <footer>
          <span>{osCreditLine}</span>
          <span>
            {selectedBootOption.device} / {progress}%
          </span>
        </footer>
      </section>
    </main>
  )
}
