import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import type { AppProps } from '../../types'
import { baseName, getNode, joinPath, parentPath } from '../../os/filesystem'
import { useOs } from '../../os/useOs'

type PaintTool = 'pencil' | 'brush' | 'eraser' | 'line' | 'rect' | 'ellipse' | 'fill' | 'text' | 'picker'

const colors = [
  '#000000', '#808080', '#800000', '#808000', '#008000', '#008080', '#000080', '#800080',
  '#ffffff', '#c0c0c0', '#ff0000', '#ffff00', '#00ff00', '#00ffff', '#0000ff', '#ff00ff',
]

const tools: Array<{ id: PaintTool; label: string; glyph: string }> = [
  { id: 'pencil', label: 'Pencil', glyph: '✎' },
  { id: 'brush', label: 'Brush', glyph: '〰' },
  { id: 'eraser', label: 'Eraser', glyph: '⌫' },
  { id: 'fill', label: 'Fill', glyph: '▣' },
  { id: 'picker', label: 'Pick', glyph: '⊙' },
  { id: 'text', label: 'Text', glyph: 'A' },
  { id: 'line', label: 'Line', glyph: '╲' },
  { id: 'rect', label: 'Rect', glyph: '▭' },
  { id: 'ellipse', label: 'Oval', glyph: '◯' },
]

const sizes = [1, 2, 3, 5, 8]

function point(event: ReactPointerEvent<HTMLCanvasElement>) {
  const rect = event.currentTarget.getBoundingClientRect()
  return {
    x: ((event.clientX - rect.left) / rect.width) * event.currentTarget.width,
    y: ((event.clientY - rect.top) / rect.height) * event.currentTarget.height,
  }
}

type PaintFormat = 'bmp' | 'png' | 'jpeg'

const FORMAT_EXT: Record<PaintFormat, string> = { bmp: 'bmp', png: 'png', jpeg: 'jpg' }

/** Force the save name to carry the chosen format's extension (media.bmp / media.png / media.jpg). */
function nameForFormat(name: string, format: PaintFormat): string {
  const stem = name.trim().replace(/\.[a-z0-9]+$/i, '') || 'media'
  return `${stem}.${FORMAT_EXT[format]}`
}

function formatForExtension(name: string): PaintFormat {
  const ext = (name.split('.').pop() ?? '').toLowerCase()
  if (ext === 'bmp') return 'bmp'
  if (ext === 'jpg' || ext === 'jpeg') return 'jpeg'
  return 'png'
}

/** Encode the canvas to an uncompressed 24-bit BMP data URL — Paint's native format on Win98. */
function canvasToBmpDataUrl(canvas: HTMLCanvasElement): string {
  const ctx = canvas.getContext('2d')
  if (!ctx) return canvas.toDataURL('image/png')
  const { width, height } = canvas
  const { data } = ctx.getImageData(0, 0, width, height)
  const rowSize = Math.floor((24 * width + 31) / 32) * 4
  const pixelArraySize = rowSize * height
  const fileSize = 54 + pixelArraySize
  const buffer = new ArrayBuffer(fileSize)
  const view = new DataView(buffer)
  view.setUint8(0, 0x42) // 'B'
  view.setUint8(1, 0x4d) // 'M'
  view.setUint32(2, fileSize, true)
  view.setUint32(10, 54, true) // pixel data offset
  view.setUint32(14, 40, true) // DIB header size
  view.setInt32(18, width, true)
  view.setInt32(22, height, true) // positive height = bottom-up rows
  view.setUint16(26, 1, true) // planes
  view.setUint16(28, 24, true) // bits per pixel
  view.setUint32(34, pixelArraySize, true)
  view.setInt32(38, 2835, true) // ~72 DPI
  view.setInt32(42, 2835, true)
  let offset = 54
  for (let y = height - 1; y >= 0; y -= 1) {
    for (let x = 0; x < width; x += 1) {
      const i = (y * width + x) * 4
      view.setUint8(offset, data[i + 2]) // B
      view.setUint8(offset + 1, data[i + 1]) // G
      view.setUint8(offset + 2, data[i]) // R
      offset += 3
    }
    for (let pad = width * 3; pad < rowSize; pad += 1) {
      view.setUint8(offset, 0)
      offset += 1
    }
  }
  const bytes = new Uint8Array(buffer)
  let binary = ''
  const chunk = 8192
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk))
  }
  return `data:image/bmp;base64,${btoa(binary)}`
}

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '')
  const full = clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean
  const n = parseInt(full, 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

function toHex(r: number, g: number, b: number): string {
  return `#${[r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')}`
}

/** Scanline-ish stack flood fill with a small tolerance so anti-aliased edges fill cleanly. */
function floodFill(ctx: CanvasRenderingContext2D, width: number, height: number, sx: number, sy: number, hex: string) {
  const xi = Math.max(0, Math.min(width - 1, Math.floor(sx)))
  const yi = Math.max(0, Math.min(height - 1, Math.floor(sy)))
  const img = ctx.getImageData(0, 0, width, height)
  const d = img.data
  const start = (yi * width + xi) * 4
  const tr = d[start], tg = d[start + 1], tb = d[start + 2], ta = d[start + 3]
  const [fr, fg, fb] = hexToRgb(hex)
  if (Math.abs(fr - tr) <= 2 && Math.abs(fg - tg) <= 2 && Math.abs(fb - tb) <= 2 && ta === 255) return
  const tol = 48
  const seen = new Uint8Array(width * height)
  const stack = [yi * width + xi]
  while (stack.length) {
    const p = stack.pop() as number
    if (seen[p]) continue
    seen[p] = 1
    const i = p * 4
    if (
      Math.abs(d[i] - tr) > tol ||
      Math.abs(d[i + 1] - tg) > tol ||
      Math.abs(d[i + 2] - tb) > tol ||
      Math.abs(d[i + 3] - ta) > tol
    ) {
      continue
    }
    d[i] = fr; d[i + 1] = fg; d[i + 2] = fb; d[i + 3] = 255
    const x = p % width
    const y = (p - x) / width
    if (x + 1 < width) stack.push(p + 1)
    if (x - 1 >= 0) stack.push(p - 1)
    if (y + 1 < height) stack.push(p + width)
    if (y - 1 >= 0) stack.push(p - width)
  }
  ctx.putImageData(img, 0, 0)
}

export function PaintApp({ windowId, payload }: AppProps) {
  const { state, fsOps, setWindowTitle, showMessageBox } = useOs()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const snapshotRef = useRef<ImageData | null>(null)
  const startPointRef = useRef<{ x: number; y: number } | null>(null)
  const drawingRef = useRef(false)
  const undoStackRef = useRef<ImageData[]>([])
  const redoStackRef = useRef<ImageData[]>([])
  const [color, setColor] = useState('#000000')
  const [tool, setTool] = useState<PaintTool>('pencil')
  const [size, setSize] = useState(2)
  const [fillShapes, setFillShapes] = useState(false)
  const [saved, setSaved] = useState(false)
  const [saveAsName, setSaveAsName] = useState('media.bmp')
  const [currentPath, setCurrentPath] = useState(payload?.filePath)
  const [format, setFormat] = useState<PaintFormat>('bmp')
  const [hist, setHist] = useState({ undo: 0, redo: 0 })
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
    undoStackRef.current = []
    redoStackRef.current = []
    setHist({ undo: 0, redo: 0 })
    setSaveAsName(file?.name ?? 'media.bmp')
    setFormat(file?.name ? formatForExtension(file.name) : 'bmp')
    setSaved(Boolean(file?.dataUrl))
  }, [file?.dataUrl, file?.name])

  function context2d() {
    return canvasRef.current?.getContext('2d') ?? null
  }

  function syncHist() {
    setHist({ undo: undoStackRef.current.length, redo: redoStackRef.current.length })
  }

  /** Snapshot the current canvas so the next mutation can be undone. */
  function pushUndo() {
    const ctx = context2d()
    const canvas = canvasRef.current
    if (!ctx || !canvas) return
    undoStackRef.current.push(ctx.getImageData(0, 0, canvas.width, canvas.height))
    if (undoStackRef.current.length > 24) undoStackRef.current.shift()
    redoStackRef.current = []
    syncHist()
  }

  function undo() {
    const ctx = context2d()
    const canvas = canvasRef.current
    if (!ctx || !canvas) return
    const previous = undoStackRef.current.pop()
    if (!previous) return
    redoStackRef.current.push(ctx.getImageData(0, 0, canvas.width, canvas.height))
    ctx.putImageData(previous, 0, 0)
    setSaved(false)
    syncHist()
  }

  function redo() {
    const ctx = context2d()
    const canvas = canvasRef.current
    if (!ctx || !canvas) return
    const next = redoStackRef.current.pop()
    if (!next) return
    undoStackRef.current.push(ctx.getImageData(0, 0, canvas.width, canvas.height))
    ctx.putImageData(next, 0, 0)
    setSaved(false)
    syncHist()
  }

  function strokeWidth(): number {
    if (tool === 'brush') return size * 3
    if (tool === 'eraser') return size * 5
    return size
  }

  function begin(event: ReactPointerEvent<HTMLCanvasElement>) {
    const context = context2d()
    const canvas = canvasRef.current
    if (!context || !canvas) return
    const p = point(event)

    if (tool === 'picker') {
      const d = context.getImageData(Math.floor(p.x), Math.floor(p.y), 1, 1).data
      setColor(toHex(d[0], d[1], d[2]))
      return
    }
    if (tool === 'fill') {
      pushUndo()
      floodFill(context, canvas.width, canvas.height, p.x, p.y, color)
      setSaved(false)
      return
    }
    if (tool === 'text') {
      const text = window.prompt('Text:', 'Portfolio 98')
      if (text) {
        pushUndo()
        context.fillStyle = color
        context.font = `${Math.max(12, size * 8)}px "Courier New", monospace`
        context.fillText(text, p.x, p.y)
        setSaved(false)
      }
      return
    }
    pushUndo()
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
    context.lineWidth = strokeWidth()
    context.lineCap = tool === 'brush' ? 'round' : 'square'
    context.lineJoin = 'round'

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
      context.stroke()
    } else if (tool === 'ellipse') {
      context.ellipse(x + width / 2, y + height / 2, width / 2, height / 2, 0, 0, Math.PI * 2)
      if (fillShapes) context.fill()
      context.stroke()
    } else {
      context.rect(x, y, width, height)
      if (fillShapes) context.fill()
      context.stroke()
    }
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
    pushUndo()
    context.fillStyle = '#ffffff'
    context.fillRect(0, 0, canvas.width, canvas.height)
    setSaved(false)
  }

  // Encode the canvas to match the target's extension (.bmp = Paint's native bitmap, .jpg, else .png),
  // write it, and adopt the path so subsequent saves go to the file we just wrote.
  function writeImage(target: string) {
    const canvas = canvasRef.current
    if (!canvas) return
    const enc = formatForExtension(target)
    const dataUrl =
      enc === 'bmp'
        ? canvasToBmpDataUrl(canvas)
        : enc === 'jpeg'
          ? canvas.toDataURL('image/jpeg', 0.92)
          : canvas.toDataURL('image/png')
    const error = fsOps.writeFile(target, { dataUrl })
    if (error) {
      showMessageBox({ title: 'Paint', message: error, icon: 'error', buttons: ['ok'] })
      return
    }
    const savedName = baseName(target)
    setCurrentPath(target)
    setSaveAsName(savedName)
    setFormat(formatForExtension(savedName))
    setWindowTitle(windowId, `${savedName} - Paint`)
    setSaved(true)
  }

  // Save overwrites the current file (or creates one from the name box if this is a new image).
  function save() {
    writeImage(currentPath ?? joinPath('C:\\My Pictures', nameForFormat(saveAsName, format)))
  }

  // Save As always writes the name box as a NEW file in the current folder and adopts it,
  // leaving the original untouched.
  function saveAs() {
    const folder = currentPath ? parentPath(currentPath) : 'C:\\My Pictures'
    writeImage(joinPath(folder, nameForFormat(saveAsName, format)))
  }

  const shapeToolActive = tool === 'rect' || tool === 'ellipse'

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
        <button type="button" onClick={undo} disabled={hist.undo === 0} title="Undo">
          ↶ Undo
        </button>
        <button type="button" onClick={redo} disabled={hist.redo === 0} title="Redo">
          ↷ Redo
        </button>
        <button type="button" onClick={clearCanvas}>Clear</button>
        <button type="button" onClick={save}>Save</button>
        <button type="button" onClick={saveAs}>Save As</button>
        <label className="paint-size">
          Size
          <select value={size} onChange={(event) => setSize(Number(event.target.value))} aria-label="Brush size">
            {sizes.map((value) => (
              <option key={value} value={value}>{value}px</option>
            ))}
          </select>
        </label>
        <label className={`paint-fill-toggle ${shapeToolActive ? '' : 'is-dim'}`}>
          <input type="checkbox" checked={fillShapes} onChange={(event) => setFillShapes(event.target.checked)} />
          Fill shape
        </label>
        <label className="paint-size">
          Type
          <select
            value={format}
            aria-label="Save format"
            onChange={(event) => {
              const next = event.target.value as PaintFormat
              setFormat(next)
              setSaveAsName((name) => nameForFormat(name, next))
            }}
          >
            <option value="bmp">BMP (paint)</option>
            <option value="png">PNG (picture)</option>
            <option value="jpeg">JPEG</option>
          </select>
        </label>
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
              <span aria-hidden="true">{item.glyph}</span>
              <span className="paint-tool-label">{item.label}</span>
            </button>
          ))}
        </div>
        <div className="sunken-panel paint-canvas-wrap">
          <canvas
            ref={canvasRef}
            width={640}
            height={360}
            className={`paint-canvas tool-${tool}`}
            onPointerDown={begin}
            onPointerMove={draw}
            onPointerUp={end}
            onPointerCancel={end}
          />
        </div>
      </div>
      <div className="paint-palette">
        <label className="paint-custom-color" title="Custom color">
          <input type="color" value={color} onChange={(event) => setColor(event.target.value)} aria-label="Custom color" />
        </label>
        <span className="paint-current-color" style={{ backgroundColor: color }} aria-label={`Current color ${color}`} />
        {colors.map((swatch) => (
          <button
            key={swatch}
            type="button"
            className={color.toLowerCase() === swatch ? 'selected-color' : ''}
            style={{ backgroundColor: swatch }}
            aria-label={swatch}
            onClick={() => setColor(swatch)}
          />
        ))}
      </div>
      <div className="status-bar">
        <p className="status-bar-field">Tool: {tools.find((t) => t.id === tool)?.label ?? tool}</p>
        <p className="status-bar-field">{color} · {size}px</p>
        <p className="status-bar-field">{saved ? `Saved as ${saveAsName}` : 'Unsaved bitmap'}</p>
      </div>
    </div>
  )
}
