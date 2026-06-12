import { useEffect, useRef, useState } from 'react'

const colors = ['#000000', '#808080', '#ffffff', '#ff0000', '#ffff00', '#00aa00', '#0000ff', '#800080']

export function PaintApp() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const drawingRef = useRef(false)
  const lastPointRef = useRef<{ x: number; y: number } | null>(null)
  const [color, setColor] = useState('#000000')
  const [tool, setTool] = useState<'pencil' | 'eraser' | 'line'>('pencil')
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    const canvas = canvasRef.current
    const context = canvas?.getContext('2d')
    if (!canvas || !context) return
    context.fillStyle = '#ffffff'
    context.fillRect(0, 0, canvas.width, canvas.height)
  }, [])

  function point(event: React.PointerEvent<HTMLCanvasElement>) {
    const rect = event.currentTarget.getBoundingClientRect()
    return {
      x: ((event.clientX - rect.left) / rect.width) * event.currentTarget.width,
      y: ((event.clientY - rect.top) / rect.height) * event.currentTarget.height,
    }
  }

  function drawTo(event: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current
    const context = canvas?.getContext('2d')
    const last = lastPointRef.current
    if (!canvas || !context || !last) return
    const next = point(event)
    context.strokeStyle = tool === 'eraser' ? '#ffffff' : color
    context.lineWidth = tool === 'eraser' ? 12 : 2
    context.lineCap = 'square'
    context.beginPath()
    context.moveTo(last.x, last.y)
    context.lineTo(next.x, next.y)
    context.stroke()
    lastPointRef.current = next
  }

  function clearCanvas() {
    const canvas = canvasRef.current
    const context = canvas?.getContext('2d')
    if (!canvas || !context) return
    context.fillStyle = '#ffffff'
    context.fillRect(0, 0, canvas.width, canvas.height)
    setSaved(false)
  }

  return (
    <div className="paint-app">
      <div className="paint-toolbar">
        <button type="button" className={tool === 'pencil' ? 'active-tool' : ''} onClick={() => setTool('pencil')}>
          Pencil
        </button>
        <button type="button" className={tool === 'line' ? 'active-tool' : ''} onClick={() => setTool('line')}>
          Line
        </button>
        <button type="button" className={tool === 'eraser' ? 'active-tool' : ''} onClick={() => setTool('eraser')}>
          Eraser
        </button>
        <button type="button" onClick={clearCanvas}>
          Clear
        </button>
        <button type="button" onClick={() => setSaved(true)}>
          Save
        </button>
      </div>
      <div className="paint-layout">
        <div className="paint-colors">
          {colors.map((swatch) => (
            <button
              key={swatch}
              type="button"
              className={color === swatch ? 'selected-color' : ''}
              style={{ backgroundColor: swatch }}
              aria-label={swatch}
              onClick={() => setColor(swatch)}
            />
          ))}
        </div>
        <div className="sunken-panel paint-canvas-wrap">
          <canvas
            ref={canvasRef}
            width={640}
            height={360}
            onPointerDown={(event) => {
              drawingRef.current = true
              lastPointRef.current = point(event)
              event.currentTarget.setPointerCapture(event.pointerId)
            }}
            onPointerMove={(event) => {
              if (drawingRef.current) drawTo(event)
            }}
            onPointerUp={() => {
              drawingRef.current = false
              lastPointRef.current = null
            }}
            onPointerCancel={() => {
              drawingRef.current = false
              lastPointRef.current = null
            }}
          />
        </div>
      </div>
      <div className="status-bar">
        <p className="status-bar-field">Tool: {tool}</p>
        <p className="status-bar-field">{saved ? 'Saved to C:\\My Documents\\Untitled.bmp' : 'Unsaved bitmap'}</p>
      </div>
    </div>
  )
}
