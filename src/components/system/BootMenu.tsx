import { useEffect, useState } from 'react'
import { useOs } from '../../os/useOs'
import { isSystemHealthy } from '../../os/recovery'
import { bootMenuOptions, bootMenuTitle, bootMenuUnhealthyWarning } from '../../data/system'

// The F8 startup menu, styled to match the Award BIOS Setup screen (see
// BiosSetupScreen.tsx / styles/bios.css): a blue monospace screen with a centered
// double-ruled frame, a selection list, a footer key-help bar and a live hint for
// the highlighted choice.
export function BootMenu() {
  const { state, restart } = useOs()
  const [selected, setSelected] = useState(0)
  const unhealthy = !isSystemHealthy(state.fs)

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'ArrowDown') {
        event.preventDefault()
        setSelected((current) => (current + 1) % bootMenuOptions.length)
      } else if (event.key === 'ArrowUp') {
        event.preventDefault()
        setSelected((current) => (current - 1 + bootMenuOptions.length) % bootMenuOptions.length)
      } else if (event.key === 'Enter') {
        event.preventDefault()
        restart(bootMenuOptions[selected].id, { bootProfile: 'warm' })
      } else if (event.key === 'Escape') {
        event.preventDefault()
        restart('normal', { bootProfile: 'warm' })
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [restart, selected])

  const active = bootMenuOptions[selected]

  return (
    <main className="boot-menu-screen" aria-label="Windows startup menu">
      <section className="boot-menu-frame">
        <header className="boot-menu-titlebar">{bootMenuTitle}</header>
        <div className="boot-menu-main">
          <h1 className="boot-menu-heading">Select an operating mode</h1>
          {unhealthy && <p className="boot-menu-warning">{bootMenuUnhealthyWarning}</p>}
          <ol className="boot-menu-options">
            {bootMenuOptions.map((option, index) => (
              <li key={option.id}>
                <button
                  type="button"
                  className={`boot-menu-row ${selected === index ? 'selected' : ''}`}
                  aria-current={selected === index ? 'true' : undefined}
                  onMouseEnter={() => setSelected(index)}
                  onClick={() => restart(option.id, { bootProfile: 'warm' })}
                >
                  <span aria-hidden="true">{selected === index ? '►' : ' '}</span>
                  {index + 1}. {option.label}
                </button>
              </li>
            ))}
          </ol>
        </div>
        <footer className="boot-menu-help">
          <div className="boot-menu-key-help" aria-label="Startup menu controls">
            <span>{'↑↓'} : Select Item</span>
            <span>Enter : Boot Selection</span>
            <span>Esc : Normal</span>
          </div>
          <p className="boot-menu-hint">{active?.hint}</p>
          <p className="boot-menu-prompt">Enter a choice: {selected + 1}</p>
        </footer>
      </section>
    </main>
  )
}
