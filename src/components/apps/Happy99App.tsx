import './Happy99App.css'
import { useEffect, useRef, useState } from 'react'
import type { AppProps } from '../../types'
import { useOs } from '../../os/useOs'

type Particle = {
  x: number
  y: number
  vx: number
  vy: number
  color: string
  alpha: number
  decay: number
}

const COLORS = ['#ff2222', '#22ff22', '#ffff22', '#22ffff', '#ff22ff', '#ffffff', '#ffaa00']

export function Happy99App({ windowId }: AppProps) {
  const { playSound, setWindowTitle } = useOs()
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [fireworkCount, setFireworkCount] = useState(0)

  useEffect(() => {
    setWindowTitle(windowId, 'Happy New Year 1999 !!')
  }, [setWindowTitle, windowId])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animationFrame: number
    const particles: Particle[] = []

    function spawnRocket() {
      if (!canvas) return
      const startX = Math.random() * (canvas.width - 100) + 50
      const targetY = Math.random() * (canvas.height * 0.5) + 30
      const color = COLORS[Math.floor(Math.random() * COLORS.length)]

      const particleCount = 45
      for (let i = 0; i < particleCount; i++) {
        const angle = (Math.PI * 2 * i) / particleCount + (Math.random() - 0.5) * 0.4
        const speed = Math.random() * 3.5 + 1.2
        particles.push({
          x: startX,
          y: targetY,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          color,
          alpha: 1,
          decay: Math.random() * 0.015 + 0.01,
        })
      }
      setFireworkCount((c) => c + 1)
      try {
        playSound('tada')
      } catch {
        // ignore
      }
    }

    spawnRocket()
    const interval = window.setInterval(spawnRocket, 1800)

    function loop() {
      if (!ctx || !canvas) return
      ctx.fillStyle = 'rgba(0, 0, 0, 0.22)'
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      ctx.font = 'bold 16px "Courier New", monospace'
      ctx.fillStyle = '#ffff00'
      ctx.textAlign = 'center'
      ctx.fillText('Happy New Year 1999 !!', canvas.width / 2, 28)

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i]
        p.x += p.vx
        p.y += p.vy
        p.vy += 0.04
        p.alpha -= p.decay

        if (p.alpha <= 0) {
          particles.splice(i, 1)
          continue
        }

        ctx.save()
        ctx.globalAlpha = p.alpha
        ctx.fillStyle = p.color
        ctx.shadowColor = p.color
        ctx.shadowBlur = 4
        ctx.fillRect(p.x, p.y, 3, 3)
        ctx.restore()
      }

      animationFrame = requestAnimationFrame(loop)
    }

    loop()

    return () => {
      window.clearInterval(interval)
      cancelAnimationFrame(animationFrame)
    }
  }, [playSound])

  return (
    <div className="happy99-app">
      <div className="happy99-display">
        <canvas ref={canvasRef} width={380} height={240} className="happy99-canvas" />
      </div>
      <div className="happy99-footer">
        <p className="happy99-greeting">
          <strong>Wishing you A Happy and Prosperous New Year 1999!</strong>
        </p>
        <p className="happy99-trivia">
          <em>Historical Note:</em> Happy99 (Ska) was the first modern email worm (Jan 1999). It showed this fireworks
          greeting while automatically appending itself to outbound Outlook mail.
        </p>
        <div className="happy99-counter">Fireworks launched: {fireworkCount}</div>
      </div>
    </div>
  )
}
