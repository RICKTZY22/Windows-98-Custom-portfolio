import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import type { AppProps } from '../../types'
import { baseName, getNode, joinPath } from '../../os/filesystem'
import { useOs } from '../../os/useOs'

type PaintTool = 'pencil' | 'brush' | 'eraser' | 'line' | 'rect' | 'ellipse' | 'fill' | 'text'

const colors = [
  '#000000',
  '#808080',
  '#800000',
  '#808000',
  '#008000',
  '#008080',
  '#000080',
  '#800080',
  '#ffffff',
  '#c0c0c0',
  '#ff0000',
  '#ffff00',
  '#00ff00',
  '#00ffff',
  '#0000ff',
  '#ff00ff',
]

const tools: Array<{ id: PaintTool; label: string }> = [
  { id: 'pencil', label: 'Pencil' },
  { id: 'brush', label: 'Brush' },
  { id: 'eraser', label: 'Eraser' },
  { id: 'fill', label: 'Fill' },
  { id: 'text', label: 'Text' },
  { id: 'line', label: 'Line' },
  { id: 'rect', label: 'Rect' },
  { id: 'ellipse', label: 'Oval' },
]

function point(event: ReactPointerEvent<HTMLCanvasElement>) {
  const rect = event.currentTarget.getBoundingClientRect()
  return {
    x: ((event.clientX - rect.left) / rect.width) * event.currentTarget.width,
    y: ((event.clientY - rect.top) / rect.height) * event.currentTarget.height,
  }
}

function normalizePaintSaveName(name: string): string {
  const trimmed = name.trim() || 'Untitled.png'
  if (/\.[a-z0-9]+$/i.test(trimmed)) {
    return trimmed
  }
  return `${trimmed.replace(/\.+$/, '') || 'Untitled'}.png`
}

export function PaintApp({ windowId, payload }: AppProps) {
  const { state, fsOps, setWindowTitle, showMessageBox } = useOs()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const snapshotRef = useRef<ImageData | null>(null)
  const startPointRef = useRef<{ x: number; y: number } | null>(null)
  const drawingRef = useRef(false)
  const [color, setColor] = useState('#000000')
  const [tool, setTool] = useState<PaintTool>('pencil')
  const [saved, setSaved] = useState(false)
  const [saveAsName, setSaveAsName] = useState('Untitled.png')
  const file = payload?.filePath ? getNode(state.fs, payload.filePath) : undefined

  useEffect(() => {
    const canvas = canvasRef.current
    const context = canvas?.getContext('2d')
    if (!canvas || !context) return
    context.fillStyle = '#ffffff'
    context.fillRect(0, 0, canvas.width, canvas.height)
    if (file?.dataUrl) {
      const image = new Image()
      image.onload = () => {
        context.drawImage(image, 0, 0, canvas.width, canvas.height)
      }
      image.src = file.dataUrl
    }
    setSaveAsName(file?.name ?? 'Untitled.png')
    setSaved(Boolean(file?.dataUrl))
  }, [file?.dataUrl, file?.name])

  function context2d() {
    return canvasRef.current?.getContext('2d') ?? null
  }

  function begin(event: ReactPointerEvent<HTMLCanvasElement>) {
    const context = context2d()
    const canvas = canvasRef.current
    if (!context || !canvas) return
    const p = point(event)
    if (tool === 'fill') {
      context.fillStyle = color
      context.fillRect(0, 0, canvas.width, canvas.height)
      setSaved(false)
      return
    }
    if (tool === 'text') {
      const text = window.prompt('Text:', 'Portfolio 98')
      if (text) {
        context.fillStyle = color
        context.font = '18px "Courier New", monospace'
        context.fillText(text, p.x, p.y)
        setSaved(false)
      }
      return
    }
    drawingRef.current = true
    startPointRef.current = p
    snapshotRef.current = context.getImageData(0, 0, canvas.width, canvas.height)
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  function draw(event: ReactPointerEvent<HTMLCanvasElement>) {
    const context = context2d()
    const canvas = canvasRef.current
    const start = startPointRef.current
    if (!context || !canvas || !start || !drawingRef.current) return
    const next = point(event)
    context.strokeStyle = tool === 'eraser' ? '#ffffff' : color
    context.fillStyle = color
    context.lineWidth = tool === 'brush' ? 6 : tool === 'eraser' ? 14 : 2
    context.lineCap = 'square'

    if (tool === 'pencil' || tool === 'brush' || tool === 'eraser') {
      context.beginPath()
      context.moveTo(start.x, start.y)
      context.lineTo(next.x, next.y)
      context.stroke()
      startPointRef.current = next
      setSaved(false)
      return
    }

    if (snapshotRef.current) {
      context.putImageData(snapshotRef.current, 0, 0)
    }
    const x = Math.min(start.x, next.x)
    const y = Math.min(start.y, next.y)
    const width = Math.abs(next.x - start.x)
    const height = Math.abs(next.y - start.y)
    context.beginPath()
    if (tool === 'line') {
      context.moveTo(start.x, start.y)
      context.lineTo(next.x, next.y)
    } else if (tool === 'ellipse') {
      context.ellipse(x + width / 2, y + height / 2, width / 2, height / 2, 0, 0, Math.PI * 2)
    } else {
      context.rect(x, y, width, height)
    }
    context.stroke()
    setSaved(false)
  }

  function end() {
    drawingRef.current = false
    startPointRef.current = null
    snapshotRef.current = null
  }

  function clearCanvas() {
    const canvas = canvasRef.current
    const context = context2d()
    if (!canvas || !context) return
    context.fillStyle = '#ffffff'
    context.fillRect(0, 0, canvas.width, canvas.height)
    setSaved(false)
  }

  function save() {
    const canvas = canvasRef.current
    if (!canvas) return
    const target = payload?.filePath ?? joinPath('C:\\My Pictures', normalizePaintSaveName(saveAsName))
    const error = fsOps.writeFile(target, { dataUrl: canvas.toDataURL('image/png') })
    if (error) {
      showMessageBox({ title: 'Paint', message: error, icon: 'error', buttons: ['ok'] })
      return
    }
    const savedName = baseName(target)
    setSaveAsName(savedName)
    setWindowTitle(windowId, `${savedName} - Paint`)
    setSaved(true)
  }

  return (
    <div className="paint-app">
      <ul className="os-menu-bar" role="menubar">
        <li>File</li>
        <li>Edit</li>
        <li>View</li>
        <li>Image</li>
        <li>Colors</li>
        <li>Help</li>
      </ul>
      <div className="paint-toolbar">
        <button type="button" onClick={clearCanvas}>Clear</button>
        <button type="button" onClick={save}>Save</button>
        <input value={saveAsName} onChange={(event) => setSaveAsName(event.target.value)} aria-label="Paint save name" />
      </div>
      <div className="paint-layout classic-paint-layout">
        <div className="paint-toolbox">
          {tools.map((item) => (
            <button
              key={item.id}
              type="button"
              className={tool === item.id ? 'active-tool' : ''}
              onClick={() => setTool(item.id)}
              title={item.label}
            >
              {item.label}
            </button>
          ))}
        </div>
        <div className="sunken-panel paint-canvas-wrap">
          <canvas
            ref={canvasRef}
            width={640}
            height={360}
            onPointerDown={begin}
            onPointerMove={draw}
            onPointerUp={end}
            onPointerCancel={end}
          />
        </div>
      </div>
      <div className="paint-palette">
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
      <div className="status-bar">
        <p className="status-bar-field">Tool: {tool}</p>
        <p className="status-bar-field">{saved ? `Saved as ${saveAsName}` : 'Unsaved bitmap'}</p>
      </div>
    </div>
  )
}
