import { useEffect, useState } from 'react'
import { useOs } from '../../os/useOs'
import { isSystemHealthy } from '../../os/recovery'
import { bootMenuOptions, bootMenuTitle, bootMenuUnhealthyWarning } from '../../data/system'

export function BootMenu() {
  const { state, restart } = useOs()
  const [selected, setSelected] = useState(0)
  const unhealthy = !isSystemHealthy(state.fs)

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'ArrowDown') {
        event.preventDefault()
        setSelected((current) => (current + 1) % bootMenuOptions.length)
      }
      if (event.key === 'ArrowUp') {
        event.preventDefault()
        setSelected((current) => (current - 1 + bootMenuOptions.length) % bootMenuOptions.length)
      }
      if (event.key === 'Enter') {
        event.preventDefault()
        restart(bootMenuOptions[selected].id, { bootProfile: 'warm' })
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [restart, selected])

  return (
    <main className="boot-menu-screen">
      <section className="boot-menu-panel">
        <h1>{bootMenuTitle}</h1>
        <p>Use the arrow keys to highlight your choice.</p>
        {unhealthy && <p className="boot-warning">{bootMenuUnhealthyWarning}</p>}
        <ol>
          {bootMenuOptions.map((option, index) => (
            <li key={option.id}>
              <button
                type="button"
                className={selected === index ? 'selected' : ''}
                onMouseEnter={() => setSelected(index)}
                onClick={() => restart(option.id, { bootProfile: 'warm' })}
              >
                {index + 1}. {option.label}
              </button>
            </li>
          ))}
        </ol>
        <p className="boot-muted">Enter a choice: {selected + 1}</p>
      </section>
    </main>
  )
}
