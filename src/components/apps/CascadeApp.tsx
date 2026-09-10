import './CascadeApp.css'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { AppProps } from '../../types'
import { useOs } from '../../os/useOs'

const SAMPLE_TEXT = `MICROSOFT WINDOWS 98 [Version 4.10.1998]
(C) Copyright Microsoft Corp 1981-1998.

A:\\> DIR
Directory of A:\\
IO       SYS        222,390  05-11-98  12:00p
MSDOS    SYS              9  05-11-98  12:00p
COMMAND  COM         93,880  05-11-98  12:00p
CASCADE  COM          1,704  10-12-90   1:30a

Warning: TSR interrupt 21h vector intercepted.
Memory parity check error. System characters losing gravity...`

type FallingLetter = {
  id: number
  char: string
  origX: number
  origY: number
  x: number
  y: number
  vy: number
  fallen: boolean
  falling: boolean
}

// Build the initial (settled) letter grid from the sample text. Pure — no state,
// so it can be used both as a lazy useState initializer and by the Reset button.
function buildLetters(): FallingLetter[] {
  const lines = SAMPLE_TEXT.split('\n')
  const parsed: FallingLetter[] = []
  let idCounter = 0

  lines.forEach((line, lineIdx) => {
    line.split('').forEach((char, charIdx) => {
      const origX = 16 + charIdx * 9.5
      const origY = 24 + lineIdx * 19
      parsed.push({
        id: idCounter++,
        char,
        origX,
        origY,
        x: origX,
        y: origY,
        vy: 0,
        fallen: false,
        falling: false,
      })
    })
  })
  return parsed
}

export function CascadeApp({ windowId }: AppProps) {
  const { playSound, setWindowTitle } = useOs()
  const [isCascading, setIsCascading] = useState(false)
  const [letters, setLetters] = useState<FallingLetter[]>(buildLetters)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const animFrame = useRef<number | null>(null)

  useEffect(() => {
    setWindowTitle(windowId, 'Cascade Effect - 1990 Virus Sim')
  }, [setWindowTitle, windowId])

  const initLetters = useCallback(() => {
    setLetters(buildLetters())
    setIsCascading(false)
  }, [])

  const triggerCascade = useCallback(() => {
    if (isCascading) return
    setIsCascading(true)
    playSound('error')
  }, [isCascading, playSound])

  useEffect(() => {
    if (!isCascading) return

    const containerHeight = containerRef.current?.clientHeight || 320
    const bottomLimit = containerHeight - 30

    const dropInterval = window.setInterval(() => {
      setLetters((prev) => {
        const available = prev.filter((l) => !l.falling && !l.fallen && l.char.trim() !== '')
        if (available.length === 0) return prev

        // Pick 2-3 random unfallen letters to begin falling
        const pickCount = Math.min(3, available.length)
        const chosenIds = new Set<number>()
        for (let i = 0; i < pickCount; i++) {
          const randIdx = Math.floor(Math.random() * available.length)
          chosenIds.add(available[randIdx].id)
        }

        return prev.map((l) => (chosenIds.has(l.id) ? { ...l, falling: true, vy: 1.8 } : l))
      })
    }, 90)

    function loop() {
      setLetters((prev) =>
        prev.map((l) => {
          if (!l.falling || l.fallen) return l
          const nextY = l.y + l.vy
          const nextVy = l.vy + 0.35 // gravity

          if (nextY >= bottomLimit) {
            // Has hit the ground pile
            const pileJitterX = l.origX + (Math.random() * 8 - 4)
            return {
              ...l,
              y: bottomLimit + (Math.random() * 8 - 4),
              x: pileJitterX,
              falling: false,
              fallen: true,
              vy: 0,
            }
          }
          return { ...l, y: nextY, vy: nextVy }
        }),
      )
      animFrame.current = requestAnimationFrame(loop)
    }

    animFrame.current = requestAnimationFrame(loop)

    return () => {
      window.clearInterval(dropInterval)
      if (animFrame.current) cancelAnimationFrame(animFrame.current)
    }
  }, [isCascading])

  return (
    <div className="cascade-app" ref={containerRef}>
      <div className="cascade-toolbar">
        <button type="button" onClick={triggerCascade} disabled={isCascading}>
          Trigger Cascade (Drop Letters)
        </button>
        <button type="button" onClick={initLetters}>
          Reset Text
        </button>
        <span className="cascade-info">1990 Malware Museum Simulation</span>
      </div>

      <div className="cascade-screen" aria-label="Cascade Text Display">
        {letters.map((l) => (
          <span
            key={l.id}
            className={`cascade-char ${l.fallen ? 'is-fallen' : ''} ${l.falling ? 'is-falling' : ''}`}
            style={{
              left: `${l.x}px`,
              top: `${l.y}px`,
            }}
          >
            {l.char === ' ' ? '\u00A0' : l.char}
          </span>
        ))}
      </div>
    </div>
  )
}
